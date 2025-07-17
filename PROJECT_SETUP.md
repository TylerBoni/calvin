# AI Calendar App - Project Setup Guide

## Overview

I've created a complete AI Calendar App based on your README specifications. Here's what has been built:

### ✅ Features Implemented

- **🤖 AI-Powered Event Creation**: Natural language processing with OpenAI
- **📅 Modern Calendar Interface**: Interactive calendar with event display
- **💬 Conversational AI**: Follow-up questions for ambiguous events
- **🔐 Authentication System**: Email/password + OAuth (Google, GitHub)
- **📱 Mobile-Ready**: Capacitor integration for iOS/Android
- **🗄️ Database**: PostgreSQL with Drizzle ORM
- **🎨 Modern UI**: Tailwind CSS 4 with glass morphism design

### 🏗️ Architecture

#### Frontend (Svelte 5)
- **App.svelte**: Main application with authentication flow
- **Calendar.svelte**: Interactive calendar component with event display
- **EventCreator.svelte**: Natural language event creation with AI chat
- **Navigation.svelte**: Main navigation and user menu
- **AuthModal.svelte**: Authentication modal with OAuth support

#### Backend Services
- **AI Service**: OpenAI integration for natural language processing
- **Database**: PostgreSQL schema with users, events, conversations
- **Authentication**: AuthJS with multiple providers

#### Styling
- **Tailwind CSS 4**: Latest version with CSS-first configuration
- **Glass Morphism**: Modern frosted glass design elements
- **Responsive**: Mobile-first design approach

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://ai_calendar_user:ai_calendar_pass@localhost:5432/ai_calendar"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# AuthJS
AUTH_SECRET="your-super-secret-random-string"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"

# Optional: GitHub OAuth
AUTH_GITHUB_ID="your-github-oauth-id"
AUTH_GITHUB_SECRET="your-github-oauth-secret"

# App
PUBLIC_APP_URL="http://localhost:5173"
```

### 3. Database Setup

#### Option A: Using Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npm run db:migrate
```

#### Option B: Local PostgreSQL
```bash
# Start local PostgreSQL
docker run -d \
  --name ai-calendar-db \
  -e POSTGRES_DB=ai_calendar \
  -e POSTGRES_USER=ai_calendar_user \
  -e POSTGRES_PASSWORD=ai_calendar_pass \
  -p 5432:5432 \
  postgres:15

# Run migrations
npm run db:migrate
```

### 4. Start Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app!

## 📱 Mobile Development

### iOS
```bash
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

### Android
```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run db:generate     # Generate migrations
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database

# Mobile
npm run build:cap       # Build and sync for mobile
npm run dev:ios         # Open iOS project
npm run dev:android     # Open Android project

# Testing
npm run test            # Run unit tests
npm run test:integration # Run integration tests
```

## 🎯 Key Features

### Natural Language Event Creation
- Users can type naturally: "Meeting with John tomorrow at 2pm"
- AI extracts structured data (title, time, location, etc.)
- Follow-up questions for ambiguous information
- Confidence scoring for reliability

### Smart Calendar
- Month/week/day views
- Event conflict detection
- Color-coded events based on AI confidence
- Quick event creation from calendar

### Authentication
- Email/password registration
- Google OAuth integration
- GitHub OAuth integration
- Secure session management

### Modern UI
- Glass morphism design
- Dark/light mode support
- Responsive layout
- Smooth animations

## 🔧 Configuration

### AI Settings (`src/lib/config/ai.ts`)
- OpenAI model configuration
- Temperature and token limits
- System prompts for different scenarios

### Database Schema (`src/lib/db/schema.ts`)
- Users, events, conversations, preferences
- Proper TypeScript types
- Drizzle ORM relations

### Styling (`src/app.css`)
- Tailwind CSS 4 theme
- Custom color palette
- Glass morphism utilities

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Make sure PostgreSQL is running and connection string is correct
2. **OpenAI API**: Verify your API key is valid and has sufficient credits
3. **OAuth Setup**: Configure redirect URLs in your OAuth provider settings
4. **Mobile Build**: Ensure Capacitor is properly configured

### Environment Variables
- All variables in `.env.example` need to be set
- Use strong random strings for `AUTH_SECRET`
- OAuth client IDs must match your provider configuration

## 📚 Next Steps

The foundation is complete! You can now:

1. **Add More AI Features**: Smart conflict resolution, meeting room booking
2. **Extend Calendar**: External calendar sync, recurring events
3. **Mobile Enhancements**: Push notifications, offline support
4. **Team Features**: Shared calendars, meeting invitations
5. **Analytics**: Usage tracking, AI performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ using Svelte 5, OpenAI, PostgreSQL, and Tailwind CSS 4** 