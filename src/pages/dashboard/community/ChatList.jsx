import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ 
  posts, onReply, onComment, onLike, onView, onDelete, // Add onDelete here
  postRefs, currentUserId, currentUsername, currentUserVerified 
}) {
  return (
    <div className="space-y-6">
      {posts.filter(post => post && post._id).map(post => (
        <div
          ref={el => postRefs && postRefs.current && (postRefs.current[post._id] = el)}
          key={post._id}
        >
          <div className="w-full flex flex-col gap-2 p-2 rounded bg-white dark:bg-gray-900 shadow mb-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex-1">
                <ChatPost
                  key={post._id}
                  post={post}
                  onReply={onReply}
                  onComment={onComment}
                  onLike={onLike}
                  onView={onView}
                  onDelete={onDelete} // Add this line
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  currentUserVerified={currentUserVerified}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}