import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g fill="none" stroke="hsl(var(--foreground))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        {/* The 'P' shape */}
        <path d="M 30,75 V 25" />
        <path d="M 30,25 
                 C 30,25 65,25 65,50 
                 S 30,75 30,75" />
        {/* The Arrow */}
        <path d="M 55,40 L 75,50 L 55,60" />
      </g>
    </svg>
  );
};
