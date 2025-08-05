// Custom Worker for Knowledge Management POC with OpenNext integration
//@ts-expect-error; build doesn't exist yet
import { default as handler } from '../.open-next/worker.js'; // Temporarily commented out for dev
import { CloudflareEnv, ProcessingJob } from './types';
import { VideoAPI } from './api/videos';
import { handleCloudflareAccessLogin, handleCloudflareAccessCallback } from './cloudflare-access-handlers';
import { AIProcessor } from './services/ai-processor';
import { YouTubeProcessor } from './services/youtube-processor';
import { 
  handleGenerateChaptersManually,
  handleGenerateTagsManually,
  handleGenerateAbstractManually,
  handleGenerateTitleManually,
  handleGenerateTranscriptManually,
  handleVectorizeTranscriptManually,
  handleGetEmbeddingStats 
} from './worker-handlers';
import { handleVectorSearch, handleVectorStats } from './vector-handlers';
import { handleVideoProcessing } from './queue/video-processor';
import { verifyWebhookSignature } from './utils/webhook';
import { requireAuth } from './utils/auth';
import { 
  handleGetVideoComments, 
  handleCreateComment, 
  handleUpdateComment, 
  handleDeleteComment 
} from './handlers/comment-handlers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper function to check authentication for protected endpoints
function requireAuthForEndpoint(request: Request): void {
  try {
    requireAuth(request);
  } catch {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}



const worker = {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Handle API routes with our custom logic
      if (path.startsWith('/api/')) {
        const videoAPI = new VideoAPI(env);
        const aiProcessor = new AIProcessor(env);
        let response: Response;

        switch (true) {
          // Upload video
          case path === '/api/videos/upload' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleVideoUpload(request, videoAPI);
            break;

          // Get video by ID
          case path.match(/^\/api\/videos\/([^\/]+)$/) && request.method === 'GET':
            const videoId = path.split('/')[3];
            response = await handleGetVideo(videoId, videoAPI);
            break;

          // Update video by ID
          case path.match(/^\/api\/videos\/([^\/]+)$/) && request.method === 'PUT':
            requireAuthForEndpoint(request);
            const updateVideoId = path.split('/')[3];
            response = await handleUpdateVideo(request, updateVideoId, videoAPI);
            break;

          // Delete video by ID
          case path.match(/^\/api\/videos\/([^\/]+)$/) && request.method === 'DELETE':
            requireAuthForEndpoint(request);
            const deleteVideoId = path.split('/')[3];
            response = await handleDeleteVideo(deleteVideoId, videoAPI);
            break;

          // List videos
          case path === '/api/videos' && request.method === 'GET':
            response = await handleListVideos(url, videoAPI);
            break;



          // Authentication endpoints
          case path === '/api/auth/login' && request.method === 'POST':
            response = await handleLogin(request, env);
            break;
            
          case path === '/api/auth/verify' && request.method === 'POST':
            response = await handleVerifyToken(request);
            break;
            
          case path === '/api/auth/cloudflare-access' && request.method === 'GET':
            response = await handleCloudflareAccessLogin(request, env);
            break;
            
          case path === '/api/auth/cloudflare-access/callback' && request.method === 'GET':
            response = await handleCloudflareAccessCallback(request, env);
            break;

          // YouTube processing endpoints
          case path === '/api/youtube/info' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleYouTubeInfo(request, env);
            break;
            
          case path === '/api/youtube/download' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleYouTubeDownload(request, env, videoAPI);
            break;

          // Vector search endpoints
          case path === '/api/vectors/search' && request.method === 'GET':
            response = await handleVectorSearch(url, videoAPI);
            break;
            
          case path === '/api/vectors/stats' && request.method === 'GET':
            response = await handleVectorStats(videoAPI);
            break;
            
          // Rebuild search index
          case path === '/api/search/rebuild' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleRebuildSearchIndex(videoAPI);
            break;

          // Get related videos
          case path.match(/^\/api\/videos\/([^\/]+)\/related$/) && request.method === 'GET':
            const relatedVideoId = path.split('/')[3];
            response = await handleGetRelatedVideos(relatedVideoId, videoAPI);
            break;

          // Get video chapters
          case path.match(/^\/api\/videos\/([^\/]+)\/chapters$/) && request.method === 'GET':
            const chaptersVideoId = path.split('/')[3];
            response = await handleGetVideoChapters(chaptersVideoId, videoAPI);
            break;

          // Get video transcript
          case path.match(/^\/api\/videos\/([^\/]+)\/transcript$/) && request.method === 'GET':
            const transcriptVideoId = path.split('/')[3];
            response = await handleGetVideoTranscript(transcriptVideoId, videoAPI);
            break;

          // Get video VTT content
          case path.match(/^\/api\/videos\/([^\/]+)\/vtt$/) && request.method === 'GET':
            const vttVideoId = path.split('/')[3];
            response = await handleGetVideoVTT(vttVideoId, videoAPI);
            break;

          // Get video tags
          case path.match(/^\/api\/videos\/([^\/]+)\/tags$/) && request.method === 'GET':
            const tagsVideoId = path.split('/')[3];
            response = await handleGetVideoTags(tagsVideoId, videoAPI);
            break;

          // Video chat
          case path === '/api/videos/chat' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleVideoChat(request, env);
            break;

          // Manual AI Processing Actions
          case path.match(/^\/api\/videos\/([^\/]+)\/generate-chapters$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualChaptersVideoId = path.split('/')[3];
            response = await handleGenerateChaptersManually(manualChaptersVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/generate-tags$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualTagsVideoId = path.split('/')[3];
            response = await handleGenerateTagsManually(manualTagsVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/generate-abstract$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualAbstractVideoId = path.split('/')[3];
            response = await handleGenerateAbstractManually(manualAbstractVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/generate-title$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualTitleVideoId = path.split('/')[3];
            response = await handleGenerateTitleManually(manualTitleVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/generate-transcript$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualTranscriptVideoId = path.split('/')[3];
            response = await handleGenerateTranscriptManually(manualTranscriptVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/vectorize$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const manualVectorizeVideoId = path.split('/')[3];
            response = await handleVectorizeTranscriptManually(manualVectorizeVideoId, videoAPI);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/embedding-stats$/) && request.method === 'GET':
            const embeddingStatsVideoId = path.split('/')[3];
            response = await handleGetEmbeddingStats(embeddingStatsVideoId, videoAPI);
            break;

          // Generate thumbnail
          case path.match(/^\/api\/videos\/([^\/]+)\/thumbnail$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const thumbnailVideoId = path.split('/')[3];
            response = await handleGenerateThumbnail(request, thumbnailVideoId, aiProcessor);
            break;

          // Get video logs
          case path.match(/^\/api\/videos\/([^\/]+)\/logs$/) && request.method === 'GET':
            const logsVideoId = path.split('/')[3];
            response = await handleGetVideoLogs(logsVideoId, url, videoAPI);
            break;

          // Get recent logs
          case path === '/api/logs' && request.method === 'GET':
            response = await handleGetRecentLogs(url, videoAPI);
            break;

          // Get logs by level
          case path === '/api/logs/level' && request.method === 'GET':
            response = await handleGetLogsByLevel(url, videoAPI);
            break;

          // Sync video status
          case path === '/api/videos/sync' && request.method === 'POST':
            requireAuthForEndpoint(request);
            response = await handleSyncVideoStatus(videoAPI);
            break;

          // Comments endpoints
          case path.match(/^\/api\/videos\/([^\/]+)\/comments$/) && request.method === 'GET':
            const getCommentsVideoId = path.split('/')[3];
            response = await handleGetVideoComments(getCommentsVideoId, env);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/comments$/) && request.method === 'POST':
            requireAuthForEndpoint(request);
            const postCommentsVideoId = path.split('/')[3];
            response = await handleCreateComment(request, postCommentsVideoId, env);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/comments\/([^\/]+)$/) && request.method === 'PUT':
            requireAuthForEndpoint(request);
            const updateCommentVideoId = path.split('/')[3];
            const updateCommentId = path.split('/')[5];
            response = await handleUpdateComment(request, updateCommentVideoId, updateCommentId, env);
            break;

          case path.match(/^\/api\/videos\/([^\/]+)\/comments\/([^\/]+)$/) && request.method === 'DELETE':
            requireAuthForEndpoint(request);
            const deleteCommentVideoId = path.split('/')[3];
            const deleteCommentId = path.split('/')[5];
            response = await handleDeleteComment(request, deleteCommentVideoId, deleteCommentId, env);
            break;

          default:
            response = new Response('API Not Found', { status: 404 });
        }

        // Add CORS headers to all API responses
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // Handle Stream webhook
      if (path === '/stream/webhook' && request.method === 'POST') {
        const response = await handleStreamWebhook(request, env);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // For all other routes, delegate to OpenNext handler (Next.js app)
      return await handler.fetch(request, env, ctx);

    } catch (error) {
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

// YouTube processing handlers
async function handleYouTubeInfo(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    const { url } = await request.json() as { url: string };
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const youtubeProcessor = new YouTubeProcessor(env);
    
    if (!youtubeProcessor.isValidYouTubeUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract video ID from URL
    const videoId = youtubeProcessor.extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Could not extract video ID from URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const videoInfo = await youtubeProcessor.getVideoInfo(videoId);
    
    return new Response(JSON.stringify({
      success: true,
      videoInfo
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleYouTubeDownload(request: Request, env: CloudflareEnv, videoAPI: VideoAPI): Promise<Response> {
  try {
    const { url, format, title, description } = await request.json() as {
      url: string;
      format: { itag: number; quality: string; format: string; ext: string };
      title?: string;
      description?: string;
    };
    
    if (!url || !format) {
      return new Response(JSON.stringify({ error: 'URL and format are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const youtubeProcessor = new YouTubeProcessor(env);
    
    if (!youtubeProcessor.isValidYouTubeUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract video ID from URL
    const videoId = youtubeProcessor.extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Could not extract video ID from URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get video info first
    const videoInfo = await youtubeProcessor.getVideoInfo(videoId);
    
    // Download the video
    const downloadResult = await youtubeProcessor.downloadVideo(url, format);
    
    if (!downloadResult.success || !downloadResult.videoBuffer) {
      return new Response(JSON.stringify({ error: downloadResult.error || 'Download failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create a File object from the buffer
    const videoFile = new File(
      [downloadResult.videoBuffer], 
      downloadResult.filename || `youtube_${videoInfo.videoId}.${format.ext}`,
      { type: `video/${format.ext}` }
    );

    // Upload to Cloudflare Stream using existing VideoAPI
    const uploadResult = await videoAPI.uploadVideo(
      videoFile,
      title || videoInfo.title,
      description || videoInfo.description,
      'youtube-downloader'
    );

    return new Response(JSON.stringify({
      success: true,
      video: uploadResult,
      originalVideoInfo: videoInfo
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export default worker;

// Authentication handlers
async function handleLogin(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    const { username, password } = await request.json() as { username: string; password: string };
    
    // Simple hardcoded credentials for POC - in production, use proper user management
    const validCredentials = {
      username: env.ADMIN_USERNAME || 'admin',
      password: env.ADMIN_PASSWORD || 'specialist-tv-2024'
    };
    
    if (username === validCredentials.username && password === validCredentials.password) {
      // Generate a simple JWT-like token (in production, use proper JWT library)
      const payload = {
        username,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const token = btoa(JSON.stringify(payload));
      
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'Login failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleVerifyToken(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const payload = JSON.parse(atob(token)) as { username: string; exp: number };
      
      // Check if token is expired
      if (Date.now() > payload.exp) {
        return new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ valid: true, username: payload.username }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return new Response(JSON.stringify({ message: 'Verification failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle video upload
async function handleVideoUpload(request: Request, videoAPI: VideoAPI): Promise<Response> {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file = formData.get('video') as File;

    if (!title || !file) {
      return new Response(JSON.stringify({ error: 'Title and video file are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await videoAPI.uploadVideo(file, title, description);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video
async function handleGetVideo(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const video = await videoAPI.getVideo(videoId);
    
    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(video), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle update video
async function handleUpdateVideo(request: Request, videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const body = await request.json() as { title?: string; description?: string };
    
    if (!body.title && !body.description) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await videoAPI.updateVideo(videoId, body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message }), {
        status: result.message === 'Video not found' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: result.message,
      video: result.video 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle delete video
async function handleDeleteVideo(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const result = await videoAPI.deleteVideo(videoId);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message }), {
        status: result.message === 'Video not found' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: result.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle list videos
async function handleListVideos(url: URL, videoAPI: VideoAPI): Promise<Response> {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || undefined;

    const videos = await videoAPI.listVideos(page, limit, status);
    
    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}



// Handle get related videos
async function handleGetRelatedVideos(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const limit = 5;
    const relatedVideos = await videoAPI.getRelatedVideos(videoId, limit);
    
    return new Response(JSON.stringify(relatedVideos), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video chapters
async function handleGetVideoChapters(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const chapters = await videoAPI.getVideoChapters(videoId);
    
    return new Response(JSON.stringify(chapters), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video transcript
async function handleGetVideoTranscript(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const transcript = await videoAPI.getVideoTranscript(videoId);
    
    if (!transcript) {
      return new Response(JSON.stringify({ error: 'Transcript not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(transcript), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle rebuild search index
async function handleRebuildSearchIndex(videoAPI: VideoAPI): Promise<Response> {
  try {
    await videoAPI.rebuildSearchIndexManually();
    
    return new Response(JSON.stringify({ message: 'Search index rebuilt successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video VTT content
async function handleGetVideoVTT(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const vttContent = await videoAPI.getVideoVTT(videoId);
    
    if (!vttContent) {
      return new Response(JSON.stringify({ error: 'VTT content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ content: vttContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video tags
async function handleGetVideoTags(videoId: string, videoAPI: VideoAPI): Promise<Response> {
  try {
    const tags = await videoAPI.getVideoTagsPublic(videoId);
    
    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle generate thumbnail
async function handleGenerateThumbnail(request: Request, videoId: string, aiProcessor: AIProcessor): Promise<Response> {
  try {
    const { prompt } = await request.json() as { prompt?: string };

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const thumbnailUrl = await aiProcessor.generateThumbnail(prompt, videoId);
    
    return new Response(JSON.stringify({ thumbnail_url: thumbnailUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle video chat
async function handleVideoChat(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    const { message, transcript, videoTitle, videoDescription } = await request.json() as {
      message: string;
      transcript: string;
      videoTitle: string;
      videoDescription?: string;
    };

    if (!message || !transcript) {
      return new Response(JSON.stringify({ error: 'Message and transcript are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a context-aware prompt for the AI
    const systemPrompt = `You are an AI assistant helping users understand video content. You have access to the full transcript of a video titled "${videoTitle}"${videoDescription ? ` with description: "${videoDescription}"` : ''}.

Transcript:
${transcript}

Please answer questions about this video based on the transcript content. Be helpful, accurate, and reference specific parts of the transcript when relevant. If asked about timestamps or specific moments, try to relate them to the content. Keep responses concise but informative.`;

    const userPrompt = `User question: ${message}`;

    // Use Cloudflare AI to generate response
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    });

    // Extract the response text
    const aiResponse = response.response || 'I apologize, but I couldn\'t generate a response. Please try asking your question again.';

    return new Response(JSON.stringify({ response: aiResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Video chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle Stream webhook
async function handleStreamWebhook(request: Request, env: CloudflareEnv): Promise<Response> {
  try {
    // Get request body as text for signature verification
    const requestBody = await request.text();
    
    // Verify webhook signature if configured
    if (env.WEBHOOK_SECRET) {
      const signature = request.headers.get('webhook-signature');
      if (!signature) {
        console.error('Missing webhook signature');
        return new Response('Missing signature', { status: 401 });
      }
      
      const isValid = await verifyWebhookSignature(requestBody, signature, env.WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
      
      console.log('✅ Webhook signature verified');
    }
    
    // Parse the webhook payload
    const webhook = JSON.parse(requestBody) as {
      uid?: string;
      readyToStream?: boolean;
      status?: {
        state?: 'pendingupload' | 'downloading' | 'queued' | 'inprogress' | 'ready' | 'error';
        pctComplete?: string;
        errorReasonCode?: string;
        errorReasonText?: string;
      };
      meta?: Record<string, unknown>;
      created?: string;
      modified?: string;
    };
    
    console.log('📨 Received Stream webhook:', JSON.stringify(webhook, null, 2));

    const streamId = webhook.uid;
    if (!streamId) {
      console.log('No stream ID in webhook, ignoring');
      return new Response('OK', { status: 200 });
    }

    // Find video by stream_id in our database
    const videoAPI = new VideoAPI(env);
    const video = await env.DB.prepare(`
      SELECT id FROM videos WHERE stream_id = ?
    `).bind(streamId).first() as { id: string } | null;

    if (!video) {
      console.log(`No video found for stream ID ${streamId}`);
      return new Response('OK', { status: 200 });
    }

    const videoId = video.id;
    console.log(`Found video ${videoId} for stream ${streamId}`);

    // Handle different webhook events based on actual Stream webhook format
    if (webhook.status?.state === 'ready' || webhook.readyToStream === true) {
      console.log(`Video ${videoId} is ready, starting processing pipeline`);
      
      // Update video status to ready first
      await videoAPI.syncVideoStatusFromStream(videoId);
      
      // Start processing pipeline
      await env.VIDEO_PROCESSING_QUEUE.send({
        video_id: videoId,
        stream_id: streamId,
        type: 'transcription',
        status: 'pending',
      });

      console.log(`Started processing pipeline for video ${videoId}`);
    } else {
      // For other webhook events, just sync the status
      console.log(`Syncing status for video ${videoId} due to webhook`);
      await videoAPI.syncVideoStatusFromStream(videoId);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

// Handle sync video status
async function handleSyncVideoStatus(videoAPI: VideoAPI): Promise<Response> {
  try {
    await videoAPI.syncAllProcessingVideos();
    return new Response(JSON.stringify({ message: 'Video status sync completed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get video logs
async function handleGetVideoLogs(videoId: string, url: URL, videoAPI: VideoAPI): Promise<Response> {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const logs = await videoAPI.getVideoLogs(videoId, limit);
    
    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get recent logs
async function handleGetRecentLogs(url: URL, videoAPI: VideoAPI): Promise<Response> {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const logs = await videoAPI.getRecentLogs(limit);
    
    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle get logs by level
async function handleGetLogsByLevel(url: URL, videoAPI: VideoAPI): Promise<Response> {
  try {
    const level = url.searchParams.get('level') as 'debug' | 'info' | 'warning' | 'error';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!level || !['debug', 'info', 'warning', 'error'].includes(level)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing level parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const logs = await videoAPI.getLogsByLevel(level, limit);
    
    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
