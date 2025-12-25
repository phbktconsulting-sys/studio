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
        <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(var(--chart-2))" transform="rotate(0)" />
        <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(var(--chart-5))" transform="rotate(90)" />
        <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(var(--primary))" transform="rotate(180)" />
        <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(var(--accent))" transform="rotate(270)" />
      </g>
    </svg>
  );
};
