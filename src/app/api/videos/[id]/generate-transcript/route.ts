import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { VideoAPI } from '@/api/videos';
import { requireAuth } from '@/utils/auth';
import { handleGenerateTranscriptManually } from '@/worker-handlers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST /api/videos/[id]/generate-transcript - Generate transcript manually
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    requireAuth(request);
    
    const { env } = await getCloudflareContext();
    const videoAPI = new VideoAPI(env);
    
    const { id } = await params;
    
    const response = await handleGenerateTranscriptManually(id, videoAPI);
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
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
