import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete,
  postRefs, currentUserId, currentUsername, currentUserVerified 
}) {
  return (
    <div className="w-full mx-auto overflow-hidden">
      <div className="bg-white dark:bg-gray-800 mx-0 rounded-b-xl shadow-sm border-l border-r border-b border-gray-200/50 dark:border-gray-700/50">
        {posts.filter(post => post && post._id).map((post, idx, arr) => (
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
            {idx !== arr.length - 1 && (
              <div className="">
                <hr className="border-t border-gray-100 dark:border-gray-700/50" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
