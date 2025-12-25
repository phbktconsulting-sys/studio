import type { SVGProps } from 'react';
import Image from 'next/image';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & {height?: number, width?: number}) => {
  return (
    <Image
      src="/company-logo.png"
      alt="Company Logo"
      width={props.width || 40}
      height={props.height || 40}
      className={className}
      priority 
    />
  );
};
