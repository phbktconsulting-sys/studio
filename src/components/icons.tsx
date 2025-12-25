
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
          
          {/* Abstract 'P' forming a checkmark */}
          <path
            d="M30 50 C 30 25, 50 25, 50 25 L 50 75"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
           <path
            d="M50 55 L 75 30"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
};
