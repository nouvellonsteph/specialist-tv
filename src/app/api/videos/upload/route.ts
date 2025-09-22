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

// POST /api/videos/upload - Upload video
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    requireAuth(request);
    
    const { env } = await getCloudflareContext();
    const videoAPI = new VideoAPI(env);
    
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file = formData.get('video') as File;

    if (!title || !file) {
      return NextResponse.json(
        { error: 'Title and video file are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await videoAPI.uploadVideo(file, title, description);
    
    return NextResponse.json(result, { headers: corsHeaders });
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
