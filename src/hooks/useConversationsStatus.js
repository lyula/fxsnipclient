import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useConversationsStatus(conversations, myUserId, token) {
  const [statusMap, setStatusMap] = useState({}); // { userId: { online, typing } }
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    // Online/offline events
    socket.on("user-online", ({ userId }) => {
      setStatusMap((prev) => ({ ...prev, [userId]: { ...prev[userId], online: true } }));
    });
    socket.on("user-offline", ({ userId }) => {
      setStatusMap((prev) => ({ ...prev, [userId]: { ...prev[userId], online: false, typing: false } }));
    });

    // Typing events
    socket.on("typing", ({ fromUserId }) => {
      setStatusMap((prev) => ({ ...prev, [fromUserId]: { ...prev[fromUserId], typing: true } }));
    });
    socket.on("stop-typing", ({ fromUserId }) => {
      setStatusMap((prev) => ({ ...prev, [fromUserId]: { ...prev[fromUserId], typing: false } }));
    });

    // Mark all as offline on disconnect
    socket.on("disconnect", () => {
      setStatusMap({});
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Optionally, initialize all users as offline
  useEffect(() => {
    if (!conversations) return;
    setStatusMap((prev) => {
      const map = { ...prev };
      conversations.forEach((u) => {
        if (!map[u._id]) map[u._id] = { online: false, typing: false };
      });
      return map;
    });
  }, [conversations]);

  // Helper to emit typing
  const emitTyping = (toUserId) => {
    socketRef.current?.emit("typing", { toUserId });
  };
  const emitStopTyping = (toUserId) => {
    socketRef.current?.emit("stop-typing", { toUserId });
  };

  return { statusMap, emitTyping, emitStopTyping };
}
