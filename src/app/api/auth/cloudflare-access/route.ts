import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { handleCloudflareAccessLogin } from '@/cloudflare-access-handlers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// GET /api/auth/cloudflare-access - Cloudflare Access login
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    return await handleCloudflareAccessLogin(request, env);
  } catch (error) {
    console.error('Cloudflare Access login error:', error);
    return NextResponse.json(
      { message: 'Login failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
