import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & {height?: number, width?: number}) => {
  return (
    <img
      src="/company-logo.png"
      alt="Company Logo"
      height={props.height || 40}
      width={props.width || 40}
      className={className}
    />
  );
};
