import { io, Socket } from 'socket.io-client';

import type { ChatMessage, SendMessagePayload } from '../types/chat';

function getSocketUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  return 'http://localhost:4000';
}

class ChatSocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private activeConversationId: string | null = null;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  public connect(): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return null;
    }

    try {
      this.isConnecting = true;
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('adminToken') ||
            localStorage.getItem('labClientToken') ||
            localStorage.getItem('clientPortalToken')
          : null;

      const socketUrl = getSocketUrl();

      if (this.socket) {
        this.socket.disconnect();
        this.socket.removeAllListeners();
      }

      this.socket = io(socketUrl, {
        auth: {
          token: token || '',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        if (this.activeConversationId) {
          this.joinConversation(this.activeConversationId);
        }
        for (const [event, handlers] of this.eventHandlers.entries()) {
          for (const handler of handlers) {
            this.socket?.on(event, handler);
          }
        }
      });

      this.socket.on('disconnect', () => {
        // Disconnected
      });

      this.socket.on('connect_error', () => {
        // Connection error
      });

      this.isConnecting = false;
      return this.socket;
    } catch {
      this.isConnecting = false;
      return null;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.activeConversationId = null;
    this.isConnecting = false;
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public joinConversation(conversationId: string): void {
    this.activeConversationId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit('chat:join', { conversationId });
      this.socket.emit('CHAT_OPENED', { conversationId });
    } else {
      this.connect();
    }
  }

  public leaveConversation(conversationId: string): void {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    if (this.socket?.connected) {
      this.socket.emit('chat:leave', { conversationId });
      this.socket.emit('CHAT_CLOSED', { conversationId });
    }
  }

  public sendMessage(
    payload: SendMessagePayload,
    callback?: (res: { success: boolean; data?: ChatMessage; error?: string }) => void,
  ): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:send', payload, callback);
    } else if (callback) {
      callback({ success: false, error: 'Socket not connected' });
    }
  }

  public sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:typing', { conversationId, isTyping });
    }
  }

  public markAsRead(conversationId: string, messageIds: string[]): void {
    if (this.socket?.connected && messageIds.length > 0) {
      this.socket.emit('chat:read', { conversationId, messageIds });
    }
  }

  public on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  public off(event: string, handler: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, handler);
    }
  }
}

export const chatSocket = new ChatSocketService();

