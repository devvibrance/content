# ContentOS

## Overview

ContentOS is a creative publishing and campaign management tool designed for content creators. It provides a social media post simulator for Twitter/X and Instagram platforms, allowing users to preview how their content will appear before publishing. The application includes a content library for storing inspiration, profile simulation capabilities, and algorithm scoring to predict content performance.

## Current Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **State Management**: TanStack Query for server state, React hooks for client state
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React, React Icons

### Backend
- **Backend**: Convex (serverless functions, HTTP actions)
- **Local Storage**: IndexedDB for client-side data persistence

### Key Features
- Profile Simulator (Twitter/Instagram profile preview)
- Post Simulator (tweet/feed/reel previews)
- Content Library (store and organize content ideas)
- Multi-profile support
- Algorithm scoring for content performance prediction

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Structure

```
client/           # React frontend
  src/
    components/   # UI and feature components
      ui/         # shadcn/ui components
    pages/        # Route pages (ProfileSimulator, Simulator, Library)
    lib/          # Utilities and helpers
      indexedDB.ts # Local database operations
      queryClient.ts # TanStack Query configuration
    hooks/        # Custom React hooks
convex/           # Convex backend
  http.ts         # HTTP actions for external API calls
  _generated/     # Auto-generated Convex files
```

## Scripts

- `npm run dev` - Start development server (Vite on port 5000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - TypeScript type checking

## Recent Changes

- **February 2026**: Migrated tech stack
  - Replaced Wouter with React Router v7
  - Removed Express.js backend (using Convex for API endpoints)
  - Removed PostgreSQL/Drizzle ORM (using IndexedDB for local storage)
  - Added Convex HTTP actions for Twitter/Instagram metadata fetching
  - Kept all UI components and features identical
