import React, { useState, useEffect } from "react";
import { useDashboard } from "../../context/dashboard";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConversationList from "./ConversationList";
import ChatBox from "./ChatBox";

const Inbox = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations, setConversations, getConversationId } = useDashboard();

  // Responsive state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get user ID from token
  const token = localStorage.getItem("token");
  let myUserId = "";
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      myUserId = decoded.id || decoded._id || decoded.userId || "";
    } catch (e) {
      myUserId = "";
    }
  }

  // Sync selectedUser with URL param
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam) {
      const decodedUsername = decodeURIComponent(chatParam);
      // Try to find a real user object in conversations (with _id)
      // Try to get the real user object from navigation state (adUser from AdCard)
      let adUser = null;
      if (window.history.state && window.history.state.usr && window.history.state.usr.adUser) {
        adUser = window.history.state.usr.adUser;
      }
      // Prefer real user from conversations (with valid _id)
      let user = conversations?.find(u => u.username === decodedUsername && u._id && u._id.length >= 12);
      if (!user && adUser && adUser._id && adUser.username === decodedUsername) {
        // Not in conversations yet, but adUser is available
        user = {
          _id: adUser._id,
          username: adUser.username,
          avatar: adUser.profile?.profileImage || adUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(decodedUsername)}`,
          verified: adUser.verified || adUser.profile?.verified || false,
          lastMessage: '',
          lastTime: '',
          lastTimestamp: Date.now(),
          unreadCount: 0
        };
        setConversations(prev => [user, ...prev]);
      } else if (!user) {
        // Fallback: use any conversation with this username
        let fallbackUser = conversations?.find(u => u.username === decodedUsername);
        user = {
          _id: fallbackUser?._id || getConversationId(myUserId, decodedUsername),
          username: decodedUsername,
          avatar: fallbackUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(decodedUsername)}`,
          verified: fallbackUser?.verified || fallbackUser?.profile?.verified || false,
          lastMessage: '',
          lastTime: '',
          lastTimestamp: Date.now(),
          unreadCount: 0
        };
        setConversations(prev => [user, ...prev]);
      }
      if (user && (!selectedUser || selectedUser._id !== user._id)) {
        setSelectedUser(user);
      }
    } else if (selectedUser) {
      setSelectedUser(null);
    }
    // eslint-disable-next-line
  }, [searchParams, conversations]);

  // Handle selection from ConversationList
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    if (user) {
      navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
    } else {
      navigate("/dashboard/inbox");
    }
  };
  // Handle back from ChatBox
  const handleBack = () => {
    setSelectedUser(null);
    navigate("/dashboard/inbox");
  };

  // On mobile: show only one panel at a time
  if (isMobile) {
    if (selectedUser) {
      return (
        <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
          <ChatBox selectedUser={selectedUser} onBack={handleBack} myUserId={myUserId} token={token} />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
          <ConversationList selectedUser={selectedUser} onSelect={handleSelectUser} />
        </div>
      );
    }
  }

  // On desktop: show both panels
  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col lg:flex-row lg:relative lg:overflow-hidden">
      {/* Conversation List Panel */}
      <div className="w-full lg:w-1/3 h-full min-h-0 overflow-auto hide-desktop-scrollbar">
        <div className="h-full w-full">
          <ConversationList selectedUser={selectedUser} onSelect={handleSelectUser} />
        </div>
      </div>
      {/* ChatBox Panel */}
      <div className="w-full lg:w-2/3 h-full min-h-0 overflow-auto hide-desktop-scrollbar">
        <div className="h-full w-full flex flex-col">
          <ChatBox selectedUser={selectedUser} onBack={handleBack} myUserId={myUserId} token={token} />
        </div>
      </div>
    </div>
  );
};

export default Inbox;