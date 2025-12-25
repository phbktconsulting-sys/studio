import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & {height?: number, width?: number}) => {
  return (
    <svg
      width={props.width || 40}
      height={props.height || 40}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g clipPath="url(#clip0_10_2)">
        <path d="M20 0C8.954 0 0 8.954 0 20C0 31.046 8.954 40 20 40C31.046 40 40 31.046 40 20C40 8.954 31.046 0 20 0Z" fill="hsl(var(--primary))"/>
        <path d="M12 12H18V18H12V12Z" fill="hsl(var(--primary-foreground))"/>
        <path d="M22 12H28V18H22V12Z" fill="hsl(var(--primary-foreground))" fillOpacity="0.7"/>
        <path d="M12 22H18V28H12V22Z" fill="hsl(var(--primary-foreground))" fillOpacity="0.7"/>
        <path d="M22 22H28V28H22V22Z" fill="hsl(var(--primary-foreground))"/>
      </g>
      <defs>
        <clipPath id="clip0_10_2">
          <rect width="40" height="40" rx="20" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
};
