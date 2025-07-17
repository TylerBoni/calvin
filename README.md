# AI Calendar App

An intelligent calendar application that understands natural language event descriptions and automatically schedules them for you.

## Features

- 🤖 **AI-Powered Event Creation**: Simply describe your event in natural language
- 📅 **Intelligent Scheduling**: Automatically extracts dates and times from descriptions
- 💬 **Interactive Follow-ups**: AI asks clarifying questions when needed
- 🔐 **Secure Authentication**: User authentication with AuthJS
- 📱 **Modern UI**: Built with SvelteKit for a fast, responsive experience
- 🗄️ **Persistent Storage**: PostgreSQL database for reliable data storage

## How It Works

Instead of filling out forms, just type naturally:
- "Meeting with John tomorrow at 2pm"
- "Doctor appointment next Friday morning"
- "Weekly team standup every Monday at 9am"
- "Lunch with Sarah sometime next week"

The AI will:
1. Extract time and date information when clear
2. Ask follow-up questions for ambiguous details
3. Automatically schedule the event in your calendar
4. Handle recurring events intelligently

## Tech Stack

- **Frontend**: Svelte + Vite
- **Mobile**: Capacitor
- **AI**: OpenAI API (GPT models)
- **Database**: PostgreSQL
- **Authentication**: AuthJS
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- AuthJS provider credentials (Google, GitHub, etc.)

## Installation

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-calendar-app.git
cd ai-calendar-app
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="postgresql://username:password@db:5432/ai_calendar"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# AuthJS
AUTH_SECRET="your-auth-secret"
AUTH_GOOGLE_ID="your-google-oauth-id"
AUTH_GOOGLE_SECRET="your-google-oauth-secret"

# App
PUBLIC_APP_URL="http://localhost:5173"
```

3. Start the application:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed
```

The app will be available at `http://localhost:5173`

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start PostgreSQL database (using Docker):
```bash
docker run -d \
  --name ai-calendar-db \
  -e POSTGRES_DB=ai_calendar \
  -e POSTGRES_USER=username \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

3. Set up environment variables (use localhost for DATABASE_URL):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_calendar"
```

4. Run migrations and start development server:
```bash
npm run db:migrate
npm run dev
```

### Mobile Development

To build for mobile platforms:

```bash
# Build web app
npm run build

# Add platforms
npx cap add ios
npx cap add android

# Sync and open in IDE
npx cap sync
npx cap open ios
npx cap open android
```

## Database Schema

The app uses PostgreSQL with the following main tables:

- `users` - User authentication and profile data
- `events` - Calendar events with AI-extracted metadata
- `ai_conversations` - Chat history for follow-up questions
- `user_preferences` - Timezone, default meeting lengths, etc.

## API Endpoints

### Events
- `GET /api/events` - Get user's events
- `POST /api/events` - Create new event from natural language
- `PUT /api/events/[id]` - Update existing event
- `DELETE /api/events/[id]` - Delete event

### AI Processing
- `POST /api/ai/parse` - Parse natural language description
- `POST /api/ai/followup` - Handle follow-up questions
- `GET /api/ai/suggestions` - Get scheduling suggestions

## Usage Examples

### Basic Event Creation
```javascript
// User input: "Dentist appointment tomorrow at 10am"
// AI extracts: date=tomorrow, time=10:00, title="Dentist appointment"
```

### Handling Ambiguity
```javascript
// User input: "Meeting with the team next week"
// AI response: "I'd be happy to schedule your team meeting! 
//              What day next week works best? 
//              And what time would you prefer?"
```

### Recurring Events
```javascript
// User input: "Gym every Tuesday and Thursday at 6pm"
// AI creates: Recurring event, weekly pattern
```

## AI Processing Flow

1. **Input Processing**: User describes event in natural language
2. **NLP Extraction**: OpenAI API extracts structured data
3. **Validation**: Check for conflicts and validate timing
4. **Clarification**: Ask follow-up questions if needed
5. **Scheduling**: Create event in database
6. **Confirmation**: Show user the scheduled event

## Configuration

### AI Model Settings
Customize the AI behavior in `src/lib/config/ai.js`:
```javascript
export const AI_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,
  maxTokens: 500,
  systemPrompt: 'You are a helpful calendar assistant...'
};
```

### Default Settings
User preferences can be configured:
- Default meeting duration (30 minutes)
- Working hours (9am - 5pm)
- Timezone handling
- Reminder preferences

## Development

### Docker Services

The docker-compose.yml includes:
- **app**: Svelte app with Vite dev server
- **db**: PostgreSQL database
- **redis**: (Optional) For caching and sessions

### Running Tests
```bash
# In Docker
docker-compose exec app npm run test
docker-compose exec app npm run test:integration

# Locally
npm run test
npm run test:integration
```

### Database Migrations
```bash
# In Docker
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:rollback

# Locally
npm run db:migrate
npm run db:rollback
```

### Mobile Development Workflow
```bash
# Build and sync changes to mobile
npm run build
npx cap sync

# Live reload for mobile development
npx cap run ios --livereload
npx cap run android --livereload
```

## Deployment

### Docker Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
Make sure to set production environment variables:
- `DATABASE_URL` - Production PostgreSQL connection
- `OPENAI_API_KEY` - Your OpenAI API key
- `AUTH_SECRET` - Strong random secret for AuthJS
- OAuth provider credentials

### Mobile App Deployment
```bash
# iOS
npx cap build ios
# Then use Xcode to archive and upload to App Store

# Android
npx cap build android
# Then use Android Studio to build release APK/AAB
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Roadmap

- [ ] Smart conflict detection and resolution
- [ ] Integration with external calendars (Google, Outlook)
- [ ] Voice input support
- [ ] Push notifications (mobile)
- [ ] Offline support with sync
- [ ] Team calendar sharing
- [ ] Advanced recurring event patterns
- [ ] Meeting room booking integration
- [ ] Email invitation sending
- [ ] Apple Watch / Wear OS companion apps

## Privacy & Security

- All user data is encrypted at rest
- OpenAI API calls are made server-side only
- Authentication handled securely with AuthJS
- No personal data is stored in AI conversation logs
- GDPR compliant data handling

## Support

For questions or issues:
- Create an issue on GitHub
- Email: support@your-app.com
- Documentation: [Link to docs]

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using SvelteKit, OpenAI, and PostgreSQL**