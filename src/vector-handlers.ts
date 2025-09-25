import { VideoAPI } from './api/videos';

// Handler functions for vector exploration endpoints
export async function handleVectorSearch(url: URL, videoAPI: VideoAPI): Promise<Response> {
  try {
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const minScore = parseFloat(url.searchParams.get('minScore') || '0.0');

    // Extract filter parameters
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const creators = url.searchParams.get('creators')?.split(',').filter(Boolean) || [];
    const dateStart = url.searchParams.get('dateStart');
    const dateEnd = url.searchParams.get('dateEnd');
    const durationMin = url.searchParams.get('durationMin') ? parseInt(url.searchParams.get('durationMin')!) : undefined;
    const durationMax = url.searchParams.get('durationMax') ? parseInt(url.searchParams.get('durationMax')!) : undefined;
    const status = url.searchParams.get('status') as 'ready' | 'processing' | 'error' | undefined;
    const sortBy = url.searchParams.get('sortBy') || 'relevance';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    if (!query) {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filters = {
      tags,
      creators,
      dateRange: {
        start: dateStart || undefined,
        end: dateEnd || undefined,
      },
      duration: {
        min: durationMin,
        max: durationMax,
      },
      status,
      sortBy: sortBy as 'relevance' | 'date' | 'duration' | 'views' | 'title',
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const results = await videoAPI.performAdvancedVectorSearch(query, limit, minScore, filters);
    
    return new Response(JSON.stringify(results), {
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

export async function handleVectorStats(videoAPI: VideoAPI): Promise<Response> {
  try {
    const stats = await videoAPI.getVectorDatabaseStats();
    
    return new Response(JSON.stringify(stats), {
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
