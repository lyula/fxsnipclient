import React, { useState, useEffect } from "react";
import { useDashboard } from "../../context/dashboard";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConversationList from "./ConversationList";
import ChatBox from "./ChatBox";

const Inbox = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations } = useDashboard(); // <-- Move hook call to top level

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
      // Find the user in the conversation list by username
      const user = conversations?.find(u => u.username === decodeURIComponent(chatParam));
      if (user && (!selectedUser || selectedUser._id !== user._id)) {
        setSelectedUser(user);
      }
    } else if (selectedUser) {
      setSelectedUser(null);
    }
    // eslint-disable-next-line
  }, [searchParams, conversations]); // Add conversations as dependency

  // Handle selection from ConversationList
  const handleSelectUser = (user) => setSelectedUser(user);
  // Handle back from ChatBox
  const handleBack = () => setSelectedUser(null);

  return (
    <div className="h-full flex bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out">
      <div className={`${selectedUser ? "hidden lg:flex" : "flex"} flex-col w-full max-w-full lg:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out`}>
        <ConversationList selectedUser={selectedUser} onSelect={handleSelectUser} />
      </div>
      <ChatBox selectedUser={selectedUser} onBack={handleBack} myUserId={myUserId} token={token} />
    </div>
  );
};

export default Inbox;