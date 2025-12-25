import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & {height?: number, width?: number}) => {
  return (
    <svg
      width={props.width || 40}
      height={props.height || 40}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g transform="translate(50,50) rotate(45)">
        <path d="M0,-45 A45,45 0 0,1 45,0 L0,0 Z" fill="hsl(var(--primary))" opacity="0.8" />
        <path d="M45,0 A45,45 0 0,1 0,45 L0,0 Z" fill="hsl(var(--accent))" opacity="0.8" />
        <path d="M0,45 A45,45 0 0,1 -45,0 L0,0 Z" fill="hsl(var(--chart-2))" opacity="0.8" />
        <path d="M-45,0 A45,45 0 0,1 0,-45 L0,0 Z" fill="hsl(var(--chart-5))" opacity="0.8" />
      </g>
    </svg>
  );
};
