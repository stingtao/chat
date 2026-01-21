import type {
  DurableObjectState,
  DurableObjectStorage,
} from '@cloudflare/workers-types';
import type { WSMessage } from '../lib/types';

export class ChatRoom {
  private state: DurableObjectState;
  private sessions: Map<string, WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return new Response('Missing user context', { status: 400 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();
      this.sessions.set(userId, server);

      this.broadcast(
        {
          type: 'user_online',
          payload: { userId },
          timestamp: Date.now(),
        },
        userId
      );

      server.addEventListener('message', (event) => {
        this.handleClientMessage(userId, event.data);
      });

      const cleanup = () => {
        this.sessions.delete(userId);
        this.broadcast(
          {
            type: 'user_offline',
            payload: { userId },
            timestamp: Date.now(),
          },
          userId
        );
      };

      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST') {
      const payload = (await request.json()) as WSMessage;
      this.broadcast(payload);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private handleClientMessage(userId: string, raw: unknown) {
    if (typeof raw !== 'string') return;

    let message: WSMessage | null = null;
    try {
      message = JSON.parse(raw) as WSMessage;
    } catch {
      return;
    }

    if (!message?.type) return;
    if (message.type === 'new_message') return;

    const outgoing: WSMessage = {
      type: message.type,
      payload: {
        ...message.payload,
        senderId: userId,
      },
      timestamp: Date.now(),
    };

    this.broadcast(outgoing, userId);
  }

  private broadcast(message: WSMessage, excludeUserId?: string) {
    const payload = JSON.stringify(message);
    for (const [userId, socket] of this.sessions.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (socket.readyState !== WebSocket.OPEN) continue;
      socket.send(payload);
    }
  }
}

export default {
  fetch() {
    return new Response('ChatRoom worker');
  },
};
