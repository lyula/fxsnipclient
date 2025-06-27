import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ posts, onReply, onComment, onLike, onView, postRefs }) {
  return (
    <div className="space-y-6">
      {posts.map(post => (
        <div ref={el => postRefs && postRefs.current && (postRefs.current[post._id] = el)} key={post._id || post.id}>
          <ChatPost
            post={post}
            onReply={onReply}
            onComment={onComment}
            onLike={onLike}
            onView={onView}
          />
        </div>
      ))}
    </div>
  );
}