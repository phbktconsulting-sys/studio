
import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      {...props}
    >
      <g transform="translate(50 50) scale(0.8)">
        <g transform="translate(-50 -50)">
          {/* Background circle */}
          <circle cx="50" cy="50" r="50" fill="hsl(var(--primary))" />
          
          {/* Abstract 'W' and arrow/graph shape */}
          <path
            d="M20 65 L35 40 L50 60 L65 30 L80 50"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
};
