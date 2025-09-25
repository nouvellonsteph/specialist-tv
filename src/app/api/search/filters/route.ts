import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { VideoAPI } from '@/api/videos';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// GET /api/search/filters - Get available filter options
export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const videoAPI = new VideoAPI(env);
    
    const [availableTags, availableCreators] = await Promise.all([
      videoAPI.getAvailableTags(),
      videoAPI.getAvailableCreators()
    ]);
    
    const response = NextResponse.json({
      tags: availableTags,
      creators: availableCreators
    });
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
