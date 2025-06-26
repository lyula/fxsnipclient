import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getConversations, getConversation, sendMessage } from "../../utils/api";
import { jwtDecode } from "jwt-decode";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function Inbox(props) {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const chatUsername = query.get("chat");

  // All conversations in this session
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // When chatUsername is present, select or create that user
  useEffect(() => {
    if (chatUsername && users.length > 0) {
      let user = users.find(
        (u) => u.username && u.username.toLowerCase() === chatUsername.toLowerCase()
      );
      if (user) {
        setSelectedUser(user);
      }
    }
    if (!chatUsername) {
      setSelectedUser(null);
    }
  }, [chatUsername, users]);

  useEffect(() => {
    if (selectedUser) setMessages(Array.isArray(selectedUser.messages) ? selectedUser.messages : []);
  }, [selectedUser]);

  // Scroll to the latest message when messages or selectedUser change
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, selectedUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (input.trim() && selectedUser && selectedUser._id) {
      try {
        const newMsg = await sendMessage(selectedUser._id, input);
        if (newMsg && newMsg.text) {
          setMessages((prev) => [...prev, newMsg]);
          setInput("");
          setUsers((prev) => {
            const updatedUsers = prev.map((u) =>
              u._id === selectedUser._id
                ? {
                    ...u,
                    lastMessage: newMsg.text,
                    lastTime: new Date(newMsg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    lastTimestamp: new Date(newMsg.createdAt).getTime(), // Update timestamp
                  }
                : u
            );
            // Sort by lastTimestamp in descending order to ensure latest is at top
            return updatedUsers.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
          });
        } else {
          alert("Failed to send message.");
        }
      } catch (err) {
        alert("Network error. Please try again.");
      }
    }
  };

  // Debounced search for users from backend
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
          /\/auth$/,
          ""
        );
        const res = await fetch(`${API_BASE}/user/search?q=${encodeURIComponent(search)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.users || []).map((u) => ({
              _id: u._id,
              username: u.username,
              avatar: u.countryFlag
                ? u.countryFlag
                : "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.username),
              verified: u.verified || false,
            }))
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSearchResults([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  // Fetch conversations on mount
  useEffect(() => {
    getConversations().then((data) => {
      const sortedUsers = data
        .map((conv) => ({
          _id: conv.user._id,
          username: conv.user.username,
          avatar: conv.user.countryFlag
            ? conv.user.countryFlag
            : "https://ui-avatars.com/api/?name=" + encodeURIComponent(conv.user.username),
          lastMessage: conv.lastMessage?.text || "",
          lastTime: conv.lastMessage
            ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          lastTimestamp: conv.lastMessage
            ? new Date(conv.lastMessage.createdAt).getTime()
            : 0,
          unreadCount: conv.unreadCount || 0,
          verified: !!conv.user.verified, // <--- this is the badge flag
        }))
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      setUsers(sortedUsers);
    });
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      getConversation(selectedUser._id).then((msgs) => setMessages(msgs));
    }
  }, [selectedUser]);

  const token = localStorage.getItem("token");
  let myUserId = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      myUserId = decoded.id || decoded._id || decoded.userId || "";
    } catch (e) {
      myUserId = "";
    }
  }

  // Group messages by date for rendering
  function groupMessagesByDate(messages) {
    const groups = [];
    let lastDate = null;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt);
      const msgDay = msgDate.getDate();
      const msgMonth = msgDate.getMonth();
      const msgYear = msgDate.getFullYear();

      let label = "";
      if (
        msgDay === today.getDate() &&
        msgMonth === today.getMonth() &&
        msgYear === today.getFullYear()
      ) {
        label = "Today";
      } else if (
        msgDay === yesterday.getDate() &&
        msgMonth === yesterday.getMonth() &&
        msgYear === yesterday.getFullYear()
      ) {
        label = "Yesterday";
      } else {
        label = `${String(msgDay).padStart(2, "0")}/${String(msgMonth + 1).padStart(
          2,
          "0"
        )}/${String(msgYear).slice(-2)}`;
      }

      const dateKey = `${msgYear}-${msgMonth + 1}-${msgDay}`;
      if (!lastDate || lastDate !== dateKey) {
        groups.push({ type: "date", label });
        lastDate = dateKey;
      }

      const isFirstInGroup =
        index === 0 ||
        (messages[index - 1] && new Date(messages[index - 1].createdAt).getDate() !== msgDay);

      groups.push({
        type: "msg",
        msg,
        isFirstInGroup,
        originalIndex: index,
      });
    });
    return groups;
  }

  // Count conversations with unread messages
  useEffect(() => {
    const unreadConversations = users.filter((u) => u.unreadCount > 0).length;
    if (typeof props.setUnreadConversations === "function") {
      props.setUnreadConversations(unreadConversations);
    }
  }, [users]);

  // Helper function to truncate words
  function truncateWords(str, numWords = 4) {
    if (!str) return "";
    const words = str.split(" ");
    if (words.length <= numWords) return str;
    return words.slice(0, numWords).join(" ") + " ...";
  }

  // Keep selectedUser in sync with users array for latest verified status, etc.
  useEffect(() => {
    if (selectedUser && users.length > 0) {
      const updated = users.find(u => u._id === selectedUser._id);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  // If no user selected, show chat list or start messaging UI
  if (!selectedUser) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col h-screen bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
        {/* Search bar */}
        <div className="relative w-full max-w-xs mx-auto mt-4 mb-2">
          <input
            className="w-full rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search user to message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && searchResults.length > 0 && (
            <ul className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <li
                  key={user.username}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  onClick={() => {
                    // Prefer the user object from the conversation list if it exists
                    const fullUser = users.find(u => u._id === user._id) || user;
                    setSelectedUser(fullUser);
                    navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                  }}
                >
                  <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center">
                    {user.username}
                    {user.verified && <VerifiedBadge />}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {search && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded-lg shadow-lg mt-1 p-3 text-xs text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          )}
        </div>
        {/* Conversation list */}
        <div className="flex-1 px-0 py-0 bg-gray-50 dark:bg-gray-900 rounded-b-xl overflow-y-auto">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-lg">
              Start messaging
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user._id}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition relative"
                onClick={async () => {
                  const fullUser = users.find(u => u._id === user._id) || user;
                  setSelectedUser(fullUser);
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                  setUsers((prev) =>
                    prev.map((u) =>
                      u._id === user._id ? { ...u, unreadCount: 0 } : u
                    )
                  );
                }}
              >
                <div className="relative">
                  <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                </div>
                <div className="flex-1 text-left">
                  <div className={`text-gray-900 dark:text-white ${user.unreadCount > 0 ? "font-bold" : "font-normal"}`}>
                    {user.username}
                    {user.verified && <VerifiedBadge />}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      user.unreadCount > 0
                        ? "font-bold text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <span className="block sm:hidden">{truncateWords(user.lastMessage, 4)}</span>
                    <span className="hidden sm:block">{truncateWords(user.lastMessage, 8)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{user.lastTime}</div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // If user selected, show chat view
  if (selectedUser) {
    const groupedMessages = groupMessagesByDate(messages);
    return (
      <div className="w-full max-w-lg mx-auto h-screen flex flex-col bg-gray-50 dark:bg-gray-900 rounded-none sm:rounded-xl shadow p-0">
        {/* Sticky Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-30">
          <button
            onClick={() => {
              setSelectedUser(null);
              navigate("/dashboard/inbox");
            }}
            className="mr-2 text-blue-600 dark:text-blue-400 font-bold text-lg px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition"
          >
            ←
          </button>
          <img
            src={selectedUser.avatar}
            alt={selectedUser.username}
            className="w-10 h-10 rounded-full"
          />
          <span
            className="font-semibold text-[#1E3A8A] dark:text-[#a99d6b] flex items-center cursor-pointer hover:underline"
            onClick={() =>
              navigate(
                `/dashboard/community/user/${encodeURIComponent(selectedUser.username)}`,
                {
                  state: {
                    fromInbox: true,
                    chatUsername: selectedUser.username,
                  },
                }
              )
            }
            title="View public profile"
          >
            {selectedUser.username}
            {selectedUser.verified && <VerifiedBadge />}
          </span>
        </div>
        {/* Scrollable Messages */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto no-scrollbar px-4 py-3"
          >
            <style>
              {`
                .no-scrollbar {
                  scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            <div>
              {groupedMessages.map((item, idx) =>
                item.type === "date" ? (
                  <div
                    key={`date-${idx}`}
                    className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 my-4"
                  >
                    <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div
                    key={`msg-${idx}`}
                    className={`flex ${
                      item.msg.from === myUserId ? "justify-end" : "justify-start"
                    } ${item.isFirstInGroup ? "mt-4" : "mt-1"} mb-2 flex-col`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow-sm ${
                        item.msg.from === myUserId
                          ? "bg-blue-600 text-white rounded-br-none border border-blue-700"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-300 dark:border-gray-600"
                      } ${item.msg.from === myUserId ? "ml-auto" : "mr-auto"}`}
                    >
                      {item.msg.text}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1 text-[10px]">
                      <span className="text-gray-400">
                        {new Date(item.msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {/* Status badge for messages sent by me */}
                      {item.msg.from === myUserId && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-semibold
        ${
          item.msg.read
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700"
            : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
        }
      `}
                        >
                          {item.msg.read ? "Seen" : "Delivered"}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        {/* Message input form */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <input
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-full transition"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    );
  }

  // fallback (should never hit)
  return null;
}
