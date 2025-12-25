
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
          <circle cx="50" cy="50" r="50" fill="black" />

          {/* Abstract 'P' as a workflow arrow */}
          <path
            d="M35 25 V 75 H 50"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M50 50 C 70 50, 70 35, 50 35"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
           <path
            d="M50 35 L 45 40 M50 35 L 55 40"
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
