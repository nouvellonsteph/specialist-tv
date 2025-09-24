import { Auth } from "@auth/core"
import { getAuthConfig } from "./auth"
import { CloudflareEnv } from "../types"

export interface AuthSession {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    emailVerified?: Date | null
  }
  accessToken?: string
  provider?: string
  oidc_sub?: string
  googleProfile?: {
    picture?: string
    email_verified?: boolean
    locale?: string
  }
  error?: string
  expires: string
}


/**
 * Get the current session from a request with enhanced error handling
 */
export async function getSession(request: Request, env: CloudflareEnv): Promise<AuthSession | null> {
  try {
    console.log('=== SESSION VALIDATION DEBUG START ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    
    const cookies = request.headers.get('Cookie');
    console.log('Request cookies:', cookies || 'NO COOKIES');
    
    // Parse cookies to check for session token
    if (cookies) {
      const sessionTokenMatch = cookies.match(/authjs\.session-token=([^;]+)/);
      console.log('Session token found:', sessionTokenMatch ? 'YES' : 'NO');
      if (sessionTokenMatch) {
        console.log('Session token value:', sessionTokenMatch[1].substring(0, 20) + '...');
      }
    }
    
    const authConfig = getAuthConfig(env, env.DB)
    
    // Create a session request to validate authentication
    const url = new URL(request.url);
    const sessionUrl = new URL('/api/auth/session', url.origin);
    console.log('Session validation URL:', sessionUrl.toString());
    
    const sessionRequest = new Request(sessionUrl.toString(), {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
        'User-Agent': request.headers.get('User-Agent') || 'Specialist-TV-Auth',
      },
    });
    
    console.log('Calling Auth.js with session request...');
    
    // Use Auth.js to validate session
    const response = await Auth(sessionRequest, authConfig)
    
    console.log('Auth.js session response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      const text = await response.text()
      
      console.log('Auth.js session text length:', text?.length || 0);
      console.log('Auth.js session text preview:', text ? text.substring(0, 200) : 'empty');
      
      // Handle empty response
      if (!text || text.trim() === '' || text === 'null') {
        console.log('❌ Empty or null session response from Auth.js - session likely expired or invalid');
        return null
      }
      
      try {
        const session = JSON.parse(text) as AuthSession
        console.log('✅ Parsed session successfully:', {
          hasUser: !!session.user,
          userId: session.user?.id,
          userEmail: session.user?.email,
          provider: session.provider,
          expires: session.expires
        });
        
        // Check for authentication errors
        if (session && session.error) {
          console.warn('❌ Session contains error:', session.error)
          return null
        }
        
        // Validate session has required user data
        if (session && session.user && session.user.id && session.user.email) {
          console.log('✅ Session validation successful');
          return session
        } else {
          console.log('❌ Session missing required user data');
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse session response:', parseError)
        return null
      }
    } else {
      console.warn('❌ Session request failed:', response.status, response.statusText)
      
      // Try to get error details
      try {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
      } catch {
        console.log('Could not read error response body');
      }
    }
    
    console.log('=== SESSION VALIDATION DEBUG END ===');
    return null
  } catch (error) {
    console.error('❌ Error getting session:', error)
    return null
  }
}

/**
 * Require authentication for an API endpoint with enhanced validation
 */
export async function requireAuth(request: Request, env: CloudflareEnv): Promise<AuthSession> {
  const session = await getSession(request, env)
  
  if (!session?.user) {
    throw new Response(JSON.stringify({ 
      error: 'Authentication required',
      message: 'Please sign in to access this resource'
    }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="Specialist TV"'
      }
    })
  }
  
  // Additional validation for session integrity
  if (!session.user.id || !session.user.email) {
    throw new Response(JSON.stringify({ 
      error: 'Invalid session',
      message: 'Session is missing required user information'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return session
}

/**
 * Get user info from session with enhanced data extraction
 */
export function getUserFromSession(session: AuthSession | null): { 
  id: string; 
  email: string; 
  name: string;
  provider?: string;
  image?: string;
  emailVerified?: boolean;
} | null {
  if (!session?.user) {
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email || 'unknown',
    name: session.user.name || session.user.email?.split('@')[0] || 'unknown',
    provider: session.provider,
    image: session.user.image || undefined,
    emailVerified: session.user.emailVerified ? true : false,
  }
}

/**
 * Check if user has Google OAuth access for enhanced features
 */
export function hasGoogleAccess(session: AuthSession | null): boolean {
  return session?.provider === 'google' && !!session.accessToken
}

/**
 * Get Google profile information if available
 */
export function getGoogleProfile(session: AuthSession | null): {
  picture?: string;
  emailVerified?: boolean;
  locale?: string;
} | null {
  if (session?.provider === 'google' && session.googleProfile) {
    return session.googleProfile
  }
  return null
}

/**
 * Validate session expiration and refresh if needed
 */
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) return false
  
  const expiresAt = new Date(session.expires)
  const now = new Date()
  
  // Check if session expires within the next 5 minutes
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
  
  return expiresAt > fiveMinutesFromNow
}
