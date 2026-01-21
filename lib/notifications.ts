// Push Notification Service
// Supports FCM (Firebase Cloud Messaging) for iOS, Android, and Web

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// FCM HTTP v1 API endpoint
const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send';

/**
 * Send push notification via FCM
 * Requires FCM_PROJECT_ID and FCM_SERVICE_ACCOUNT_KEY in environment
 */
export async function sendPushNotification(
  token: string,
  payload: PushNotificationPayload,
  env: { FCM_PROJECT_ID?: string; FCM_SERVER_KEY?: string }
): Promise<SendNotificationResult> {
  const { FCM_PROJECT_ID, FCM_SERVER_KEY } = env;

  if (!FCM_PROJECT_ID || !FCM_SERVER_KEY) {
    console.warn('FCM not configured, skipping push notification');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    // Using FCM legacy HTTP API for simplicity
    // In production, consider using FCM HTTP v1 API with service account
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: payload.sound || 'default',
          badge: payload.badge,
        },
        data: payload.data || {},
        priority: 'high',
        content_available: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM error:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();

    if (result.success === 1) {
      return { success: true, messageId: result.message_id };
    } else {
      return { success: false, error: result.results?.[0]?.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send notification to multiple devices
 */
export async function sendPushNotificationToMany(
  tokens: string[],
  payload: PushNotificationPayload,
  env: { FCM_PROJECT_ID?: string; FCM_SERVER_KEY?: string }
): Promise<SendNotificationResult[]> {
  const results = await Promise.all(
    tokens.map(token => sendPushNotification(token, payload, env))
  );
  return results;
}

/**
 * Create notification payload for new message
 */
export function createMessageNotificationPayload(
  senderName: string,
  messageContent: string,
  workspaceId: string,
  conversationType: 'direct' | 'group',
  conversationId: string,
  groupName?: string
): PushNotificationPayload {
  const title = conversationType === 'group' && groupName
    ? `${senderName} in ${groupName}`
    : senderName;

  // Truncate message content if too long
  const body = messageContent.length > 100
    ? messageContent.substring(0, 97) + '...'
    : messageContent;

  return {
    title,
    body,
    data: {
      type: 'message',
      workspaceId,
      conversationType,
      conversationId,
    },
    sound: 'default',
  };
}

/**
 * Create notification payload for friend request
 */
export function createFriendRequestNotificationPayload(
  senderName: string,
  workspaceId: string,
  requestId: string
): PushNotificationPayload {
  return {
    title: 'New Friend Request',
    body: `${senderName} sent you a friend request`,
    data: {
      type: 'friend_request',
      workspaceId,
      requestId,
    },
    sound: 'default',
  };
}

/**
 * Create notification payload for group invite
 */
export function createGroupInviteNotificationPayload(
  inviterName: string,
  groupName: string,
  workspaceId: string,
  groupId: string
): PushNotificationPayload {
  return {
    title: 'Group Invitation',
    body: `${inviterName} added you to ${groupName}`,
    data: {
      type: 'group_invite',
      workspaceId,
      groupId,
    },
    sound: 'default',
  };
}

/**
 * Notification types enum
 */
export const NotificationType = {
  MESSAGE: 'message',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  GROUP_INVITE: 'group_invite',
  SYSTEM: 'system',
} as const;

export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType];
