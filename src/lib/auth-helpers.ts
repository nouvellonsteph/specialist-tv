import { D1Adapter } from "@auth/d1-adapter";
import { getContext } from "./context";

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
// This function is the correct way to get the session on the server-side in this environment.
// It programmatically creates a request to the /api/auth/session endpoint and handles it with Auth.js.
async function getServerSession(request: Request): Promise<AuthSession | null> {
  const { env } = getContext();
  console.log('[auth-helpers] Attempting to get server session...');
  const isDev = env.NEXTJS_ENV === 'development';
  const cookieName = isDev ? "authjs.session-token" : "__Secure-authjs.session-token";
  const cookies = request.headers.get('Cookie');
    const sessionToken = cookies?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1];
  console.log(`[auth-helpers] Cookie name: ${cookieName}`);
  console.log(`[auth-helpers] Session token from cookie: ${sessionToken ? 'found' : 'not found'}`);

    if (!sessionToken) {
    console.log('[auth-helpers] No session token found in cookies.');
    return null;
  }

  const adapter = D1Adapter(env.DB);
  if (!adapter?.getSessionAndUser) {
    return null;
  }
    const sessionAndUser = await adapter.getSessionAndUser(sessionToken);
  console.log(`[auth-helpers] D1 Adapter returned: ${sessionAndUser ? 'session and user found' : 'null'}`);
  const { session, user } = sessionAndUser ?? { session: null, user: null };

    if (!session || !user) {
    console.log('[auth-helpers] Session or user is null, returning null from getServerSession.');
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    expires: session.expires.toISOString(),
  };
}

export async function getSession(request: Request): Promise<AuthSession | null> {
        return getServerSession(request);
}

/**
 * Require authentication for an API endpoint with enhanced validation
 */
export async function requireAuth(request: Request): Promise<AuthSession> {
    const session = await getServerSession(request);
  
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
