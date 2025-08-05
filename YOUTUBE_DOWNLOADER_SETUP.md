# YouTube Downloader Setup Guide

This guide explains how to set up and use the YouTube downloader feature in Specialist TV.

## Overview

The YouTube downloader allows users to:
1. Paste a YouTube URL
2. View video information and available formats
3. Select desired quality/format
4. Download and automatically upload to Specialist TV
5. Customize title and description before upload

## Architecture

### Backend Components

1. **YouTubeProcessor Service** (`src/services/youtube-processor.ts`)
   - Handles YouTube URL validation and video ID extraction
   - Fetches video metadata using YouTube Data API v3
   - Downloads videos using cobalt.tools API
   - Integrates with existing VideoAPI for upload

2. **API Endpoints** (added to `src/worker.ts`)
   - `POST /api/youtube/info` - Get video metadata and formats
   - `POST /api/youtube/download` - Download and process video

### Frontend Components

1. **YouTubeDownloader Component** (`src/components/YouTubeDownloader.tsx`)
   - Step-by-step UI for URL input, format selection, and download
   - Integrated with existing authentication system
   - Beautiful, responsive design with progress indicators

2. **Creator Page Integration** (`src/app/creator/page.tsx`)
   - Added tabbed interface with File Upload and YouTube Download
   - Seamless integration with existing video library

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your Cloudflare Worker:

```bash
# Optional: YouTube Data API v3 key for enhanced metadata
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**Note**: The YouTube API key is optional. The system will work without it but may have limited metadata functionality.

### 2. Wrangler Configuration

Update your `wrangler.toml` file to include the environment variable:

```toml
[env.production.vars]
YOUTUBE_API_KEY = "your_youtube_api_key_here"

[env.development.vars]
YOUTUBE_API_KEY = "your_youtube_api_key_here"
```

### 3. Getting a YouTube API Key (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the API key to YouTube Data API v3
6. Add the key to your environment variables

## Usage

### For End Users

1. **Access the Feature**
   - Go to the Creator page (`/creator`)
   - Click on the "YouTube Download" tab

2. **Download a Video**
   - Paste a YouTube URL
   - Click "Get Video Info"
   - Review video details and select format
   - Optionally customize title and description
   - Click "Download & Upload"

3. **Supported URL Formats**
   - `https://www.youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`
   - `https://www.youtube.com/embed/VIDEO_ID`
   - `https://www.youtube.com/shorts/VIDEO_ID`

### Available Formats

The system currently supports:
- **720p MP4** - High quality video
- **360p MP4** - Standard quality video
- **Audio Only** - MP3 audio extraction

## Technical Details

### Download Service

The system uses [cobalt.tools](https://cobalt.tools/) API for video downloading:
- Reliable, free service for YouTube downloads
- Supports multiple formats and qualities
- Handles YouTube's changing download mechanisms

### Integration Points

1. **Authentication**: Uses existing JWT-based auth system
2. **Video Processing**: Integrates with existing VideoAPI upload flow
3. **UI Consistency**: Matches existing Specialist TV design patterns
4. **Error Handling**: Comprehensive error handling with user feedback

### File Flow

1. User submits YouTube URL
2. System validates URL and extracts video ID
3. Fetches metadata from YouTube Data API (if available)
4. Gets available formats from cobalt.tools
5. User selects format and customizes details
6. Downloads video from cobalt.tools
7. Creates File object from downloaded buffer
8. Uploads to Cloudflare Stream via existing VideoAPI
9. Video appears in user's library

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **URL Validation**: Only valid YouTube URLs are processed
3. **Rate Limiting**: Consider implementing rate limits for API calls
4. **Content Policy**: Ensure compliance with YouTube's Terms of Service

## Troubleshooting

### Common Issues

1. **"Invalid YouTube URL"**
   - Check URL format
   - Ensure video is public and accessible

2. **"Download service unavailable"**
   - cobalt.tools service may be temporarily down
   - Try again later

3. **"YouTube API error"**
   - Check API key configuration
   - Verify API key has YouTube Data API v3 enabled
   - Check quota limits

4. **"Authentication required"**
   - Ensure user is logged in
   - Check JWT token validity

### Debug Information

Enable debug logging by checking browser console for:
- API request/response details
- Error messages with stack traces
- Network request status

## Future Enhancements

Potential improvements:
1. **Playlist Support** - Download entire playlists
2. **Batch Processing** - Multiple URLs at once
3. **Quality Auto-Selection** - Smart format selection based on preferences
4. **Progress Tracking** - Real-time download progress
5. **Thumbnail Extraction** - Custom thumbnail selection
6. **Subtitle Download** - Extract and process video subtitles

## Legal Compliance

**Important**: Ensure compliance with:
- YouTube Terms of Service
- Copyright laws in your jurisdiction
- Fair use guidelines
- Content creator rights

Only download content you have permission to use or content that falls under fair use provisions.

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify environment variable configuration
3. Test with different YouTube URLs
4. Check Cloudflare Worker logs for backend errors

## API Reference

### POST /api/youtube/info

Get video metadata and available formats.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "videoInfo": {
    "title": "Video Title",
    "description": "Video description...",
    "duration": 253,
    "thumbnail": "https://...",
    "formats": [
      {
        "itag": 22,
        "quality": "720p",
        "format": "mp4",
        "ext": "mp4",
        "resolution": "1280x720",
        "note": "High quality MP4"
      }
    ],
    "videoId": "VIDEO_ID",
    "uploader": "Channel Name",
    "uploadDate": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/youtube/download

Download video and upload to Specialist TV.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": {
    "itag": 22,
    "quality": "720p",
    "format": "mp4",
    "ext": "mp4"
  },
  "title": "Custom Title (optional)",
  "description": "Custom description (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "generated_video_id",
    "title": "Video Title",
    "stream_id": "cloudflare_stream_id",
    // ... other video properties
  },
  "originalVideoInfo": {
    // Original YouTube video metadata
  }
}
```
