/**
 * Chat Service
 *
 * Handles database operations for chat messages between team members.
 */

import pool from '../lib/db';

export interface ChatMessage {
  id: number;
  sender_email: string;
  receiver_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

function mapChatMessageRow(row: any): ChatMessage {
  // Convert PostgreSQL timestamp to UTC ISO string
  // Since we're storing timestamps as UTC and retrieving as timestamptz,
  // we need to ensure they're treated as UTC when converting to ISO
  const formatTimestamp = (ts: any): string => {
    if (!ts) return '';
    
    // If it's already a Date object from pg library, it might be in local timezone
    // We need to get the UTC representation
    if (ts instanceof Date) {
      // Date object from pg library - ensure we get UTC representation
      // toISOString() always returns UTC, so this is correct
      return ts.toISOString();
    }
    
    // If it's a string from PostgreSQL, it might not have timezone info
    // We need to treat it as UTC. PostgreSQL returns timestamps in ISO-like format
    // but without timezone indicator, so we'll parse it and convert to UTC ISO
    let date: Date;
    
    if (typeof ts === 'string') {
      // If the string already has 'Z' or timezone, use it directly
      if (ts.endsWith('Z') || ts.includes('+') || ts.includes('-', ts.indexOf('T') + 1)) {
        date = new Date(ts);
      } else {
        // If no timezone indicator, treat as UTC by appending 'Z'
        // This is critical - timestamps from PostgreSQL timestamptz are in UTC
        date = new Date(ts + 'Z');
      }
    } else {
      date = new Date(ts);
    }
    
    // Convert to UTC ISO string (always ends with 'Z')
    return date.toISOString();
  };

  return {
    id: row.id,
    sender_email: row.sender_email,
    receiver_email: row.receiver_email,
    message: row.message,
    is_read: row.is_read,
    created_at: formatTimestamp(row.created_at),
    read_at: row.read_at ? formatTimestamp(row.read_at) : null,
  };
}

/**
 * Create a new chat message
 */
export async function createChatMessage(data: {
  senderEmail: string;
  receiverEmail: string;
  message: string;
}): Promise<ChatMessage> {
  // Store timestamp as UTC explicitly using JavaScript UTC time
  // This ensures consistent timezone handling
  const nowUTC = new Date().toISOString();
  const query = `
    INSERT INTO chat_messages (sender_email, receiver_email, message, created_at)
    VALUES ($1, $2, $3, ($4::timestamptz AT TIME ZONE 'UTC')::timestamp)
    RETURNING *
  `;

  const values = [data.senderEmail, data.receiverEmail, data.message, nowUTC];

  const result = await pool.query(query, values);
  return mapChatMessageRow(result.rows[0]);
}

/**
 * Get conversation between two users
 * Returns messages in both directions (sent and received)
 */
export async function getConversation(
  userEmail1: string,
  userEmail2: string
): Promise<ChatMessage[]> {
  // Explicitly convert timestamps to UTC when retrieving
  // This ensures we get UTC timestamps regardless of server timezone
  const query = `
    SELECT 
      id,
      sender_email,
      receiver_email,
      message,
      is_read,
      (created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      CASE 
        WHEN read_at IS NOT NULL THEN (read_at AT TIME ZONE 'UTC')::timestamptz
        ELSE NULL
      END as read_at
    FROM chat_messages
    WHERE (sender_email = $1 AND receiver_email = $2)
       OR (sender_email = $2 AND receiver_email = $1)
    ORDER BY created_at ASC
  `;

  const result = await pool.query(query, [userEmail1, userEmail2]);
  return result.rows.map(mapChatMessageRow);
}

/**
 * Get all conversations for a user (list of users they've chatted with)
 */
export async function getUserConversations(userEmail: string): Promise<{
  otherUserEmail: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}[]> {
  // Get all unique conversation partners
  const partnersQuery = `
    SELECT DISTINCT
      CASE 
        WHEN sender_email = $1 THEN receiver_email
        ELSE sender_email
      END AS other_user_email
    FROM chat_messages
    WHERE sender_email = $1 OR receiver_email = $1
  `;

  const partnersResult = await pool.query(partnersQuery, [userEmail]);
  const partners = partnersResult.rows.map(row => row.other_user_email);

  // For each partner, get the last message and unread count
  const conversations = await Promise.all(
    partners.map(async (otherUserEmail) => {
      // Get last message
      const lastMessageQuery = `
        SELECT *
        FROM chat_messages
        WHERE (sender_email = $1 AND receiver_email = $2)
           OR (sender_email = $2 AND receiver_email = $1)
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const lastMessageResult = await pool.query(lastMessageQuery, [userEmail, otherUserEmail]);
      const lastMessage = lastMessageResult.rows[0] 
        ? mapChatMessageRow(lastMessageResult.rows[0])
        : null;

      // Get unread count
      const unreadQuery = `
        SELECT COUNT(*) as count
        FROM chat_messages
        WHERE receiver_email = $1 AND sender_email = $2 AND is_read = false
      `;
      const unreadResult = await pool.query(unreadQuery, [userEmail, otherUserEmail]);
      const unreadCount = parseInt(unreadResult.rows[0].count, 10);

      return {
        otherUserEmail,
        lastMessage,
        unreadCount,
      };
    })
  );

  // Sort by last message timestamp (most recent first)
  return conversations.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
  });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  userEmail: string,
  senderEmail: string
): Promise<void> {
  // Use UTC timestamp for consistency
  const query = `
    UPDATE chat_messages
    SET is_read = true, read_at = (NOW() AT TIME ZONE 'UTC')
    WHERE receiver_email = $1 
      AND sender_email = $2 
      AND is_read = false
  `;

  await pool.query(query, [userEmail, senderEmail]);
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userEmail: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM chat_messages
    WHERE receiver_email = $1 AND is_read = false
  `;

  const result = await pool.query(query, [userEmail]);
  return parseInt(result.rows[0].count, 10);
}

