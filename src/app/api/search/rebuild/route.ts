import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { VideoAPI } from '@/api/videos';
import { requireAuth } from '@/utils/auth';

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
    // Check authentication
    requireAuth(request);
    
    const { env } = await getCloudflareContext();
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
