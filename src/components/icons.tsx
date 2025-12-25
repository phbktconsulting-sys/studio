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
        {/* Stylized Phoenix */}
        <path d="M 50,20 
                 C 70,30 80,50 80,60 
                 C 80,80 65,90 50,85 
                 C 35,90 20,80 20,60 
                 C 20,50 30,30 50,20 Z" fill="none" stroke="hsl(var(--foreground))" strokeWidth="5"/>
        <path d="M 50,45
                 C 60,50 65,60 65,70" fill="none" stroke="hsl(var(--foreground))" strokeWidth="5" />
        <path d="M 50,45
                 C 40,50 35,60 35,70" fill="none" stroke="hsl(var(--foreground))" strokeWidth="5" />
        <path d="M 40,25 
                 A 10 10 0 0 1 60,25" fill="none" stroke="hsl(var(--foreground))" strokeWidth="5" />
      </g>
    </svg>
  );
};
