import React from 'react';

interface LogoProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ width = 48, height = 48, className }) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{ width, height }}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
      />
    </svg>
  );
};

export default Logo;
