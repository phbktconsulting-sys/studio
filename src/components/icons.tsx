import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g fill="hsl(var(--foreground))">
        {/* Farmer's Hat */}
        <path d="M 25,45
                 A 30 10 0 0 0 75,45
                 L 70,35
                 A 20 20 0 0 0 30,35 Z" />

        {/* Farmer's Head and Body */}
        <circle cx="50" cy="55" r="10" />
        <path d="M 35,65
                 L 35,85
                 L 65,85
                 L 65,65
                 A 15 15 0 0 0 35,65 Z" />

        {/* Plant/Sprout in Hand */}
        <path stroke="hsl(var(--background))" strokeWidth="3" d="M 60 75 C 65 70, 75 65, 80 55" />
        <path fill="hsl(var(--background))" d="M 80 55 C 75 60, 85 60, 80 55" />
      </g>
    </svg>
  );
};
