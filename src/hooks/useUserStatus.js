import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Usage: const { online, lastSeen, typing, emitTyping, emitStopTyping } = useUserStatus(userId, token)
export default function useUserStatus(targetUserId, token) {
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [typing, setTyping] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    // Listen for online/offline events
    socket.on("user-online", ({ userId }) => {
      if (userId === targetUserId) setOnline(true);
    });
    socket.on("user-offline", ({ userId }) => {
      if (userId === targetUserId) setOnline(false);
    });

    // Listen for typing events
    socket.on("typing", ({ fromUserId }) => {
      if (fromUserId === targetUserId) setTyping(true);
    });
    socket.on("stop-typing", ({ fromUserId }) => {
      if (fromUserId === targetUserId) setTyping(false);
    });

    // Fetch lastSeen from API on offline
    socket.on("user-offline", async ({ userId }) => {
      if (userId === targetUserId) {
        // Fetch lastSeen from API
        try {
          const res = await fetch(`/api/user/last-seen/${userId}`);
          const data = await res.json();
          setLastSeen(data.lastSeen);
        } catch {}
      }
    });

    // Initial fetch for lastSeen
    (async () => {
      try {
        const res = await fetch(`/api/user/last-seen/${targetUserId}`);
        const data = await res.json();
        setLastSeen(data.lastSeen);
      } catch {}
    })();

    return () => {
      socket.disconnect();
    };
  }, [targetUserId, token]);

  // Emit typing events
  const emitTyping = useCallback(() => {
    socketRef.current?.emit("typing", { toUserId: targetUserId });
  }, [targetUserId]);
  const emitStopTyping = useCallback(() => {
    socketRef.current?.emit("stop-typing", { toUserId: targetUserId });
  }, [targetUserId]);

  return { online, lastSeen, typing, emitTyping, emitStopTyping };
}
