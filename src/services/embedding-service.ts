import { CloudflareEnv } from '../types';

export interface VideoEmbedding {
  id: string;
  videoId: string;
  chunkIndex: number;
  content: string;
  metadata: {
    videoTitle: string;
    videoDescription?: string;
    chunkStart?: number;
    chunkEnd?: number;
    tags?: string[];
  };
}

export interface SimilarVideo {
  videoId: string;
  score: number;
  content: string;
  metadata: VideoEmbedding['metadata'];
}

export class EmbeddingService {
  private env: CloudflareEnv;
  private readonly CHUNK_SIZE = 1000; // Characters per chunk
  private readonly CHUNK_OVERLAP = 200; // Overlap between chunks

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Generate embeddings for a video transcript and store in Vectorize
   */
  async generateAndStoreEmbeddings(
    videoId: string,
    transcript: string,
    videoTitle: string,
    videoDescription?: string,
    tags?: string[]
  ): Promise<number> {
    try {
      console.log(`🔄 Generating embeddings for video: ${videoId}`);

      // Split transcript into chunks for better semantic representation
      const chunks = this.chunkText(transcript);
      
      // Generate embeddings for each chunk
      const embeddings: VideoEmbedding[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding using Cloudflare AI
        const embeddingResponse = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: chunk.content
        }) as { data: number[][] };

        const embedding: VideoEmbedding = {
          id: `${videoId}-chunk-${i}`,
          videoId,
          chunkIndex: i,
          content: chunk.content,
          metadata: {
            videoTitle,
            videoDescription,
            chunkStart: chunk.start,
            chunkEnd: chunk.end,
            tags
          }
        };

        embeddings.push(embedding);

        // Store in Vectorize
        await this.env.VIDEO_EMBEDDINGS.upsert([{
          id: embedding.id,
          values: embeddingResponse.data[0],
          metadata: {
            videoId: embedding.videoId,
            chunkIndex: embedding.chunkIndex,
            content: embedding.content,
            videoTitle: embedding.metadata.videoTitle,
            videoDescription: embedding.metadata.videoDescription || '',
            chunkStart: embedding.metadata.chunkStart || 0,
            chunkEnd: embedding.metadata.chunkEnd || 0,
            tags: embedding.metadata.tags?.join(',') || ''
          }
        }]);
      }

      console.log(`✅ Generated and stored ${embeddings.length} embeddings for video: ${videoId}`);
      return embeddings.length;
    } catch (error) {
      console.error(`❌ Error generating embeddings for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar videos using vector similarity
   */
  async searchSimilarVideos(
    query: string,
    limit: number = 10,
    excludeVideoId?: string
  ): Promise<SimilarVideo[]> {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: query
      }) as { data: number[][] };

      // Search in Vectorize
      const results = await this.env.VIDEO_EMBEDDINGS.query(queryEmbedding.data[0], {
        topK: limit * 3, // Get more results to filter duplicates
        returnMetadata: true
      });

      // Process results and deduplicate by video ID
      const videoScores = new Map<string, SimilarVideo>();
      
      for (const match of results.matches) {
        const metadata = match.metadata as Record<string, unknown>;
        const videoId = metadata.videoId as string;
        
        // Skip excluded video
        if (excludeVideoId && videoId === excludeVideoId) {
          continue;
        }

        // Keep the highest scoring chunk for each video
        if (!videoScores.has(videoId) || videoScores.get(videoId)!.score < match.score) {
          videoScores.set(videoId, {
            videoId,
            score: match.score,
            content: metadata.content as string,
            metadata: {
              videoTitle: metadata.videoTitle as string,
              videoDescription: (metadata.videoDescription as string) || undefined,
              chunkStart: (metadata.chunkStart as number) || undefined,
              chunkEnd: (metadata.chunkEnd as number) || undefined,
              tags: metadata.tags ? (metadata.tags as string).split(',').filter(Boolean) : undefined
            }
          });
        }
      }

      // Return top results sorted by score, filtered by minimum threshold
      return Array.from(videoScores.values())
        .filter(video => video.score > 0.6) // Only include videos with >60% similarity
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Error searching similar videos:', error);
      throw error;
    }
  }

  /**
   * Find related videos for a specific video
   */
  async getRelatedVideos(videoId: string, limit: number = 5): Promise<SimilarVideo[]> {
    try {
      // Get the video's transcript from database
      const video = await this.env.DB.prepare(`
        SELECT v.title, v.description, t.content as transcript
        FROM videos v
        LEFT JOIN transcripts t ON v.id = t.video_id
        WHERE v.id = ?
      `).bind(videoId).first();

      if (!video || !video.transcript) {
        console.log(`No transcript found for video: ${videoId}`);
        return [];
      }

      // Use the transcript to find similar videos
      const similarVideos = await this.searchSimilarVideos(
        video.transcript as string,
        limit,
        videoId // Exclude the current video
      );

      return similarVideos;
    } catch (error) {
      console.error(`❌ Error getting related videos for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Delete embeddings for a video
   */
  async deleteEmbeddings(videoId: string): Promise<void> {
    try {
      // Query to find all embedding IDs for this video
      const results = await this.env.VIDEO_EMBEDDINGS.query([0], {
        topK: 1000, // Large number to get all chunks
        returnMetadata: true,
        filter: { videoId }
      });

      // Delete all embeddings for this video
      const idsToDelete = results.matches.map((match: { id: string }) => match.id);
      if (idsToDelete.length > 0) {
        await this.env.VIDEO_EMBEDDINGS.deleteByIds(idsToDelete);
        console.log(`🗑️ Deleted ${idsToDelete.length} embeddings for video: ${videoId}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting embeddings for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Split text into chunks with overlap for better semantic representation
   */
  private chunkText(text: string): Array<{ content: string; start: number; end: number }> {
    const chunks: Array<{ content: string; start: number; end: number }> = [];
    
    if (text.length <= this.CHUNK_SIZE) {
      return [{ content: text, start: 0, end: text.length }];
    }

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + this.CHUNK_SIZE, text.length);
      
      // Try to break at word boundaries
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + this.CHUNK_SIZE * 0.8) {
          end = lastSpace;
        }
      }

      const content = text.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({ content, start, end });
      }

      // Move start position with overlap
      start = Math.max(start + this.CHUNK_SIZE - this.CHUNK_OVERLAP, end);
    }

    return chunks;
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{ totalEmbeddings: number; totalVideos: number }> {
    try {
      // This is a rough estimate since Vectorize doesn't have a direct count method
      const sampleResults = await this.env.VIDEO_EMBEDDINGS.query([0], {
        topK: 1000,
        returnMetadata: true
      });

      const uniqueVideos = new Set(
        sampleResults.matches
          .filter(match => match.metadata)
          .map(match => (match.metadata as Record<string, unknown>).videoId as string)
      );

      return {
        totalEmbeddings: sampleResults.matches.length,
        totalVideos: uniqueVideos.size
      };
    } catch (error) {
      console.error('❌ Error getting embedding stats:', error);
      return { totalEmbeddings: 0, totalVideos: 0 };
    }
  }
}
