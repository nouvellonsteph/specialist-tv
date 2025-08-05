'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { VideoUpload } from '../../components/VideoUpload';
import VideoLibrary from '../../components/VideoLibrary';
import { SearchBar } from '../../components/SearchBar';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

import { Video, VideoWithScore } from '../../types';

function CreatorContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<VideoWithScore[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialUrlProcessed, setInitialUrlProcessed] = useState(false);

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

  // Search function
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      // Update URL to remove search query
      updateUrl({});
      return;
    }

    setIsSearching(true);
    
    // Update URL with search query
    updateUrl({ q: query });

    try {
      // Use GET request with query parameters like the TV page
      const response = await fetch(`/api/vectors/search?q=${encodeURIComponent(query)}&limit=20&minScore=0.3&includeMetadata=true`);
      
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
                const videoWithScore: VideoWithScore = {
                  ...video,
                  confidence_score: videoScoreMap.get(videoId) || 0
                };
                return videoWithScore;
              }
              return null;
            } catch (error) {
              console.error(`Failed to fetch video ${videoId}:`, error);
              return null;
            }
          });
          
          const videos = await Promise.all(videoDetailsPromises);
          const validVideos = videos.filter((video): video is VideoWithScore => video !== null);
          setSearchResults(validVideos);
        } else {
          setSearchResults([]);
        }
      } else {
        console.error('Vector search failed:', response.status, response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [updateUrl]);

  // Process URL parameters once when component mounts and data is available
  const processUrlParams = useCallback(async () => {
    const query = searchParams.get('q');

    // Handle search query from URL
    if (query) {
      await handleSearch(query);
    }
  }, [searchParams, handleSearch]);

  const loadVideos = useCallback(async () => {
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
  }, []);

  // Periodic sync for processing videos
  const performPeriodicSync = useCallback(async () => {
    if (!token) return;
    
    try {
      // Check if there are any processing videos
      const processingVideos = videos.filter(video => video.status === 'processing');
      if (processingVideos.length === 0) return;
      
      console.log(`Performing periodic sync for ${processingVideos.length} processing videos`);
      
      const response = await fetch('/api/videos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        console.log('Periodic sync completed successfully');
        // Reload videos to get updated status
        await loadVideos();
      }
    } catch (error) {
      console.error('Periodic sync error:', error);
    }
  }, [token, videos, loadVideos]);

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Set up periodic sync every 2 minutes for processing videos
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(performPeriodicSync, 2 * 60 * 1000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [performPeriodicSync, token]);

  // Handle URL params when data is available and not yet processed
  useEffect(() => {
    if (!initialUrlProcessed && (videos.length > 0 || searchResults.length > 0)) {
      processUrlParams().then(() => {
        setInitialUrlProcessed(true);
      });
    }
  }, [videos, searchResults, initialUrlProcessed, processUrlParams]);

  const handleVideoSelect = useCallback((video: Video) => {
    router.push(`/creator/${video.id}`);
  }, [router]);

  const handleVideoUploaded = (newVideo: Video) => {
    setVideos(prev => [newVideo, ...prev]);
  };

  const handleVideoUpdate = async (videoId: string, updates: { title?: string; description?: string }) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json() as { video: Video };
        // Update videos list
        setVideos(prev => prev.map(video => 
          video.id === videoId ? { ...video, ...result.video } : video
        ));
        // Update search results if present
        setSearchResults(prev => prev.map(video => 
          video.id === videoId ? { ...video, ...result.video } : video
        ));
      } else {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to update video');
      }
    } catch (error) {
      console.error('Failed to update video:', error);
      throw error;
    }
  };

  const displayVideos = searchResults.length > 0 ? searchResults : videos;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Header 
          videoCount={videos.length}
          readyVideoCount={videos.filter(v => v.status === 'ready').length}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            {/* Search Bar */}
            <SearchBar onSearch={handleSearch} />

            {/* Video Library */}
            <VideoLibrary 
              videos={displayVideos}
              loading={loading}
              onVideoSelect={handleVideoSelect}
              isSearching={isSearching}
              onVideoUpdate={handleVideoUpdate}
              showStatus={true}
            />
            
          {/* Upload Area */}
          <VideoUpload onVideoUploaded={handleVideoUploaded} />
        </div>
      </div>
    </div>
  );
}

export default function CreatorPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Creator...</p>
          </div>
        </div>
      }>
        <CreatorContent />
      </Suspense>
    </ProtectedRoute>
  );
}
