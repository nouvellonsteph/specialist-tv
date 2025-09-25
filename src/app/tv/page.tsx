'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Video, VideoWithScore } from '../../types';
import { SearchBar } from '../../components/SearchBar';
import { SearchFilters, SearchFilters as SearchFiltersType } from '../../components/SearchFilters';
import { formatTime } from '../../utils/time';
import { formatViewCount, formatRelativeDate } from '../../utils/dateUtils';

function TVContent() {
  const searchParams = useSearchParams();

  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<VideoWithScore[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCreators, setAvailableCreators] = useState<string[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');

  const [initialUrlProcessed, setInitialUrlProcessed] = useState(false);

  // Debounced search to prevent flickering
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Search filters state
  const [filters, setFilters] = useState<SearchFiltersType>({
    tags: [],
    creators: [],
    dateRange: {},
    duration: {},
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  // Handle video selection by redirecting to slug-based URL
  const handleVideoSelect = useCallback((video: Video) => {
    router.push(`/tv/${video.id}`);
  }, [router]);

  // Enhanced search function with filters
  const performSearch = useCallback(async (query: string, searchFilters?: SearchFiltersType) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Build query parameters with filters
      const params = new URLSearchParams({
        q: query,
        limit: '20',
        minScore: '0.6',
        includeMetadata: 'true'
      });

      const activeFilters = searchFilters || filters;
      
      // Add filter parameters
      if (activeFilters.tags.length > 0) {
        params.set('tags', activeFilters.tags.join(','));
      }
      if (activeFilters.creators.length > 0) {
        params.set('creators', activeFilters.creators.join(','));
      }
      if (activeFilters.dateRange.start) {
        params.set('dateStart', activeFilters.dateRange.start);
      }
      if (activeFilters.dateRange.end) {
        params.set('dateEnd', activeFilters.dateRange.end);
      }
      if (activeFilters.duration.min) {
        params.set('durationMin', activeFilters.duration.min.toString());
      }
      if (activeFilters.duration.max) {
        params.set('durationMax', activeFilters.duration.max.toString());
      }
      if (activeFilters.status) {
        params.set('status', activeFilters.status);
      }
      if (activeFilters.sortBy) {
        params.set('sortBy', activeFilters.sortBy);
      }
      if (activeFilters.sortOrder) {
        params.set('sortOrder', activeFilters.sortOrder);
      }

      const response = await fetch(`/api/vectors/search?${params.toString()}`);
      
      if (response.ok) {
        const vectorResults = await response.json() as Array<{
          videoId: string;
          title: string;
          description: string;
          chunkIndex: number;
          content: string;
          score: number;
          metadata: {
            videoTitle: string;
            videoDescription: string;
            chunkStart: number;
            chunkEnd: number;
            tags: string;
          };
        }>;
        
        // Extract unique video IDs and their highest confidence scores
        const videoScoreMap = new Map<string, number>();
        const videoIds: string[] = [];
        
        vectorResults.forEach((result) => {
          if (result.videoId) {
            const currentScore = videoScoreMap.get(result.videoId);
            if (!currentScore || result.score > currentScore) {
              videoScoreMap.set(result.videoId, result.score);
            }
            if (!videoIds.includes(result.videoId)) {
              videoIds.push(result.videoId);
            }
          }
        });
        
        // Fetch full video details and add confidence scores
        if (videoIds.length > 0) {
          const videoDetailsPromises = videoIds.map(async (videoId) => {
            try {
              const videoResponse = await fetch(`/api/videos/${videoId}`);
              if (videoResponse.ok) {
                const video = await videoResponse.json() as Video;
                const confidence_score = videoScoreMap.get(videoId) || 0;
                return { ...video, confidence_score } as VideoWithScore;
              }
            } catch (error) {
              console.error(`Failed to fetch video ${videoId}:`, error);
            }
            return null;
          });
          
          const videoDetails = await Promise.all(videoDetailsPromises);
          const validVideos = videoDetails.filter((video): video is VideoWithScore => video !== null);
          
          // In TV mode, only show ready videos (unless status filter is applied)
          const readyVideos = activeFilters.status ? validVideos : validVideos.filter(video => video.status === 'ready');
          
          // Sort by confidence score (highest first) if relevance sorting
          if (activeFilters.sortBy === 'relevance') {
            readyVideos.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
          }
          
          setSearchResults(readyVideos);
        } else {
          setSearchResults([]);
        }
      } else {
        console.error('Search failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  // Handle URL parameters on mount
  const handleUrlParams = useCallback(async () => {
    if (initialUrlProcessed) return;
    
    const videoId = searchParams.get('video');
    const timestamp = searchParams.get('t');
    const query = searchParams.get('q');

    console.log('Processing TV URL params:', { videoId, timestamp, query });

    // Handle direct video links by redirecting to slug-based URL
    if (videoId) {
      const timestampParam = timestamp ? `?t=${timestamp}` : '';
      router.push(`/tv/${videoId}${timestampParam}`);
      return;
    }

    // Handle search query from URL
    if (query) {
      await performSearch(query);
    }
    
    setInitialUrlProcessed(true);
  }, [searchParams, initialUrlProcessed, performSearch, router]);

  // Update URL for search queries only
  const updateUrl = useCallback((params: { q?: string }) => {
    const url = new URL(window.location.href);
    
    // Clear search param first
    url.searchParams.delete('q');
    
    // Add search query if provided
    if (params.q) url.searchParams.set('q', params.q);
    
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Load videos from API
  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data: Video[] = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load available filter options
  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/search/filters');
      if (response.ok) {
        const data = await response.json() as { tags: string[]; creators: string[] };
        setAvailableTags(data.tags || []);
        setAvailableCreators(data.creators || []);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    setCurrentQuery(query);
    // Update URL with search query
    updateUrl({ q: query });
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      performSearch(query);
    }, 300);
    
    setSearchTimeout(timeout);
  }, [performSearch, searchTimeout, updateUrl]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    
    // If there's a current query, re-run search with new filters
    if (currentQuery.trim()) {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout for debounced search with filters
      const timeout = setTimeout(() => {
        performSearch(currentQuery, newFilters);
      }, 300);
      
      setSearchTimeout(timeout);
    }
  }, [currentQuery, performSearch, searchTimeout]);

  // Videos to display (search results or all videos)
  // In TV mode, only show ready videos
  const readyVideos = videos.filter(video => video.status === 'ready');
  const displayVideos = searchResults.length > 0 ? searchResults : readyVideos;

  useEffect(() => {
    loadVideos();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    handleUrlParams();
  }, [handleUrlParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TV Library: YouTube-like video grid */}
        <div className="space-y-6">
          <SearchBar onSearch={handleSearch} />
          
          {/* Show filters when there's a search query or filters are active */}
          {(currentQuery || searchResults.length > 0 || filters.tags.length > 0 || filters.creators.length > 0) && (
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableTags={availableTags}
              availableCreators={availableCreators}
            />
          )}
          
          <TVVideoGrid 
            videos={displayVideos} 
            loading={loading}
            onVideoSelect={handleVideoSelect}
            isSearching={isSearching}
          />
        </div>
      </div>
    </div>
  );
}

// TV Video Grid Component - YouTube-like video grid
function TVVideoGrid({ 
  videos, 
  loading, 
  onVideoSelect, 
  isSearching 
}: { 
  videos: (Video | VideoWithScore)[];
  loading: boolean;
  onVideoSelect: (video: Video) => void;
  isSearching: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📺</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isSearching ? 'No search results' : 'No videos available'}
        </h3>
        <p className="text-gray-600">
          {isSearching ? 'Try a different search term' : 'Videos will appear here once they are uploaded and processed'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => onVideoSelect(video)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Thumbnail */}
          <div className="aspect-video bg-gray-100 relative">
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            {/* Duration Badge */}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {formatTime(video.duration)}
              </div>
            )}
            {/* Confidence Score for Search Results */}
            {'confidence_score' in video && video.confidence_score && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                {Math.round(video.confidence_score * 100)}% match
              </div>
            )}
          </div>
          
          {/* Video Info */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
            {video.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
            )}
            
            {/* Metadata - Hide status in TV mode */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              {video.view_count !== undefined && video.view_count !== null && (
                <span className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{formatViewCount(video.view_count)} views</span>
                </span>
              )}
              <span>{formatRelativeDate(video.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TV...</p>
        </div>
      </div>
    }>
      <TVContent />
    </Suspense>
  );
}
