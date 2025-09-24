import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AIProcessor } from '@/services/ai-processor';
import { requireAuth, getUserFromSession } from '@/lib/auth-helpers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// POST /api/videos/[id]/thumbnail - Generate thumbnail
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext();
    
    // Check authentication
    const session = await requireAuth(request, env);
    const user = getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const aiProcessor = new AIProcessor(env);
    
    const { prompt } = await request.json() as { prompt?: string };

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { id } = await params;
    
    const thumbnailUrl = await aiProcessor.generateThumbnail(prompt, id);
    
    return NextResponse.json(
      { thumbnail_url: thumbnailUrl },
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
