# Chat Interface User Guide

## Overview

The chat interface is now fully functional with a modern, WhatsApp-like design. It includes all core features for a multi-tenant chat platform.

## Features Implemented

### ✅ Authentication
- **Client Login/Register** (`/client/login`)
  - Email & password authentication
  - JWT token-based sessions
  - Automatic redirect to chat interface

### ✅ Workspace Management
- **Join Workspaces** - Use invite codes to join chat platforms
- **Switch Workspaces** - Manage multiple workspaces from one account
- **Workspace Switcher** - Quick access to all your workspaces

### ✅ Chat Features
- **Direct Messaging** - One-on-one conversations with friends
- **Group Chats** - Create and participate in group conversations
- **Real-time Updates** - WebSocket with polling fallback
- **Message History** - Full conversation history
- **Typing Indicators** - (Ready for WebSocket integration)

### ✅ Friend Management
- **Add Friends** - Send friend requests to workspace members
- **Friend List** - View all your friends in each workspace
- **Member Discovery** - Browse workspace members

### ✅ User Interface
- **Conversation List** - View all active chats
- **Chat Window** - Clean message interface with bubbles
- **Message Input** - Send text messages with attachments (R2)
- **Responsive Design** - Works on desktop and mobile
- **Custom Branding** - Workspace colors and logos

## How to Use

### 1. First Time Setup

```bash
# Start the development server
npm run dev

# Visit http://localhost:3000
```

### 2. Create a Test Environment

**Option A: Host + Client Flow (Recommended for Testing)**

1. Open `http://localhost:3000/host/login` in one browser
   - Register as a host
   - Create a workspace
   - Copy the invite code

2. Open `http://localhost:3000/client/login` in another browser (or incognito)
   - Register as client user 1
   - Join workspace with invite code

3. Repeat step 2 with another browser/incognito
   - Register as client user 2
   - Join the same workspace

**Option B: Direct Database Setup (Faster)**

You can also insert test data directly into the database using Prisma Studio or SQL.

### 3. Using the Chat Interface

1. **Login** at `/client/login`
   - Enter email and password
   - You'll be redirected to `/client/chat`

2. **Join a Workspace**
   - Click the workspace icon (top left)
   - Click "Join Workspace"
   - Enter invite code from host

3. **Add Friends**
   - Click the "Add Friends" button (top right, user+ icon)
   - Browse workspace members
   - Click "Add" to send friend request
   - Other user accepts via the Friend Requests panel

4. **Start Chatting**
   - Click on a friend from the conversation list
   - Type message in the input box
   - Press Enter or click send button
   - Messages appear in real-time

5. **Create Groups**
   - Click the group icon in the top bar
   - Pick a name and members

## Component Structure

```
/app/client
  /login/page.tsx          - Authentication page
  /chat/page.tsx           - Main chat interface

/components/chat
  MessageBubble.tsx        - Individual message display
  MessageInput.tsx         - Message composition
  ChatWindow.tsx           - Main chat area
  ConversationList.tsx     - Sidebar with friends/groups
  WorkspaceSwitcher.tsx    - Workspace selector modal
  FriendList.tsx           - Add friends modal
  FriendRequests.tsx       - Accept/decline requests
  CreateGroup.tsx          - Group creation modal
  GroupSettings.tsx        - Rename/leave group modal
  ProfileSettings.tsx      - Update avatar/username

/stores
  chatStore.ts             - Zustand state management

/lib
  api.ts                   - API client wrapper
```

## API Endpoints Used

- `POST /api/client/login` - Authentication
- `POST /api/client/register` - User registration
- `GET /api/client/workspaces` - List joined workspaces
- `POST /api/client/workspace/join` - Join with invite code
- `GET /api/client/workspace/[id]/members` - List members
- `GET /api/client/messages` - Get conversation messages
- `POST /api/client/messages` - Send message
- `GET /api/client/friends` - List friends
- `POST /api/client/friends` - Send friend request
- `GET /api/client/groups` - List groups
- `POST /api/client/groups` - Create group
- `PUT /api/client/groups` - Rename group
- `DELETE /api/client/groups` - Leave group
- `PUT /api/client/profile` - Update profile
- `POST /api/client/spam-reports` - Report spam

## Testing Checklist

- [ ] Register new client user
- [ ] Login with existing credentials
- [ ] Join workspace with invite code
- [ ] View workspace members
- [ ] Send friend request
- [ ] Accept friend request (via API or second user)
- [ ] Send direct message to friend
- [ ] Receive messages from friend
- [ ] Switch between workspaces
- [ ] Create group chat
- [ ] Send group message
- [ ] Logout

## Known Limitations (To Be Implemented)

1. **Unread Badges**
   - No per-conversation unread counters yet

2. **Typing Indicators**
   - WebSocket plumbing exists but UI not wired

3. **Read Receipts**
   - `readBy` stored but not surfaced in UI

4. **Notifications**
   - No push notifications
   - No unread message badges

5. **Mobile App**
   - Web-only, native apps not built yet
   - PWA support is configured

## Next Steps

### Immediate (Priority 1)
1. Add unread message badges
2. Implement typing indicators UI
3. Surface read receipts
4. Add message search
5. Add rate limiting

### Short Term (Priority 2)
1. Add message search
2. Implement typing indicators
3. Add message reactions
4. Create user profile pages
5. Add notification system

### Long Term (Priority 3)
1. Voice/video calling
2. Message encryption
3. Message scheduling
4. Analytics dashboard
5. Mobile app (React Native)

## Troubleshooting

### Can't see messages
- Check browser console for API errors
- Verify you're logged in (check localStorage for token)
- Ensure you're friends with the other user
- Check both users are in the same workspace

### Can't add friends
- Verify both users are in the same workspace
- Check that you haven't already sent a request
- Look for errors in Network tab

### Workspace not showing
- Verify you joined with valid invite code
- Check API response in Network tab
- Refresh the page

### Login issues
- Clear localStorage and cookies
- Check password requirements (8+ chars, uppercase, lowercase, number)
- Verify email format

## Performance Notes

- Chat list loads on workspace switch
- Messages load on conversation select
- Full message history loaded (consider pagination for production)
- No message caching yet (reloads on refresh)

## Security Notes

- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Passwords hashed with bcrypt
- All API routes require authentication
- Workspace membership verified for all operations
