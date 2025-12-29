
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
      <g transform="translate(50,50)">
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--chart-1))" transform="rotate(0)" />
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--chart-2))" transform="rotate(60)" />
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--chart-3))" transform="rotate(120)" />
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--chart-4))" transform="rotate(180)" />
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--primary))" transform="rotate(240)" />
        <path d="M0,0 L-50,0 A50,50 0 0,1 0,-50 Z" fill="hsl(var(--accent))" transform="rotate(300)" />
      </g>
    </svg>
  );
};
