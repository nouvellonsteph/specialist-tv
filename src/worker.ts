// Simplified Worker for Queue Processing and OpenNext integration
import { default as handler } from '../.open-next/worker.js';
import { ProcessingJob } from './types';
import { handleVideoProcessing } from './queue/video-processor';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const worker = {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // All API routes are now handled by Next.js App Router
      // The worker only handles queue processing and delegates everything else to Next.js
      
      // Delegate all requests to OpenNext handler (Next.js app)
      return await handler.fetch(request, env, ctx);

    } catch (error) {
      // If the error is a Response object (e.g., from authentication), return it directly
      if (error instanceof Response) {
        return error;
      }
      
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  },

  // Queue consumer
  async queue(batch: MessageBatch<ProcessingJob>, env: CloudflareEnv): Promise<void> {
    await handleVideoProcessing(batch, env);
  }
}

export default worker;
