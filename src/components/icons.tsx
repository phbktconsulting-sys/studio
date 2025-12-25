
import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      {...props}
    >
      <g transform="translate(50 50) scale(0.8)">
        <g transform="translate(-50 -50)">
          <path
            d="M50,5A45,45,0,1,1,5,50,45,45,0,0,1,50,5m0-5A50,50,0,1,0,100,50,50,50,0,0,0,50,0Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M55.2,64.18,39.69,50,55.2,35.82,50,31,31,50,50,69.18Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M69,50,50,31,44.8,35.82,60.31,50,44.8,64.18,50,69.18Z"
            fill="hsl(var(--primary))"
          />
        </g>
      </g>
    </svg>
  );
};
