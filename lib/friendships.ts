type AcceptedFriendshipIdentity = {
  workspaceId: string;
  senderId: string;
  receiverId: string;
};

export interface FriendshipNotificationData {
  type: 'friend_request' | 'friend_accepted';
  workspaceId: string;
  friendshipId: string;
  senderId: string;
  receiverId: string;
  requestId?: string;
  friendId?: string;
}

export function buildAcceptedFriendshipConversationStateMutations(
  friendship: AcceptedFriendshipIdentity
) {
  return [
    {
      workspaceId: friendship.workspaceId,
      userId: friendship.senderId,
      conversationType: 'direct' as const,
      conversationId: friendship.receiverId,
      markRead: true,
    },
    {
      workspaceId: friendship.workspaceId,
      userId: friendship.receiverId,
      conversationType: 'direct' as const,
      conversationId: friendship.senderId,
      markRead: true,
    },
  ];
}

export function buildFriendshipNotificationData(
  data: FriendshipNotificationData
): string {
  return JSON.stringify(data);
}
