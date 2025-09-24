'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface VideoProcessingControlsProps {
  videoId: string;
  onProcessingTriggered?: () => void;
}

interface ProcessingPhase {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const PROCESSING_PHASES: ProcessingPhase[] = [
  {
    id: 'transcription',
    name: 'Transcription',
    description: 'Generate video transcript using AI',
    icon: '📝'
  },
  {
    id: 'tagging',
    name: 'Tagging',
    description: 'Generate relevant tags for the video',
    icon: '🏷️'
  },
  {
    id: 'abstract',
    name: 'Abstract',
    description: 'Generate video summary/abstract',
    icon: '📄'
  },
  {
    id: 'title_generation',
    name: 'Title Generation',
    description: 'Generate optimized video title',
    icon: '✨'
  },
  {
    id: 'chapters',
    name: 'Chapters',
    description: 'Generate video chapters with timestamps',
    icon: '📚'
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: 'Generate video thumbnail',
    icon: '🖼️'
  }
];

export default function VideoProcessingControls({ videoId, onProcessingTriggered }: VideoProcessingControlsProps) {
  const { data: session } = useSession();
  const [processing, setProcessing] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);

  const triggerProcessing = async (phase: string, force: boolean = false) => {
    if (!session) return;

    setProcessing(phase);
    
    try {
      const response = await fetch(`/api/videos/${videoId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase, force }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to trigger processing');
      }

      const result = await response.json();
      console.log(`✅ Successfully triggered ${phase} processing:`, result);
      
      // Show success message
      alert(`Successfully triggered ${phase} processing for video`);
      
      // Notify parent component
      onProcessingTriggered?.();
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error(`Failed to trigger ${phase} processing:`, error);
      alert(`Failed to trigger ${phase} processing: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const triggerAllProcessing = async (force: boolean = false) => {
    await triggerProcessing('all', force);
  };

  if (!session) {
    return null; // Only show for authenticated users
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Processing Controls</h3>
        <button
          onClick={() => setShowControls(!showControls)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>

      {showControls && (
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
            <button
              onClick={() => triggerProcessing('title_generation', false)}
              disabled={processing !== null}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {processing === 'title_generation' ? 'Generating...' : '✨ Generate Title'}
            </button>
            <button
              onClick={() => triggerAllProcessing(false)}
              disabled={processing !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {processing === 'all' ? 'Processing...' : '🔄 Reprocess All'}
            </button>
            <button
              onClick={() => triggerAllProcessing(true)}
              disabled={processing !== null}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {processing === 'all' ? 'Processing...' : '🗑️ Force Reprocess All'}
            </button>
          </div>

          {/* Individual Phase Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROCESSING_PHASES.map((phase) => (
              <div key={phase.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{phase.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{phase.name}</h4>
                      <p className="text-sm text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => triggerProcessing(phase.id, false)}
                    disabled={processing !== null}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === phase.id ? 'Processing...' : 'Retrigger'}
                  </button>
                  <button
                    onClick={() => triggerProcessing(phase.id, true)}
                    disabled={processing !== null}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear existing data and reprocess"
                  >
                    {processing === phase.id ? 'Processing...' : 'Force'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Processing Controls Help:</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Retrigger:</strong> Re-run processing phase (keeps existing data if available)</li>
                  <li><strong>Force:</strong> Clear existing data and reprocess from scratch</li>
                  <li><strong>Reprocess All:</strong> Trigger all phases in the correct order</li>
                  <li><strong>Force Reprocess All:</strong> Clear all data and reprocess everything</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
