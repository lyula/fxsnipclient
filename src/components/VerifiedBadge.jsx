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
      <svg
        width="18"
        height="18"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", color: "inherit" }}
      >
        {/* Spiked/ridged circle */}
        <g>
          <circle cx="16" cy="16" r="13" fill="#009EF7" />
          {/* Create ridges using a star-like path */}
          <path
            d="M16 2
              L19.5 7.5
              L26 8.5
              L21 13.5
              L22.5 20
              L16 17
              L9.5 20
              L11 13.5
              L6 8.5
              L12.5 7.5
              Z"
            fill="#009EF7"
            stroke="#009EF7"
            strokeLinejoin="round"
          />
          {/* Add more ridges for a mechanical look */}
          <g>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) * (Math.PI / 180);
              const r1 = 15.5, r2 = 13;
              const x1 = 16 + r1 * Math.cos(angle);
              const y1 = 16 + r1 * Math.sin(angle);
              const x2 = 16 + r2 * Math.cos(angle);
              const y2 = 16 + r2 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#009EF7"
                  strokeWidth="2"
                />
              );
            })}
          </g>
          {/* Theme-adaptive checkmark: white on light, dark on dark */}
          <path
            d="M23 12.5L14.25 21.25L9 16"
            className="stroke-white dark:stroke-gray-900"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </span>
  );
}
