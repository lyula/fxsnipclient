import React, { useState, useEffect } from "react";
import { useDashboard } from "../../context/dashboard";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConversationList from "./ConversationList";
import ChatBox from "./ChatBox";

const Inbox = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations } = useDashboard();

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
      const user = conversations?.find(u => u.username === decodeURIComponent(chatParam));
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

  return (
    // Use flex-col on mobile, flex-row on desktop
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col lg:flex-row lg:relative lg:overflow-hidden">
      {/* Conversation List Panel */}
      <div
        className={
          `absolute inset-0 z-10 ${selectedUser ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} lg:static lg:opacity-100 lg:pointer-events-auto lg:relative lg:z-10 lg:flex-[1_1_0%] lg:h-full`
        }
        style={{
          width: '100%',
          maxWidth: '100%',
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Hide scrollbar only on mobile */}
        <div className="h-full w-full overflow-y-auto hide-scrollbar lg:overflow-y-auto lg:!scrollbar lg:!hide-scrollbar-none">
          <ConversationList selectedUser={selectedUser} onSelect={handleSelectUser} />
        </div>
      </div>
      {/* ChatBox Panel */}
      <div
        className={
          `absolute inset-0 z-20 ${selectedUser ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} lg:static lg:opacity-100 lg:pointer-events-auto lg:relative lg:z-20 lg:flex-[2_2_0%] lg:h-full`
        }
        style={{
          width: '100%',
          maxWidth: '100%',
          height: '100%',
        }}
      >
        {/* On desktop, always show ChatBox, but only show content if selectedUser */}
        <div className="h-full w-full">
          <ChatBox selectedUser={selectedUser} onBack={handleBack} myUserId={myUserId} token={token} />
        </div>
      </div>
    </div>
  );
};

export default Inbox;