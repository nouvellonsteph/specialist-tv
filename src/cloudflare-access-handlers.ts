// OIDC Authentication handlers for Cloudflare Access SaaS app
import { CloudflareEnv } from './types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Generate a secure random state parameter
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function handleCloudflareAccessLogin(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    // Validate OIDC configuration
    if (!env.OIDC_CLIENT_ID || !env.OIDC_ISSUER || !env.OIDC_REDIRECT_URI) {
      console.error('Missing OIDC configuration:', {
        clientId: !!env.OIDC_CLIENT_ID,
        issuer: !!env.OIDC_ISSUER,
        redirectUri: !!env.OIDC_REDIRECT_URI
      });
      return new Response(JSON.stringify({ 
        message: 'OIDC not configured. Please set OIDC_CLIENT_ID, OIDC_ISSUER, and OIDC_REDIRECT_URI in your environment variables.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE verifier and state (in production, use KV or session storage)
    // For now, we'll encode it in the state parameter
    const stateData = {
      state,
      codeVerifier,
      timestamp: Date.now()
    };
    const encodedState = btoa(JSON.stringify(stateData));

    // Build authorization URL for Cloudflare Access
    // The OIDC_ISSUER should be the full issuer URL from Cloudflare Access
    // Format: https://{team}.cloudflareaccess.com/cdn-cgi/access/sso/oidc/{client_id}
    const authUrl = new URL(`${env.OIDC_ISSUER}/authorization`);
    authUrl.searchParams.set('client_id', env.OIDC_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('redirect_uri', env.OIDC_REDIRECT_URI);
    authUrl.searchParams.set('state', encodedState);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Redirecting to OIDC provider:', authUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl.toString(),
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('OIDC login error:', error);
    return new Response(JSON.stringify({ message: 'Authentication failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function handleCloudflareAccessCallback(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error, url.searchParams.get('error_description'));
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/creator?error=oauth_error',
          ...corsHeaders
        }
      });
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/creator?error=invalid_callback',
          ...corsHeaders
        }
      });
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
      // Validate state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch (error) {
      console.error('Invalid state parameter:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/creator?error=invalid_state',
          ...corsHeaders
        }
      });
    }

    // Exchange code for tokens
    // The OIDC_ISSUER should be the full issuer URL from Cloudflare Access
    const tokenResponse = await fetch(`${env.OIDC_ISSUER}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${env.OIDC_CLIENT_ID}:${env.OIDC_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: env.OIDC_REDIRECT_URI!,
        code_verifier: stateData.codeVerifier
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/creator?error=token_exchange_failed',
          ...corsHeaders
        }
      });
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      id_token: string;
      token_type: string;
      expires_in: number;
    };

    // Decode ID token to get user info (in production, verify signature)
    const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
    
    // Extract user information
    const userEmail = idTokenPayload.email || idTokenPayload.sub || 'unknown';
    const userName = idTokenPayload.name || idTokenPayload.preferred_username || userEmail.split('@')[0];
    
    console.log('User authenticated:', { email: userEmail, name: userName });
    
    // Generate our application token
    const appToken = {
      username: userName,
      email: userEmail,
      provider: 'cloudflare-access',
      oidc_sub: idTokenPayload.sub,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    const token = btoa(JSON.stringify(appToken));
    
    // Redirect to the application with the token
    const redirectUrl = new URL(url.origin);
    redirectUrl.pathname = '/creator';
    redirectUrl.searchParams.set('token', token);
    
    // Force HTTP for localhost development
    if (redirectUrl.hostname === 'localhost' || redirectUrl.hostname === '127.0.0.1') {
      redirectUrl.protocol = 'http:';
    }
    
    // Only use Secure flag for HTTPS (not localhost development)
    const isSecure = redirectUrl.protocol === 'https:';
    const cookieFlags = `Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${isSecure ? '; Secure' : ''}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Set-Cookie': `auth-token=${token}; ${cookieFlags}`,
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('OIDC callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/creator?error=callback_failed',
        ...corsHeaders
      }
    });
  }
}
