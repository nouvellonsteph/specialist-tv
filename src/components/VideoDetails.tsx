'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VideoLogs from './VideoLogs';
import VTTViewer from './VTTViewer';
import { VideoChat } from './VideoChat';
import { Video, Tag, VideoWithScore } from '../types';
import { formatTime } from '../utils/time';
import { formatViewCount } from '../utils/dateUtils';

interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
  summary?: string;
}

interface VideoDetailsProps {
  video: Video;
  onClose: () => void;
  onVideoDelete?: () => void;
  onVideoRefresh: () => void;
  onTimeSeek?: (time: number) => void;
  tvMode?: boolean; // If true, only show ready videos in related section
}

export function VideoDetails({ video, onClose, onVideoDelete, onVideoRefresh, onTimeSeek, tvMode = false }: VideoDetailsProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoWithScore[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'chapters' | 'details' | 'transcript' | 'vtt' | 'related' | 'logs' | 'chat' | 'tags'>('chapters');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadVideoData = useCallback(async () => {
    setLoading(true);
    try {
      // Load chapters, transcript, related videos, and tags in parallel
      const [chaptersRes, transcriptRes, relatedRes, tagsRes] = await Promise.all([
        fetch(`/api/videos/${video.id}/chapters`),
        fetch(`/api/videos/${video.id}/transcript`),
        fetch(`/api/videos/${video.id}/related`),
        fetch(`/api/videos/${video.id}/tags`)
      ]);

      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json() as Chapter[];
        setChapters(chaptersData);
      }

      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json() as { content: string };
        setTranscript(transcriptData.content || '');
      }

      if (relatedRes.ok) {
        const relatedData = await relatedRes.json() as VideoWithScore[];
        // In TV mode, only show ready related videos
        const filteredRelated = tvMode 
          ? relatedData.filter(video => video.status === 'ready')
          : relatedData;
        setRelatedVideos(filteredRelated);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json() as { tags: Tag[] };
        setTags(tagsData.tags || []);
      }

    } catch (error) {
      console.error('Failed to load video data:', error);
    } finally {
      setLoading(false);
    }
  }, [video.id, tvMode]);

  useEffect(() => {
    loadVideoData();
  }, [loadVideoData]);

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

  const handleDeleteVideo = async () => {
    if (!onVideoDelete) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      await onVideoDelete();
      onClose(); // Close the player after successful deletion
      if (onVideoRefresh) {
        onVideoRefresh(); // Refresh the video list
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper functions for similarity score badges (same as vector page)
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.7) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg h-fit lg:sticky lg:top-8">
      {/* Header - Hidden on mobile since back button is in VideoPlayerMain */}
      <div className="hidden lg:block p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            Video Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4 flex-shrink-0">
        {video.description && (
          <p className="text-sm text-gray-600 mb-2">{video.description}</p>
        )}
        
        <div className="flex items-center text-xs text-gray-900 space-x-4">
          <span>Uploaded {formatDate(video.upload_date)}</span>
          {video.duration && <span>{formatTime(video.duration)}</span>}
          <span className="capitalize">{video.status}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mx-4 flex-shrink-0">
        <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
          {['chapters', 'details', 'transcript', 'vtt', 'tags', 'related', 'logs', 'chat'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'chapters' | 'details' | 'transcript' | 'vtt' | 'tags' | 'related' | 'logs' | 'chat')}
              className={`py-2 px-2 lg:px-3 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'chapters' && chapters.length > 0 && (
                <span className="ml-1 text-xs text-gray-500">({chapters.length})</span>
              )}
              {tab === 'related' && relatedVideos.length > 0 && (
                <span className="ml-1 text-xs text-gray-500">({relatedVideos.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[60vh] lg:max-h-[70vh]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Video Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Video Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-900">Stream ID:</dt>
                      <dd className="text-gray-900 font-mono text-xs">{video.stream_id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-900">Status:</dt>
                      <dd className="text-gray-900 capitalize">{video.status}</dd>
                    </div>
                    {video.duration && (
                      <div className="flex justify-between">
                        <dt className="text-gray-900">Duration:</dt>
                        <dd className="text-gray-900">{formatTime(video.duration)}</dd>
                      </div>
                    )}
                    {video.view_count !== undefined && video.view_count !== null && (
                      <div className="flex justify-between">
                        <dt className="text-gray-900">View Count:</dt>
                        <dd className="text-gray-900 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{formatViewCount(video.view_count)} views</span>
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-900">Upload Date:</dt>
                      <dd className="text-gray-900">{formatDate(video.upload_date)}</dd>
                    </div>
                    {video.created_at && (
                      <div className="flex justify-between">
                        <dt className="text-gray-900">Created:</dt>
                        <dd className="text-gray-900">{formatDate(video.created_at)}</dd>
                      </div>
                    )}
                    {video.updated_at && (
                      <div className="flex justify-between">
                        <dt className="text-gray-900">Updated:</dt>
                        <dd className="text-gray-900">{formatDate(video.updated_at)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Delete Video */}
                {onVideoDelete && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Danger Zone</h4>
                    <button
                      onClick={handleDeleteVideo}
                      disabled={deleting}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Delete Video'}
                    </button>
                    <p className="text-xs text-gray-900 mt-2">
                      This will permanently delete the video and all associated data.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Chapters Tab */}
            {activeTab === 'chapters' && (
              <div className="space-y-3">
                {chapters.length > 0 ? (
                  chapters.map((chapter, index) => (
                    <div 
                      key={chapter.title} 
                      className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors group"
                      onClick={() => onTimeSeek?.(chapter.start_time)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                          {index + 1}. {chapter.title}
                        </h4>
                        <span className="text-xs text-blue-600 group-hover:text-blue-700 font-mono ml-2">
                          {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
                        </span>
                      </div>
                      {chapter.summary && (
                        <p className="text-sm text-gray-600">{chapter.summary}</p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-gray-900 group-hover:text-blue-600">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Click to jump to this chapter
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-900 text-center py-4">
                    No chapters available for this video.
                  </p>
                )}
              </div>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <div className="max-w-none">
                {transcript ? (
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-mono">
                      {transcript}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-800 mb-2 font-medium">📝 No transcript available</div>
                    <div className="text-sm text-gray-600">Transcript will be available once video processing is complete.</div>
                  </div>
                )}
              </div>
            )}

            {/* VTT Tab */}
            {activeTab === 'vtt' && (
              <VTTViewer 
                videoId={video.id} 
                onTimeSeek={onTimeSeek}
              />
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-3">
                {tags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p>No tags available</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Related Videos Tab */}
            {activeTab === 'related' && (
              <div className="space-y-3">
                {relatedVideos.length > 0 ? (
                  relatedVideos.map((relatedVideoItem) => (
                    <div key={relatedVideoItem.id} className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                          {relatedVideoItem.title}
                        </h4>
                        {relatedVideoItem.confidence_score !== undefined && (
                          <div className="flex flex-col items-end space-y-1 ml-2">
                            <span className={`text-xs border px-2 py-1 rounded-full font-medium ${getScoreColor(relatedVideoItem.confidence_score)}`}>
                              {(relatedVideoItem.confidence_score * 100).toFixed(1)}%
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getScoreColor(relatedVideoItem.confidence_score)}`}>
                              {getScoreLabel(relatedVideoItem.confidence_score)}
                            </span>
                          </div>
                        )}
                      </div>
                      {relatedVideoItem.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {relatedVideoItem.description}
                        </p>
                      )}
                      <div className="flex items-center text-xs text-gray-500 space-x-3">
                        <span className="font-medium">{formatDate(relatedVideoItem.upload_date)}</span>
                        {relatedVideoItem.duration && <span>{formatTime(relatedVideoItem.duration)}</span>}
                        <span className="capitalize px-2 py-1 bg-gray-100 rounded text-gray-800">{relatedVideoItem.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-800 mb-2 font-medium">🔗 No related videos found</div>
                    <div className="text-sm text-gray-600">Related videos will appear here based on content similarity.</div>
                  </div>
                )}
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <VideoLogs videoId={video.id} limit={50} />
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <VideoChat video={video} transcript={transcript} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
