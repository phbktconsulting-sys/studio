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
        <path d="M12 2L6 8l6 6 6-6-6-6z" />
        <path d="M6 8l6 6v8l-6-6V8z" />
        <path d="M18 8l-6 6v8l6-6V8z" />
      </g>
    </svg>
  );
};
