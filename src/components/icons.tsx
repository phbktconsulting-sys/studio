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
        <path d="M12 2 L18 5 V 11 L12 14 L6 11 V 5 Z" fillOpacity="0.7" />
        <path d="M6 11 L6 17 L12 20 V 14 Z" fillOpacity="0.9" />
        <path d="M18 11 L18 17 L12 20 V 14 Z" fillOpacity="1.0" />
      </g>
    </svg>
  );
};
