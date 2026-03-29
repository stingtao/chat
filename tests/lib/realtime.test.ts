import { describe, expect, it, vi } from 'vitest';
import {
  broadcastToRoom,
  buildRoomName,
  buildWorkspaceRoomName,
} from '../../lib/realtime';

describe('lib/realtime', () => {
  it('builds stable direct room names regardless of participant order', () => {
    const first = buildRoomName({
      workspaceId: 'ws_1',
      type: 'direct',
      conversationId: 'user_b',
      userId: 'user_a',
    });
    const second = buildRoomName({
      workspaceId: 'ws_1',
      type: 'direct',
      conversationId: 'user_a',
      userId: 'user_b',
    });

    expect(first).toBe('workspace:ws_1:direct:user_a:user_b');
    expect(second).toBe(first);
  });

  it('builds group and workspace feed room names', () => {
    expect(
      buildRoomName({
        workspaceId: 'ws_2',
        type: 'group',
        conversationId: 'group_123',
      })
    ).toBe('workspace:ws_2:group:group_123');

    expect(buildWorkspaceRoomName('ws_2')).toBe('workspace:ws_2:feed');
  });

  it('throws when building a direct room without the current user id', () => {
    expect(() =>
      buildRoomName({
        workspaceId: 'ws_1',
        type: 'direct',
        conversationId: 'user_b',
      })
    ).toThrow('userId is required for direct rooms');
  });

  it('broadcasts to a provided durable object namespace', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const namespace = {
      idFromName: vi.fn().mockReturnValue('room-id'),
      get: vi.fn().mockReturnValue({
        fetch: fetchMock,
      }),
    };

    await broadcastToRoom({
      roomName: 'workspace:ws_1:feed',
      message: {
        type: 'user_online',
        payload: { userId: 'user_a' },
        timestamp: 123,
      },
      namespace: namespace as never,
    });

    expect(namespace.idFromName).toHaveBeenCalledWith('workspace:ws_1:feed');
    expect(namespace.get).toHaveBeenCalledWith('room-id');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://chat-room/broadcast');

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.method).toBe('POST');
    expect(requestInit.body).toBe(
      JSON.stringify({
        type: 'user_online',
        payload: { userId: 'user_a' },
        timestamp: 123,
      })
    );
  });
});
