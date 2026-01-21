// Desktop (Tauri) integration utilities
// These functions provide a bridge between the web app and Tauri desktop features

declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      event: {
        listen: (event: string, callback: (payload: unknown) => void) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
    };
  }
}

/**
 * Check if running inside Tauri desktop app
 */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

/**
 * Show desktop notification using Tauri
 */
export async function showDesktopNotification(
  title: string,
  body: string
): Promise<void> {
  if (!isDesktopApp()) {
    // Fallback to Web Notifications API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  try {
    await window.__TAURI__!.invoke('show_notification', { title, body });
  } catch (error) {
    console.error('Failed to show desktop notification:', error);
  }
}

/**
 * Get app version (desktop only)
 */
export async function getAppVersion(): Promise<string | null> {
  if (!isDesktopApp()) return null;

  try {
    const version = await window.__TAURI__!.invoke('get_app_version');
    return version as string;
  } catch (error) {
    console.error('Failed to get app version:', error);
    return null;
  }
}

/**
 * Listen for Tauri events
 */
export async function listenToEvent(
  event: string,
  callback: (payload: unknown) => void
): Promise<(() => void) | null> {
  if (!isDesktopApp()) return null;

  try {
    const unlisten = await window.__TAURI__!.event.listen(event, callback);
    return unlisten;
  } catch (error) {
    console.error('Failed to listen to event:', error);
    return null;
  }
}

/**
 * Emit Tauri event
 */
export async function emitEvent(
  event: string,
  payload?: unknown
): Promise<void> {
  if (!isDesktopApp()) return;

  try {
    await window.__TAURI__!.event.emit(event, payload);
  } catch (error) {
    console.error('Failed to emit event:', error);
  }
}

/**
 * Request notification permission for desktop/web
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isDesktopApp()) {
    // Tauri handles permissions automatically
    return true;
  }

  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Desktop-specific initialization
 */
export async function initializeDesktop(): Promise<void> {
  if (!isDesktopApp()) return;

  // Listen for app events from Tauri
  await listenToEvent('new-message', (payload) => {
    console.log('New message event from Tauri:', payload);
  });

  console.log('Desktop app initialized');
}
