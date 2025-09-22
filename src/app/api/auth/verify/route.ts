import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST /api/auth/verify - Verify token
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.substring(7);
    
    try {
      const payload = JSON.parse(atob(token)) as { username: string; exp: number };
      
      // Check if token is expired
      if (Date.now() > payload.exp) {
        return NextResponse.json(
          { message: 'Token expired' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      return NextResponse.json(
        { valid: true, username: payload.username },
        { headers: corsHeaders }
      );
    } catch {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { message: 'Verification failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
