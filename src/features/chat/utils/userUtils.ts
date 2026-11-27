import type { ChatMessage, ChatRecipient } from '../types/chat';

export interface AuthenticatedUserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  allIdentifiers: string[];
}

/**
 * Extracts and normalizes authenticated user identity from localStorage,
 * with fallback decoding of JWT token payload to ensure persistent database UUID.
 */
export function getAuthenticatedUser(): AuthenticatedUserInfo {
  let id = '';
  let username = '';
  let email = '';
  let role = '';

  if (typeof window !== 'undefined' && window.localStorage) {
    id = localStorage.getItem('adminUserId') || '';
    username = localStorage.getItem('adminUsername') || '';
    email = localStorage.getItem('adminEmail') || '';
    role = localStorage.getItem('adminRole') || '';

    // If ID is not present or is an email/username, try to decode persistent sub (UUID) from JWT
    const token =
      localStorage.getItem('adminToken') ||
      localStorage.getItem('labClientToken') ||
      localStorage.getItem('clientPortalToken') ||
      localStorage.getItem('token');

    if (token && typeof token === 'string') {
      try {
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          );
          const payload = JSON.parse(jsonPayload);
          const tokenSub = payload.sub || payload.userId || payload.id;
          if (tokenSub) {
            id = String(tokenSub);
            // Cache in localStorage to ensure consistency across the session
            try {
              localStorage.setItem('adminUserId', String(tokenSub));
            } catch {
              // Ignore storage errors
            }
          }
          if (!role && payload.role) {
            role = String(payload.role);
          }
          if (!email && payload.email) {
            email = String(payload.email);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  const allIdentifiers = Array.from(
    new Set(
      [
        id,
        username,
        email,
        typeof window !== 'undefined' ? localStorage.getItem('adminUserId') : '',
        typeof window !== 'undefined' ? localStorage.getItem('adminUsername') : '',
        typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : '',
      ]
        .map((s) => String(s || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return {
    id: id || username || email,
    username,
    email,
    role,
    allIdentifiers,
  };
}

/**
 * Normalizes an identifier string (trims whitespace, converts to lowercase).
 */
export function normalizeId(id: unknown): string {
  if (id === null || id === undefined) return '';
  return String(id).trim().toLowerCase();
}

/**
 * Determines whether a given message was sent by the currently authenticated user (Outgoing)
 * or received from another participant (Incoming).
 *
 * Implements strict sender identification:
 * 1. Client-side optimistic messages (e.g. sender_id === 'me', temp IDs, status === 'PENDING')
 *    are identified as outgoing.
 * 2. Compares the persisted message sender ID (message.sender_id or message.senderId)
 *    strictly with the authenticated user's account ID.
 * 3. Consistent comparison method (normalized lowercase string comparison) across
 *    newly sent, fetched, socket, and historical messages.
 * 4. Does NOT determine direction using email, message content, recipient ID,
 *    array position, or role slot guessing.
 */
export function isMessageFromMe(
  message: ChatMessage | null | undefined,
  _recipient?: ChatRecipient | null,
  currentUserId?: string,
  _currentUserRole?: string,
): boolean {
  if (!message) return false;

  const sId = normalizeId(message.sender_id || message.senderId);
  if (!sId) return false;

  // 1. Optimistic / pending messages created locally in the client
  if (sId === 'me' || String(message.id || '').startsWith('temp-') || message.status === 'PENDING') {
    return true;
  }

  // 2. Identify the authenticated user's account ID
  const authUser = getAuthenticatedUser();
  const myId = normalizeId(currentUserId || authUser.id);

  if (myId && sId === myId) {
    return true;
  }

  // 3. Match against any linked account UUIDs for this authenticated session
  if (authUser.allIdentifiers && authUser.allIdentifiers.length > 0) {
    for (const id of authUser.allIdentifiers) {
      const normalizedAuthId = normalizeId(id);
      // Strictly UUID/account identifiers (exclude emails and empty strings)
      if (normalizedAuthId && !normalizedAuthId.includes('@') && normalizedAuthId === sId) {
        return true;
      }
    }
  }

  return false;
}
