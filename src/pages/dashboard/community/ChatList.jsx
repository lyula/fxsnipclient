import React, { useState } from "react";
import ChatPost from "./ChatPost";
import ProfileSuggestions from "../../../components/ProfileSuggestions";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete,
  postRefs, currentUserId, currentUsername, currentUserVerified,
  currentUser // Add currentUser prop for profile suggestions
}) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  // Handle dismissing suggestion sections
  const handleDismissSuggestion = (index) => {
    setDismissedSuggestions(prev => new Set([...prev, index]));
  };

  // Create an array that includes posts and suggestion components
  const renderItems = () => {
    const items = [];
    
    posts.filter(post => post && post._id).forEach((post, idx) => {
      // Add the post
      items.push(
        <React.Fragment key={post._id}>
          <div
            ref={el => postRefs && postRefs.current && (postRefs.current[post._id] = el)}
            className="w-full py-2 overflow-hidden"
          >
            <ChatPost
              post={post}
              onReply={onReply}
              onComment={onComment}
              onLike={onLike}
              onView={onView}
              onDelete={onDelete}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              currentUserVerified={currentUserVerified}
            />
          </div>
          {idx !== posts.filter(post => post && post._id).length - 1 && (
            <div className="">
              <hr className="border-t border-gray-100 dark:border-gray-700/50" />
            </div>
          )}
        </React.Fragment>
      );

      // Add profile suggestions after every 5 posts (indices 4, 9, 14, etc.)
      if ((idx + 1) % 5 === 0 && currentUser && !dismissedSuggestions.has(idx)) {
        items.push(
          <React.Fragment key={`suggestions-${idx}`}>
            <div className="w-full overflow-hidden">
              <ProfileSuggestions
                currentUser={currentUser}
                onDismiss={() => handleDismissSuggestion(idx)}
                className="my-2"
              />
            </div>
            {idx !== posts.filter(post => post && post._id).length - 1 && (
              <div className="">
                <hr className="border-t border-gray-100 dark:border-gray-700/50" />
              </div>
            )}
          </React.Fragment>
        );
      }
    });

    return items;
  };

  return (
    <div className="w-full mx-auto overflow-hidden">
      <div className="bg-white dark:bg-gray-800 mx-0 rounded-b-xl shadow-sm border-l border-r border-b border-gray-200/50 dark:border-gray-700/50">
        {renderItems()}
      </div>
    </div>
  );
}
