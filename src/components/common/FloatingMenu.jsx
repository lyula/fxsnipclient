import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

function FloatingMenu({ anchorRef, open, onClose, children, width = 192 }) {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      let left = rect.left + window.scrollX;
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      setStyle({
        position: "absolute",
        top: rect.bottom + 4 + window.scrollY,
        left,
        zIndex: 9999,
        width,
      });
    }
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    
    const handleClick = (e) => {
      // Don't close if clicking inside the menu
      if (menuRef.current && menuRef.current.contains(e.target)) {
        return;
      }
      
      // Don't close if clicking the anchor button
      if (anchorRef.current && anchorRef.current.contains(e.target)) {
        return;
      }
      
      onClose();
    };
    
    // Use a timeout to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  
  return createPortal(
    <div
      ref={menuRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl py-2"
      style={style}
      onClick={(e) => e.stopPropagation()} // Prevent event bubbling
    >
      {children}
    </div>,
    document.body
  );
}

export default FloatingMenu;