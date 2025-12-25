import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Page background */}
      <path d="M10,5 H70 L90,25 V95 H10 Z" fill="#E0E0E0" stroke="#B0B0B0" strokeWidth="2" />
      {/* Page fold */}
      <path d="M70,5 L70,25 L90,25" fill="#B0B0B0" />
      
      {/* Stylized landscape inside the page */}
      {/* Sky area */}
      <path d="M20,70 Q40,50 60,55 T100,45 L80,85 H20 Z" fill="#a0d2eb" opacity="0.6" />
      
      {/* Green hills */}
      <path d="M15,85 Q35,65 55,75 T95,65 L85,90 H15 Z" fill="#77dd77" opacity="0.7" />
      <path d="M15,85 Q30,75 45,80 T75,75 L85,90 H15 Z" fill="#5cb85c" opacity="0.8" />

      {/* Sun/Moon */}
      <circle cx="70" cy="40" r="8" fill="#fdfd96" opacity="0.8" />
    </svg>
  );
};
