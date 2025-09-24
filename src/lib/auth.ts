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
    adapter: D1Adapter(env.DB),
    providers: [
      Google({
        allowDangerousEmailAccountLinking: true,
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
      async session({ session, user }) {
        // The user object is passed when using database sessions.
        // We can add the user ID to the session for use in API routes.
        if (user) {
          session.user.id = user.id;
        }
        return session;
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
      strategy: "database",
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
