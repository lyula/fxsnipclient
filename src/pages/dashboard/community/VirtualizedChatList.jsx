import React from "react";
import { FixedSizeList as List } from "react-window";
import ChatList from "./ChatList";

// This wrapper uses react-window to virtualize the feed for smooth scrolling
export default function VirtualizedChatList(props) {
  const itemCount = props.posts.length;
  const itemSize = 420; // Approximate height of each feed item (px)

  // Render a single row (post or ad)
  const Row = ({ index, style }) => (
    <div style={style}>
      <ChatList {...props} posts={[props.posts[index]]} />
    </div>
  );

  return (
    <List
      height={window.innerHeight - 120} // Adjust as needed for header/footer
      itemCount={itemCount}
      itemSize={itemSize}
      width={"100%"}
      overscanCount={4}
      style={{ willChange: "transform" }}
    >
      {Row}
    </List>
  );
}
