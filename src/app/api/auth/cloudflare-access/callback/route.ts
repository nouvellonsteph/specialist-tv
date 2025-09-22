import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { handleCloudflareAccessCallback } from '@/cloudflare-access-handlers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// GET /api/auth/cloudflare-access/callback - Cloudflare Access callback
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    return await handleCloudflareAccessCallback(request, env);
  } catch (error) {
    console.error('Cloudflare Access callback error:', error);
    return NextResponse.json(
      { message: 'Callback failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
