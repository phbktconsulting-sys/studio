import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & {height?: number, width?: number}) => {
  return (
    <svg
      width={props.width || 40}
      height={props.height || 40}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g fill="hsl(var(--primary))" stroke="hsl(var(--primary))">
        <path d="M12 2a2.83 2.83 0 0 1 2.2 4.4L12 8.6l-2.2-2.2A2.83 2.83 0 0 1 12 2z"/>
        <path d="M22 12a2.83 2.83 0 0 1-4.4 2.2L15.4 12l2.2-2.2A2.83 2.83 0 0 1 22 12z"/>
        <path d="M12 22a2.83 2.83 0 0 1-2.2-4.4L12 15.4l2.2 2.2A2.83 2.83 0 0 1 12 22z"/>
        <path d="M2 12a2.83 2.83 0 0 1 4.4-2.2L8.6 12l-2.2 2.2A2.83 2.83 0 0 1 2 12z"/>
      </g>
    </svg>
  );
};
