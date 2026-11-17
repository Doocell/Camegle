import { useState, useEffect, useCallback, useMemo } from 'react';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';

const MAX_LENGTH = 300;

/**
 * Hook F6: useChatLog(roomId)
 * - Mengelola pesan obrolan teks selama sesi berlangsung
 * - Otomatis mereset daftar pesan saat roomId berganti / berakhir
 * - Mengembalikan { messages, chatLog, sendMessage } di mana chatLog berisi
 *   10 pesan terakhir untuk dipakai oleh fitur Report (F7).
 */
export function useChatLog(roomId) {
  const [messages, setMessages] = useState([]);

  // Bersihkan seluruh pesan setiap kali sesi (roomId) berganti
  useEffect(() => {
    setMessages([]);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    function onChatReceive(payload) {
      if (!payload || typeof payload.text !== 'string') return;
      const ts = typeof payload.ts === 'number' ? payload.ts : Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `${ts}-peer-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'peer',
          text: payload.text,
          ts,
        },
      ]);
    }

    socket.on(EVENTS.CHAT_RECEIVE, onChatReceive);
    return () => {
      socket.off(EVENTS.CHAT_RECEIVE, onChatReceive);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (rawText) => {
      if (!roomId || typeof rawText !== 'string') return;
      const cleaned = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
      if (!cleaned) return;

      const ts = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `${ts}-me-${Math.random().toString(36).slice(2, 7)}`,
          sender: 'me',
          text: cleaned,
          ts,
        },
      ]);

      socket.emit(EVENTS.CHAT_SEND, {
        roomId,
        text: cleaned,
      });
    },
    [roomId]
  );

  // 10 pesan terakhir untuk dikirim saat Report (F7)
  const chatLog = useMemo(() => {
    return messages.slice(-10).map(({ sender, text, ts }) => ({
      sender,
      text,
      ts,
    }));
  }, [messages]);

  return {
    messages,
    chatLog,
    sendMessage,
  };
}

export default useChatLog;
