# Knowledge Management POC - Specialist TV

A comprehensive video knowledge management platform built for pre-sales teams using the Cloudflare stack. This POC enables easy video upload, AI-powered processing, intelligent search, and content discovery.

## 🚀 Features

### Content Creation

- **Drag & Drop Upload**: Intuitive video upload interface
- **Cloudflare Stream Integration**: Automatic video encoding and delivery
- **AI Processing Pipeline**: Automated transcription, tagging, and chapter generation
- **Thumbnail Management**: AI-generated or user-selected thumbnails
- **Webhook Notifications**: Real-time processing status updates

### Content Consumption

- **Full-Text Search**: Search across titles, descriptions, transcripts, and tags
- **AI-Powered Tagging**: Automatic categorization for presales searchability
- **Video Chapters**: AI-generated chapters for easy navigation
- **Related Content**: TF-IDF similarity-based recommendations
- **Responsive Design**: Optimized for desktop and mobile
- **Real-time Status**: Live processing status and progress tracking

## 🏗️ Architecture

### Cloudflare Stack

- **Workers**: Main API and business logic
- **D1 Database**: Video metadata, transcripts, tags, and search indices
- **R2 Storage**: Thumbnail storage
- **Stream**: Video encoding, storage, and delivery
- **Queues**: Async processing pipeline
- **AI Workers**: Transcription, tagging, and thumbnail generation

### Data Flow

1. **Upload**: Drag & drop → Worker → Stream API (direct upload)
2. **Processing**: Stream webhook → Queue → AI processing (transcription/tagging/chapters)
3. **Storage**: Metadata → D1, Thumbnails → R2
4. **Search**: Full-text search across D1 stored content
5. **Delivery**: Stream for videos, R2 for thumbnails

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers, D1, R2, Stream, and AI enabled
- Wrangler CLI installed and authenticated

### Quick Start

1. **Clone and setup**:

   ```bash
   cd specialist-tv
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure Cloudflare services**:

   ```bash
   # Set your Stream API credentials
   wrangler secret put STREAM_API_TOKEN
   wrangler secret put STREAM_ACCOUNT_ID
   
   # Optional: Set webhook secret for security
   wrangler secret put WEBHOOK_SECRET
   ```

3. **Development**:

   ```bash
   npm run dev
   ```

4. **Deploy**:

   ```bash
   npm run deploy
   ```

### Manual Setup

If the setup script doesn't work, follow these manual steps:

1. **Create D1 Database**:
   ```bash
   wrangler d1 create specialist-tv-db
   # Update wrangler.jsonc with the returned database_id
   wrangler d1 execute specialist-tv-db --file=./schema.sql
   ```

2. **Create R2 Bucket**:
   ```bash
   wrangler r2 bucket create specialist-tv-thumbnails
   ```

3. **Create Queue**:
   ```bash
   wrangler queues create video-processing
   ```

4. **Set Environment Variables**:
   ```bash
   wrangler secret put STREAM_API_TOKEN
   wrangler secret put STREAM_ACCOUNT_ID
   ```

5. **Configure Stream Webhooks**:
   ```bash
   # Deploy first to get webhook URL
   npm run deploy
   
   # Set up webhook (replace with your values)
   export STREAM_ACCOUNT_ID="your-account-id"
   export STREAM_API_TOKEN="your-api-token"
   export WEBHOOK_URL="https://your-worker.workers.dev/stream/webhook"
   node scripts/setup-webhook.js
   
   # Save webhook secret
   wrangler secret put WEBHOOK_SECRET
   ```

   📚 **Detailed Guide**: See [docs/webhook-setup.md](docs/webhook-setup.md) for complete webhook configuration instructions.

## 📊 Database Schema

The POC uses a comprehensive schema designed for video knowledge management:

- **videos**: Core video metadata and status
- **transcripts**: AI-generated transcripts with confidence scores
- **tags**: Hierarchical tagging system for presales categorization
- **video_tags**: Many-to-many relationship with confidence scoring
- **chapters**: AI-generated video chapters with timestamps
- **search_index**: FTS5 full-text search index
- **webhooks**: Notification tracking and delivery status

## 🔍 API Endpoints

### Video Management
- `POST /api/videos/upload` - Upload new video
- `GET /api/videos` - List all videos (with pagination)
- `GET /api/videos/{id}` - Get specific video
- `DELETE /api/videos/{id}` - Delete video (removes from both DB and Stream)
- `GET /api/videos/search?q={query}` - Search videos
- `GET /api/videos/{id}/related` - Get related videos
- `POST /api/videos/sync` - Sync all processing videos from Stream API

### AI Features
- `POST /api/videos/{id}/thumbnail` - Generate AI thumbnail
- Automatic transcription, tagging, and chapter generation via queue

### Webhooks
- `POST /stream/webhook` - Cloudflare Stream webhook handler

## 🤖 AI Processing Pipeline

### Transcription
- Uses Cloudflare Stream's native AI captions for speech-to-text
- Supports English language processing with high accuracy
- Automatically generates and downloads VTT caption files
- Stores confidence scores and metadata

### Tagging
- AI analyzes video content for presales-relevant tags
- Categories: products, technologies, customer types, use cases, difficulty levels
- Confidence scoring for tag relevance

### Chapters
- AI-generated video chapters for navigation
- Timestamp-based segmentation
- Summary generation for each chapter

### Related Content
- TF-IDF similarity algorithm
- Cosine similarity for content matching
- Recency weighting for recommendations

## 🎨 Frontend Components

### VideoUpload
- Drag & drop interface
- File validation and preview
- Progress tracking
- Form validation

### VideoLibrary
- Grid/list view of videos
- Status indicators
- Thumbnail previews
- Metadata display

### SearchBar
- Real-time search with debouncing
- Search suggestions
- Query highlighting

### VideoPlayer
- Cloudflare Stream integration
- Chapter navigation
- Transcript display
- Related video recommendations

## 🔧 Configuration

### Environment Variables
- `STREAM_API_TOKEN`: Cloudflare Stream API token
- `STREAM_ACCOUNT_ID`: Cloudflare account ID
- `WEBHOOK_SECRET`: Optional webhook signature verification

### Wrangler Configuration
The `wrangler.jsonc` file includes all necessary bindings:
- D1 database binding
- R2 bucket binding
- Queue producer/consumer configuration
- AI binding for processing

## 📈 Monitoring & Observability

- **Webhook Tracking**: All processing events logged to database
- **Status Monitoring**: Real-time video processing status
- **Error Handling**: Comprehensive error tracking and retry logic
- **Performance Metrics**: Built-in Cloudflare Workers analytics

## 🚦 Development Workflow

1. **Local Development**:
   ```bash
   npm run dev
   ```

2. **Testing**:
   ```bash
   # Test database operations
   wrangler d1 execute specialist-tv-db --command="SELECT * FROM videos;"
   
   # Test queue processing
   wrangler queues producer video-processing '{"video_id":"test"}'
   ```

3. **Deployment**:
   ```bash
   npm run deploy
   ```

## 🔒 Security Considerations

- **API Authentication**: Currently disabled for POC (add as needed)
- **Webhook Verification**: Optional signature verification
- **CORS Configuration**: Configured for development
- **Input Validation**: File type and size restrictions

## 📝 Usage Examples

### Upload a Video
1. Drag and drop a video file onto the upload area
2. Enter title and optional description
3. Click "Upload Video"
4. Monitor processing status in real-time

### Search Content
1. Use the search bar to find videos
2. Search across titles, descriptions, transcripts, and tags
3. Click on results to view videos

### View Video Details
1. Click on any ready video in the library
2. View chapters, transcript, and related content
3. Navigate through video using chapter markers

## 🤝 Contributing

This is a POC designed for demonstration purposes. For production use:

1. Add proper authentication and authorization
2. Implement rate limiting and abuse protection
3. Add comprehensive error handling and logging
4. Optimize database queries and indexing
5. Add unit and integration tests
6. Implement proper CI/CD pipeline

## 📄 License

This project is for demonstration purposes. Please ensure compliance with Cloudflare's terms of service and any applicable licenses for the technologies used.

## 🆘 Troubleshooting

### Common Issues

1. **Database not found**: Ensure D1 database is created and ID is correct in wrangler.jsonc
2. **Stream upload fails**: Verify STREAM_API_TOKEN and STREAM_ACCOUNT_ID are set
3. **Queue not processing**: Check queue configuration and consumer setup
4. **AI processing fails**: Ensure AI binding is properly configured

### Debug Commands

```bash
# Check database status
wrangler d1 info specialist-tv-db

# View recent logs
wrangler tail

# Test queue
wrangler queues consumer video-processing
```

## 🔮 Future Enhancements

- **User Authentication**: Google OAuth integration
- **Team Management**: Multi-tenant support
- **Advanced Analytics**: Usage metrics and insights
- **Mobile App**: React Native companion app
- **Integrations**: Slack, Teams, CRM systems
- **Advanced AI**: Sentiment analysis, topic modeling
- **Collaboration**: Comments, annotations, sharing
