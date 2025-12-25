import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g stroke="hsl(var(--foreground))" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Mane */}
        <path d="M 50,15
                 L 60,25 75,25 80,35 85,50 80,65 75,75 60,75
                 L 50,85
                 L 40,75 25,75 20,65 15,50 20,35 25,25 40,25 Z" />
        {/* Face Outline */}
        <path d="M 50,30
                 C 40,30 35,40 35,50
                 C 35,65 40,70 50,70
                 C 60,70 65,65 65,50
                 C 65,40 60,30 50,30 Z" />
        {/* Eyes */}
        <circle cx="43" cy="48" r="2" fill="hsl(var(--foreground))" />
        <circle cx="57" cy="48" r="2" fill="hsl(var(--foreground))" />
        {/* Nose and Mouth */}
        <path d="M 50,55 L 50,65" />
        <path d="M 45,65 L 55,65" />
      </g>
    </svg>
  );
};
