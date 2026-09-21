import React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export function Logo({
  size = 32,
  className = "",
  ...props
}: LogoProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="CollabSpace logo"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <rect x="0.5" y="0.5" width="63" height="63" rx="15" fill="#111319" stroke="#282a30" strokeWidth="1" />
      <rect x="13" y="14" width="19" height="19" rx="5" fill="#8083ff" />
      <rect x="32" y="31" width="19" height="19" rx="5" fill="#4edea3" />
      <path d="M28 25.5 H36 A6 6 0 0 1 42 31.5 V34.5" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export interface WordmarkProps extends React.SVGProps<SVGSVGElement> {
  withBackground?: boolean;
  className?: string;
}

export function Wordmark({
  withBackground = false,
  className = "",
  width = 360,
  height = 80,
  ...props
}: WordmarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 360 80"
      fill="none"
      role="img"
      aria-label="CollabSpace wordmark"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {withBackground && <rect width="360" height="80" fill="#111319" rx="8" />}
      <g transform="translate(8 8) scale(1.0)">
        <rect x="0.5" y="0.5" width="63" height="63" rx="15" fill="#111319" stroke="#282a30" strokeWidth="1" />
        <rect x="13" y="14" width="19" height="19" rx="5" fill="#8083ff" />
        <rect x="32" y="31" width="19" height="19" rx="5" fill="#4edea3" />
        <path d="M28 25.5 H36 A6 6 0 0 1 42 31.5 V34.5" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      </g>
      <text
        x="84"
        y="45"
        fill="#F8FAFC"
        fontFamily="Geist, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="30"
        fontWeight="600"
        letterSpacing="-0.5"
      >
        CollabSpace
      </text>
      <text
        x="85"
        y="63"
        fill="#94a3b8"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="9"
        fontWeight="500"
        letterSpacing="1.8"
      >
        WORK TOGETHER, IN CONTEXT
      </text>
    </svg>
  );
}
