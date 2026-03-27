import type {
  D1Database,
  DurableObjectState,
} from '@cloudflare/workers-types';
import type { WSMessage } from '../lib/types';

interface Env {
  DB?: D1Database;
}

interface SessionEntry {
  socket: WebSocket;
  userId: string;
  userType: 'client' | 'host';
  sessionVersion: number;
}

export class ChatRoom {
  private env: Env;
  private state: DurableObjectState;
  private sessions: Map<string, Set<SessionEntry>>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const userId = request.headers.get('x-user-id');
      const userType = parseUserType(request.headers.get('x-user-type'));
      const sessionVersion = parseSessionVersion(request.headers.get('x-session-version'));
      const allowedClientEvents = parseAllowedClientEvents(
        request.headers.get('x-allowed-client-events')
      );
      if (!userId || !userType || sessionVersion === null) {
        return new Response('Missing user context', { status: 400 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const sessionEntry: SessionEntry = {
        socket: server,
        userId,
        userType,
        sessionVersion,
      };

      server.accept();
      const existingSessions = this.sessions.get(userId);
      const nextSessions = existingSessions || new Set<SessionEntry>();
      const wasOffline = nextSessions.size === 0;
      nextSessions.add(sessionEntry);
      this.sessions.set(userId, nextSessions);

      if (wasOffline) {
        void this.broadcast(
          {
            type: 'user_online',
            payload: { userId },
            timestamp: Date.now(),
          },
          userId
        );
      }

      server.addEventListener('message', (event) => {
        void this.handleClientMessage(sessionEntry, event.data, allowedClientEvents);
      });

      const cleanup = () => {
        this.removeSession(sessionEntry);
      };

      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST') {
      const payload = (await request.json()) as WSMessage;
      await this.broadcast(payload);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleClientMessage(
    sessionEntry: SessionEntry,
    raw: unknown,
    allowedClientEvents: Set<'typing_start' | 'typing_stop'>
  ): Promise<void> {
    if (typeof raw !== 'string') return;

    await this.pruneInvalidSessions();
    if (!this.hasSessionEntry(sessionEntry)) {
      return;
    }

    let message: WSMessage | null = null;
    try {
      message = JSON.parse(raw) as WSMessage;
    } catch {
      return;
    }

    if (!message?.type) return;
    if (!isAllowedTypingEvent(message.type, allowedClientEvents)) return;

    const outgoing: WSMessage = {
      type: message.type,
      payload: { senderId: sessionEntry.userId },
      timestamp: Date.now(),
    };

    await this.broadcast(outgoing, sessionEntry.userId);
  }

  private async broadcast(message: WSMessage, excludeUserId?: string): Promise<void> {
    await this.pruneInvalidSessions();

    const payload = JSON.stringify(message);
    for (const [userId, sockets] of this.sessions.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      for (const sessionEntry of sockets) {
        if (sessionEntry.socket.readyState !== WebSocket.OPEN) continue;
        sessionEntry.socket.send(payload);
      }
    }
  }

  private hasSessionEntry(targetEntry: SessionEntry): boolean {
    const userSessions = this.sessions.get(targetEntry.userId);
    return Boolean(userSessions?.has(targetEntry));
  }

  private removeSession(targetEntry: SessionEntry) {
    const userSessions = this.sessions.get(targetEntry.userId);
    if (!userSessions) {
      return;
    }

    userSessions.delete(targetEntry);
    if (userSessions.size > 0) {
      return;
    }

    this.sessions.delete(targetEntry.userId);
    void this.broadcast(
      {
        type: 'user_offline',
        payload: { userId: targetEntry.userId },
        timestamp: Date.now(),
      },
      targetEntry.userId
    );
  }

  private closeSession(targetEntry: SessionEntry, code: number, reason: string) {
    try {
      if (
        targetEntry.socket.readyState === WebSocket.OPEN ||
        targetEntry.socket.readyState === WebSocket.CLOSING
      ) {
        targetEntry.socket.close(code, reason);
      }
    } catch {
      // Ignore websocket close errors; cleanup still removes the session entry.
    }

    this.removeSession(targetEntry);
  }

  private async pruneInvalidSessions(): Promise<void> {
    if (!this.env.DB || this.sessions.size === 0) {
      return;
    }

    const sessionKeys = new Map<string, SessionEntry>();
    for (const sessionEntries of this.sessions.values()) {
      for (const sessionEntry of sessionEntries) {
        sessionKeys.set(
          `${sessionEntry.userType}:${sessionEntry.userId}:${sessionEntry.sessionVersion}`,
          sessionEntry
        );
      }
    }

    const validationResults = await Promise.all(
      Array.from(sessionKeys.entries()).map(async ([sessionKey, sessionEntry]) => [
        sessionKey,
        await this.validateSession(sessionEntry),
      ] as const)
    );
    const invalidSessionKeys = new Set(
      validationResults
        .filter(([, isValid]) => !isValid)
        .map(([sessionKey]) => sessionKey)
    );

    if (invalidSessionKeys.size === 0) {
      return;
    }

    for (const sessionEntries of this.sessions.values()) {
      for (const sessionEntry of Array.from(sessionEntries)) {
        const sessionKey =
          `${sessionEntry.userType}:${sessionEntry.userId}:${sessionEntry.sessionVersion}`;
        if (!invalidSessionKeys.has(sessionKey)) {
          continue;
        }

        this.closeSession(sessionEntry, 1008, 'Session expired');
      }
    }
  }

  private async validateSession(sessionEntry: SessionEntry): Promise<boolean> {
    if (!this.env.DB) {
      return true;
    }

    const tableName = sessionEntry.userType === 'client' ? '"User"' : '"Host"';
    const result = await this.env.DB
      .prepare(
        `SELECT "sessionVersion" FROM ${tableName} WHERE "id" = ? LIMIT 1`
      )
      .bind(sessionEntry.userId)
      .first<{ sessionVersion: number }>();

    return result?.sessionVersion === sessionEntry.sessionVersion;
  }
}

function parseAllowedClientEvents(
  raw: string | null
): Set<'typing_start' | 'typing_stop'> {
  const allowed = new Set<'typing_start' | 'typing_stop'>();

  if (!raw) {
    return allowed;
  }

  for (const event of raw.split(',')) {
    if (event === 'typing_start' || event === 'typing_stop') {
      allowed.add(event);
    }
  }

  return allowed;
}

function parseUserType(raw: string | null): 'client' | 'host' | null {
  return raw === 'client' || raw === 'host' ? raw : null;
}

function parseSessionVersion(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isAllowedTypingEvent(
  type: WSMessage['type'],
  allowedClientEvents: Set<'typing_start' | 'typing_stop'>
): type is 'typing_start' | 'typing_stop' {
  return type === 'typing_start'
    ? allowedClientEvents.has('typing_start')
    : type === 'typing_stop'
    ? allowedClientEvents.has('typing_stop')
    : false;
}

export default {
  fetch() {
    return new Response('ChatRoom worker');
  },
};
