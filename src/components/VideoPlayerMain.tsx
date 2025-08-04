'use client';

import React, { useEffect } from 'react';
import { Stream } from '@cloudflare/stream-react';
import { Video } from '../types';
import { formatTime } from '../utils/time';
import VideoActions from './VideoActions';

interface VideoPlayerMainProps {
  video: Video;
  onBack?: () => void;
  onSeekTime?: number; // Time to seek to when changed
  onVideoRefresh?: () => void;
  onTagClick?: (tag: string) => void;
  showQuickActions?: boolean; // Control visibility of quick actions
}

export function VideoPlayerMain({ video, onBack, onSeekTime, onVideoRefresh, onTagClick, showQuickActions = true }: VideoPlayerMainProps) {

  // Debug logging for onSeekTime prop changes
  useEffect(() => {
    console.log('VideoPlayerMain: onSeekTime prop changed to:', onSeekTime);
  }, [onSeekTime]);





  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil((diffDays - 1) / 7)} weeks ago`;
    return date.toLocaleDateString();
  };



  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
      {/* Back Button */}
      {onBack && (
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </button>
        </div>
      )}
      {/* Video Player */}
      <div className={`aspect-video bg-black overflow-hidden ${onBack ? 'rounded-none' : 'rounded-t-lg'}`}>
        {video.status === 'ready' ? (
          <Stream
            controls
            src={video.stream_id}
            className="w-full h-full"
            poster={video.thumbnail_url}
            preload="metadata"
            currentTime={onSeekTime && onSeekTime > 0 ? onSeekTime : undefined}
            autoplay={onSeekTime !== undefined && onSeekTime > 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              {video.status === 'processing' ? (
                <>
                  <svg className="w-12 h-12 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm">Processing video...</p>
                  <p className="text-xs text-gray-300 mt-1">This may take a few minutes</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm">Video unavailable</p>
                  <p className="text-xs text-gray-300 mt-1">There was an error processing this video</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {video.title}
        </h2>
        
        {video.description && (
          <p className="text-gray-600 mb-4 leading-relaxed">
            {video.description}
          </p>
        )}
        
        {/* Abstract */}
        {video.abstract && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 italic leading-relaxed">
              {video.abstract}
            </p>
          </div>
        )}
        
        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {video.tags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => onTagClick?.(tag)}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  title={`Filter by tag: ${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-900 space-x-6">
            <span>Uploaded {formatDate(video.upload_date)}</span>
            {video.duration && <span>Duration: {formatTime(video.duration)}</span>}
            <span className="capitalize">Status: {video.status}</span>
          </div>
        </div>
        
        {/* Quick Actions - Only show in creator mode */}
        {showQuickActions && (
          <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-900">Quick Actions</h4>
            </div>
            <VideoActions 
              video={video} 
              onActionsComplete={() => {
                // Refresh data when actions complete
                onVideoRefresh?.();
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
