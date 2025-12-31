# Chat SaaS Platform

A multi-tenant chat platform that allows hosts to create and manage their own branded chat communities. Built with Next.js 15 and designed for deployment on Cloudflare Pages.

## Features

### For Hosts
- Create and manage multiple chat workspaces
- Customize branding (colors, logo, welcome message)
- Invite users with unique invite codes
- View and manage all members
- Block/unblock users
- Review spam reports
- Workspace analytics

### For Clients
- Join multiple workspaces
- Real-time messaging (direct and group)
- Friend requests within workspaces
- Create and manage groups
- Switch between workspaces
- Report spam

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite) with Prisma ORM
- **Storage**: Cloudflare R2
- **Real-time**: Cloudflare Durable Objects
- **Auth**: JWT with bcrypt

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

Edit `.env.local` and add your JWT secret:
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-here"
```

3. **Generate Prisma client and create database**
```bash
npm run db:generate
DATABASE_URL="file:./prisma/dev.db" npx prisma db push
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
/app
  /api              # API routes
    /host           # Host endpoints (workspace management)
    /client         # Client endpoints (chat, friends)
  /host             # Host dashboard pages (TODO)
  /client           # Client chat pages (TODO)
  globals.css       # Global styles
  layout.tsx        # Root layout
  page.tsx          # Landing page

/lib
  auth.ts           # JWT & password utilities
  db.ts             # Prisma client
  types.ts          # TypeScript types
  utils.ts          # Helper functions

/prisma
  schema.prisma     # Database schema

wrangler.toml       # Cloudflare configuration
```

## API Endpoints

### Host API (`/api/host`)
- `POST /api/host/register` - Register host account
- `POST /api/host/login` - Host login
- `GET /api/host/workspace` - List workspaces
- `POST /api/host/workspace` - Create workspace
- `GET /api/host/workspace/[id]` - Get workspace details
- `PUT /api/host/workspace/[id]` - Update workspace
- `DELETE /api/host/workspace/[id]` - Delete workspace
- `PUT /api/host/workspace/[id]/settings` - Update settings
- `GET /api/host/workspace/[id]/members` - List members
- `POST /api/host/workspace/[id]/block` - Block user
- `GET /api/host/workspace/[id]/spam-reports` - Get reports

### Client API (`/api/client`)
- `POST /api/client/register` - Register user account
- `POST /api/client/login` - User login
- `GET /api/client/workspaces` - List joined workspaces
- `POST /api/client/workspace/join` - Join with invite code
- `GET /api/client/messages` - Get messages
- `POST /api/client/messages` - Send message
- `GET /api/client/friends` - List friends
- `POST /api/client/friends` - Send friend request
- `PUT /api/client/friends` - Accept/reject request

## Next Steps

### Immediate TODO
1. **Create Host Dashboard UI**
   - Login/Register pages
   - Workspace list and creation
   - Workspace settings page
   - Members management
   - Spam reports view

2. **Create Client Chat UI**
   - Login/Register pages
   - Workspace selector
   - Chat interface (similar to WhatsApp/LINE)
   - Friend list
   - Group management

3. **Implement Real-time Features**
   - WebSocket with Durable Objects
   - Online/offline status
   - Typing indicators
   - Read receipts
   - Push notifications

4. **File Upload**
   - Image upload to R2
   - Avatar management
   - File sharing in chat

5. **Group Chat**
   - Create groups API
   - Group management UI
   - Group permissions

### Future Enhancements
- Multi-language support (i18n)
- Voice/Video calling
- Message reactions
- Message search
- Analytics dashboard for hosts
- Mobile apps (React Native)
- Email notifications
- Payment integration for premium features

## Deployment to Cloudflare

### One-time Setup

1. **Create D1 Database**
```bash
wrangler d1 create chat-saas-db
```

Copy the database ID and update `wrangler.toml`

2. **Create R2 Bucket**
```bash
wrangler r2 bucket create chat-saas-storage
```

3. **Run Migrations**
```bash
wrangler d1 migrations create chat-saas-db init
# Edit migration file
wrangler d1 migrations apply chat-saas-db
```

### Deploy

```bash
npm run deploy
```

Set environment variables in Cloudflare Pages dashboard:
- `JWT_SECRET` - Strong random secret

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and development guidelines.

## License

Private project - All rights reserved
