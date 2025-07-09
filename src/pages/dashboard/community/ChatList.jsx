import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete,
  postRefs, currentUserId, currentUsername, currentUserVerified 
}) {
  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {posts.filter(post => post && post._id).map((post, idx, arr) => (
        <React.Fragment key={post._id}>
          <div
            ref={el => postRefs && postRefs.current && (postRefs.current[post._id] = el)}
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
          {idx !== arr.length - 1 && (
            <hr className="my-0 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
