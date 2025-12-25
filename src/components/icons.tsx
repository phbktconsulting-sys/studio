import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g stroke="currentColor" strokeWidth="6" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70,5 H20 a10,10 0 0 0 -10,10 v70 a10,10 0 0 0 10,10 h60 a10,10 0 0 0 10,-10 V30 Z" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="4" />
        <path d="M70,5 L70,30 L90,30" stroke="hsl(var(--foreground))" strokeWidth="4" fill="hsl(var(--muted))" />
        <path d="M30,50 h40" stroke="hsl(var(--primary))" strokeWidth="5" />
        <path d="M30,65 h40" stroke="hsl(var(--secondary-foreground))" strokeWidth="5" />
        <path d="M30,80 h20" stroke="hsl(var(--secondary-foreground))" strokeWidth="5" />
      </g>
    </svg>
  );
};
