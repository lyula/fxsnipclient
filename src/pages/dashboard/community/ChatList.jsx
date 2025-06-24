import React from "react";
import ChatPost from "./ChatPost";

export default function ChatList({ posts, onReply, onComment, onLike, onView }) {
    return (
        <div className="space-y-6">
            {posts.map(post => (
                <ChatPost
                    key={post.id}
                    post={post}
                    onReply={onReply}
                    onComment={onComment}
                    onLike={onLike}
                    onView={onView}
                />
            ))}
        </div>
    );
}