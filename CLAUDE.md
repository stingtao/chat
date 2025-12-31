# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant chat SaaS platform that allows hosts to create and manage their own branded chat communities. Built with Next.js 15 and designed for deployment on Cloudflare Pages with full integration of Cloudflare services (D1, R2, Durable Objects).

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite) with Prisma ORM
- **Storage**: Cloudflare R2 (for file uploads and avatars)
- **Real-time**: Cloudflare Durable Objects with WebSocket
- **Authentication**: JWT with bcrypt password hashing
- **State Management**: Zustand (for client-side state)
- **Deployment**: Cloudflare Pages with @cloudflare/next-on-pages

## Common Development Commands

```bash
# Install dependencies
npm install

# Development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy

# Database commands
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes to database
npm run db:migrate      # Apply migrations to Cloudflare D1

# Generate Cloudflare environment types
npm run cf-typegen
```

## Database Setup

### Local Development
1. Copy environment template:
```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Push schema to local database:
```bash
npm run db:push
```

### Production (Cloudflare D1)
1. Create D1 database:
```bash
wrangler d1 create chat-saas-db
```

2. Update `wrangler.toml` with the database ID from the output

3. Apply migrations:
```bash
npm run db:migrate
```

## Architecture

### Two-Tier User System

The platform has two distinct user types with separate authentication flows:

1. **Host Users** (`/app/api/host/*`)
   - Create and manage workspaces (chat platforms)
   - Customize branding and settings
   - Manage members and permissions
   - View spam reports and analytics
   - Block/unblock users
   - Authentication: `/api/host/login`, `/api/host/register`

2. **Client Users** (`/app/api/client/*`)
   - Join workspaces via invite codes
   - Send messages in direct chats and groups
   - Manage friend requests within workspaces
   - Switch between multiple workspaces
   - Authentication: `/api/client/login`, `/api/client/register`

### Multi-Tenancy Model

Each workspace is completely isolated:
- Users see only members, messages, and groups within the workspace
- Same user can join multiple workspaces
- Settings and branding are per-workspace
- Friend relationships are workspace-specific

### API Structure

```
/app/api/
├── host/
│   ├── login/              # Host authentication
│   ├── register/
│   └── workspace/
│       ├── route.ts        # Create/list workspaces
│       └── [id]/
│           ├── route.ts    # Get/update/delete workspace
│           ├── settings/   # Customize workspace appearance
│           ├── members/    # View all members
│           ├── block/      # Block/unblock users
│           └── spam-reports/ # View and manage reports
│
└── client/
    ├── login/              # Client authentication
    ├── register/
    ├── workspaces/         # List joined workspaces
    ├── workspace/
    │   └── join/           # Join with invite code
    ├── messages/           # Send/receive messages
    ├── friends/            # Friend requests and list
    └── groups/             # Create/manage group chats
```

### Database Schema Highlights

**Key Tables**:
- `Host` - Host user accounts
- `User` - Client user accounts (separate from Host)
- `Workspace` - Chat platforms created by hosts
- `WorkspaceSettings` - Customizable branding per workspace
- `WorkspaceMember` - Join table for users in workspaces
- `Message` - All chat messages (direct and group)
- `Friendship` - Friend relationships within workspaces
- `Group` - Group chat rooms
- `BlockedUser` - Host-managed user blocks
- `SpamReport` - User-reported spam messages

**Important Relations**:
- A workspace belongs to one host but can have many members
- Messages belong to a workspace and can be direct (receiverId) or group (groupId)
- Friendships are workspace-scoped (same user ID can be friends in workspace A but not B)
- Blocked users are immediately removed from workspace membership

## Authentication Flow

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  type: 'host' | 'client';  // Critical: determines API access
}
```

### Authorization Pattern
All protected routes verify:
1. Token presence in `Authorization: Bearer <token>` header
2. Token validity and signature
3. User type matches endpoint (host vs client)
4. User has access to requested resource (workspace ownership/membership)

Example from `lib/auth.ts`:
```typescript
const payload = verifyToken(token);
if (!payload || payload.type !== 'host') {
  return unauthorized();
}
```

## Cloudflare Integration

### Environment Variables (set in Cloudflare Dashboard)
- `JWT_SECRET` - Secret key for JWT signing
- `DATABASE_URL` - Handled automatically by D1 binding

### Bindings (configured in wrangler.toml)
- `DB` - D1 database binding
- `STORAGE` - R2 bucket for file uploads
- `CHAT_ROOM` - Durable Object for real-time messaging

### Prisma with D1
Production uses PrismaD1 adapter:
```typescript
import { PrismaD1 } from '@prisma/adapter-d1';

// In API routes with Cloudflare context
const adapter = new PrismaD1(env.DB);
const prisma = new PrismaClient({ adapter });
```

## Real-Time Messaging

Uses Cloudflare Durable Objects for WebSocket connections:
- Each chat room (direct or group) can have its own Durable Object instance
- Provides consistent, low-latency message delivery
- Handles user presence (online/offline status)
- Typing indicators
- Read receipts

## Mobile Support

The platform is designed for cross-platform usage:
- Responsive design with Tailwind CSS
- PWA manifest for installable web app
- Mobile-first UI patterns (similar to LINE, WhatsApp)
- Touch-friendly interface components

## File Structure

```
/app
  /api              # API routes (host and client)
  /host             # Host dashboard UI pages
  /client           # Client chat UI pages
  /globals.css      # Global styles and animations
  layout.tsx        # Root layout with metadata
  page.tsx          # Landing page

/lib
  auth.ts           # JWT and password utilities
  db.ts             # Prisma client initialization
  types.ts          # TypeScript type definitions
  utils.ts          # Helper functions

/prisma
  schema.prisma     # Database schema

/components         # Reusable React components (to be created)
/public             # Static assets and PWA manifest
```

## Development Best Practices

### When Adding New Features

1. **API-First Approach**: Create API routes before UI components
2. **Type Safety**: Define types in `lib/types.ts` and use throughout
3. **Authorization**: Always verify user type and access permissions
4. **Error Handling**: Return consistent `{ success, data?, error? }` responses
5. **Database Queries**: Use Prisma for type-safe database access

### When Modifying Database Schema

1. Update `prisma/schema.prisma`
2. Run `npm run db:generate` to update Prisma client
3. Run `npm run db:push` for local development
4. Create and run migrations for production:
```bash
wrangler d1 migrations create chat-saas-db <migration-name>
# Edit migration file in migrations/
npm run db:migrate
```

### When Adding Cloudflare Bindings

1. Update `wrangler.toml` with new bindings
2. Run `npm run cf-typegen` to generate TypeScript types
3. Access bindings via `env` parameter in API routes

## Key Utilities

### Password Handling
```typescript
import { hashPassword, verifyPassword } from '@/lib/auth';
const hash = await hashPassword(plaintext);
const isValid = await verifyPassword(plaintext, hash);
```

### Token Generation
```typescript
import { generateToken, verifyToken } from '@/lib/auth';
const token = generateToken({ userId, email, type: 'client' });
const payload = verifyToken(token);
```

### Date Formatting
```typescript
import { formatDate, formatTime } from '@/lib/utils';
const relative = formatDate(message.createdAt);  // "5m ago"
const time = formatTime(message.createdAt);      // "2:30 PM"
```

## Testing Locally

1. Start development server: `npm run dev`
2. Access at `http://localhost:3000`
3. Test host flow:
   - Register at `/host/login`
   - Create workspace
   - Copy invite code
4. Test client flow:
   - Register at `/client/login`
   - Join workspace with invite code
   - Start chatting

## Deployment Checklist

- [ ] Update `JWT_SECRET` in Cloudflare Pages environment variables
- [ ] Create and configure D1 database
- [ ] Create and configure R2 bucket
- [ ] Run database migrations
- [ ] Set up custom domain (optional)
- [ ] Configure Durable Objects bindings
- [ ] Test authentication flows
- [ ] Verify WebSocket connections work

## Security Considerations

- Passwords are hashed with bcrypt (10 rounds)
- JWTs expire after 7 days
- API routes validate user type and ownership
- Blocked users cannot rejoin workspaces
- Spam reporting system for user moderation
- All database queries use Prisma parameterization (SQL injection safe)
