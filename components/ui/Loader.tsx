import React from "react";

type LoaderProps = {
  className?: string;
  fullScreen?: boolean;
  label?: string;
};

export function Loader({
  className = "",
  fullScreen = false,
  label = "Loading",
}: LoaderProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`flex flex-col items-center justify-center select-none ${className}`}
    >
      <ul className="list-none p-0 m-0 flex flex-col items-center">
        <li className="flex items-center justify-center">
          <div className="collab-loader-track">
            <div className="collab-loader-child" />
          </div>
        </li>
        <li className="flex items-center justify-center">
          <div className="collab-loader-text" />
        </li>
      </ul>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/85 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}

export default Loader;

