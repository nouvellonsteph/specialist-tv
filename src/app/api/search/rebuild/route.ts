import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { VideoAPI } from '@/api/videos';
import { requireAuth, getUserFromSession } from '@/lib/auth-helpers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST /api/search/rebuild - Rebuild search index
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    
    // Check authentication
    const session = await requireAuth(request, env);
    const user = getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const videoAPI = new VideoAPI(env);
    
    await videoAPI.rebuildSearchIndexManually();
    
    return NextResponse.json(
      { message: 'Search index rebuilt successfully' },
      { headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
