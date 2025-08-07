import React from "react";

export default function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center justify-center ml-1 align-middle"
      title="Verified"
      style={{
        width: "18px",
        height: "18px",
        display: "inline-flex",
        verticalAlign: "middle",
        color: "inherit"
      }}
    >
      <img
        src="/blue-badge.png"
        alt="Verified badge"
        width={18}
        height={18}
        style={{ display: "block", color: "inherit" }}
        loading="lazy"
      />
    </span>
  );
}
