
import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="hsl(var(--primary))" stroke="none" />
      <path d="M9 14.5V17" stroke="hsl(var(--primary-foreground))" />
      <path d="M12 9.5V17" stroke="hsl(var(--primary-foreground))" />
      <path d="M15 12.5V17" stroke="hsl(var(--primary-foreground))" />
      <path d="M9 12v-1a2.5 2.5 0 1 1 5 0v1" stroke="hsl(var(--primary-foreground))" />
      <path d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="hsl(var(--primary-foreground))" stroke="none" />
    </svg>
  );
};
