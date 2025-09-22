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

// GET /api/videos - List videos
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const videoAPI = new VideoAPI(env);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;

    const videos = await videoAPI.listVideos(page, limit, status);
    
    return NextResponse.json(videos, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// POST /api/videos - Upload video
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
