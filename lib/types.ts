// Auth types
export interface HostUser {
  id: string;
  email: string;
  name: string;
}

export interface ClientUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  lastSeenAt?: Date | string;
}

export interface AuthToken {
  token: string;
  user: HostUser | ClientUser;
  type: 'host' | 'client';
}

// Workspace types
export interface Workspace {
  id: string;
  hostId: string;
  name: string;
  slug: string;
  inviteCode: string;
  settings?: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  welcomeMessage?: string;
  allowGroupChat: boolean;
  maxGroupSize: number;
}

// Message types
export interface Message {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  groupId?: string;
  receiverId?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Group types
export interface Group {
  id: string;
  workspaceId: string;
  name: string;
  avatar?: string;
  createdById: string;
  memberCount?: number;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

// Friend types
export interface Friendship {
  id: string;
  workspaceId: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  friend?: ClientUser;
  sender?: ClientUser;
  receiver?: ClientUser;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace member types
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  memberTag: string; // Unique tag within workspace (e.g., "1234" for username#1234)
  role: 'member' | 'admin';
  user?: ClientUser;
  joinedAt: Date;
  lastSeenAt: Date;
}

// Spam report types
export interface SpamReport {
  id: string;
  workspaceId: string;
  reporterId: string;
  messageId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reporter?: ClientUser;
  createdAt: Date;
  updatedAt: Date;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// WebSocket message types
export type WSMessageType =
  | 'new_message'
  | 'message_read'
  | 'user_online'
  | 'user_offline'
  | 'typing_start'
  | 'typing_stop'
  | 'friend_request'
  | 'friend_accepted';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: number;
}
