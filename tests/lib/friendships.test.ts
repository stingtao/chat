import { describe, expect, it } from 'vitest';
import {
  buildAcceptedFriendshipConversationStateMutations,
  buildFriendshipNotificationData,
} from '../../lib/friendships';
import {
  createFriendAcceptedNotificationPayload,
  createFriendRequestNotificationPayload,
} from '../../lib/notifications';

describe('lib/friendships', () => {
  it('builds reciprocal direct conversation state seeds for accepted friendships', () => {
    const mutations = buildAcceptedFriendshipConversationStateMutations({
      workspaceId: 'ws_1',
      senderId: 'user_a',
      receiverId: 'user_b',
    });

    expect(mutations).toEqual([
      {
        workspaceId: 'ws_1',
        userId: 'user_a',
        conversationType: 'direct',
        conversationId: 'user_b',
        markRead: true,
      },
      {
        workspaceId: 'ws_1',
        userId: 'user_b',
        conversationType: 'direct',
        conversationId: 'user_a',
        markRead: true,
      },
    ]);
  });

  it('serializes friendship notification data with stable participant ids', () => {
    const serialized = buildFriendshipNotificationData({
      type: 'friend_request',
      workspaceId: 'ws_1',
      friendshipId: 'friendship_1',
      senderId: 'user_a',
      receiverId: 'user_b',
      requestId: 'friendship_1',
    });

    expect(JSON.parse(serialized)).toEqual({
      type: 'friend_request',
      workspaceId: 'ws_1',
      friendshipId: 'friendship_1',
      senderId: 'user_a',
      receiverId: 'user_b',
      requestId: 'friendship_1',
    });
  });

  it('builds friend request and acceptance push payloads', () => {
    expect(
      createFriendRequestNotificationPayload('Alice', 'ws_1', 'friendship_1')
    ).toEqual({
      title: 'New Friend Request',
      body: 'Alice sent you a friend request',
      data: {
        type: 'friend_request',
        workspaceId: 'ws_1',
        requestId: 'friendship_1',
        friendshipId: 'friendship_1',
      },
      sound: 'default',
    });

    expect(
      createFriendAcceptedNotificationPayload(
        'Bob',
        'ws_1',
        'friendship_1',
        'user_b'
      )
    ).toEqual({
      title: 'Friend Request Accepted',
      body: 'Bob accepted your friend request',
      data: {
        type: 'friend_accepted',
        workspaceId: 'ws_1',
        friendshipId: 'friendship_1',
        friendId: 'user_b',
      },
      sound: 'default',
    });
  });
});
