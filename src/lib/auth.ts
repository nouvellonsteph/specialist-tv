import { D1Adapter } from "@auth/d1-adapter";
import { AuthConfig } from "@auth/core/types";
import Google from "@auth/core/providers/google";

export function getAuthConfig(env: CloudflareEnv): AuthConfig {
  console.log('=== AUTH CONFIG DEBUG START ===');
  console.log('Environment variables check:');
  console.log('- AUTH_SECRET:', env.AUTH_SECRET ? '✓ SET' : '✗ MISSING');
  console.log('- GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID ? '✓ SET' : '✗ MISSING');
  console.log('- GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? '✓ SET' : '✗ MISSING');
  console.log('- DB:', env.DB ? '✓ AVAILABLE' : '✗ MISSING');
  console.log('- NEXTJS_ENV:', env.NEXTJS_ENV || 'undefined');
  
  const isDev = env.NEXTJS_ENV === 'development';
  console.log('Development mode:', isDev);
  
  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    basePath: "/api/auth",
    useSecureCookies: !isDev, // Force non-secure cookies in development
    // Use JWT strategy in development when DB is not available
    ...(env.DB ? { adapter: D1Adapter(env.DB) } : {}),
    providers: [
      Google({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: "openid email profile",
            access_type: "offline",
            prompt: "consent",
            response_type: "code",
          },
        },
        checks: ["pkce", "state"],
        client: {
          token_endpoint_auth_method: "client_secret_post",
        },
        profile(profile: {
          sub: string;
          name?: string;
          email?: string;
          picture?: string;
          email_verified?: boolean;
        }) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            emailVerified: profile.email_verified ? new Date() : null,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account, profile }) {
        // Initial sign in
        if (account && profile) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.provider = account.provider;
          token.oidc_sub = profile.sub;
          token.expiresAt = account.expires_at;
          
          // Store additional Google profile data
          if (account.provider === 'google') {
            token.googleProfile = {
              picture: profile.picture,
              email_verified: profile.email_verified,
              locale: profile.locale,
            };
          }
        }
        
        // Check if token needs refresh (for Google OAuth)
        if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
          return token;
        }
        
        // Token has expired, try to refresh it
        if (token.refreshToken && token.provider === 'google') {
          try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID!,
                client_secret: env.GOOGLE_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken as string,
              }),
            });
            
            if (response.ok) {
              const refreshedTokens = await response.json() as {
                access_token: string;
                expires_in: number;
                refresh_token?: string;
              };
              token.accessToken = refreshedTokens.access_token;
              token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in;
              if (refreshedTokens.refresh_token) {
                token.refreshToken = refreshedTokens.refresh_token;
              }
            }
          } catch (error) {
            console.error('Error refreshing access token:', error);
            // Return token as-is, will be handled by session callback
          }
        }
        
        return token;
      },
      async session({ session, token }) {
        // Send properties to the client
        return {
          ...session,
          accessToken: token.accessToken as string,
          provider: token.provider as string,
          oidc_sub: token.oidc_sub as string,
          googleProfile: token.googleProfile as {
            picture?: string;
            email_verified?: boolean;
            locale?: string;
          } | undefined,
          error: token.error as string | undefined,
        };
      },
      async signIn({ user, account }) {
        console.log('🔵 Auth.js signIn callback:', { user: user?.email, provider: account?.provider });
        // Allow sign in for Google and Cloudflare Access
        if (account?.provider === 'google') {
          return true;
        }
        return false;
      }
    },
    session: {
      strategy: env.DB ? "database" : "jwt",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      updateAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    debug: true, // Always enable debug for troubleshooting
    logger: {
      error(error: Error) {
        console.error('🔴 Auth.js ERROR:', error.message, error.stack);
      },
      warn(code: string) {
        console.warn('🟡 Auth.js WARN:', code);
      },
      debug(code: string, metadata?: unknown) {
        console.log('🔵 Auth.js DEBUG:', code, metadata);
      },
    },
    cookies: {
      sessionToken: {
        name: isDev ? "authjs.session-token" : "__Secure-authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          maxAge: 7 * 24 * 60 * 60, // 7 days
        },
      },
      callbackUrl: {
        name: isDev ? "authjs.callback-url" : "__Secure-authjs.callback-url",
        options: {
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          maxAge: 15 * 60, // 15 minutes
        },
      },
      csrfToken: {
        name: isDev ? "authjs.csrf-token" : "__Host-authjs.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          maxAge: 15 * 60, // 15 minutes
        },
      },
      state: {
        name: isDev ? "authjs.state" : "__Secure-authjs.state",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          maxAge: 15 * 60, // 15 minutes
        },
      },
      pkceCodeVerifier: {
        name: isDev ? "authjs.pkce.code_verifier" : "__Secure-authjs.pkce.code_verifier",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          maxAge: 15 * 60, // 15 minutes
        },
      },
    },
  };
}
