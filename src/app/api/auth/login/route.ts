import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST /api/auth/login - Authenticate user
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };
    
    // Simple hardcoded credentials for POC - in production, use proper user management
    const validCredentials = {
      username: 'admin',
      password: 'specialist-tv-2024'
    };
    
    if (username === validCredentials.username && password === validCredentials.password) {
      // Generate a simple JWT-like token (in production, use proper JWT library)
      const payload = {
        username,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const token = btoa(JSON.stringify(payload));
      
      return NextResponse.json({ token }, { headers: corsHeaders });
    } else {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
