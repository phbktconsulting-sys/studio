import type { SVGProps } from 'react';

export const LogoIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & { src?: string | null }) => {
  return (
    <img
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAOVBMVEX/zgD/0gD/xAD/vQD/1gD/twD/ugD/4gD/5AD/6AD/8QD/3gD/9QD/7AD/wwD/0AD/ywD/zgD+vQD+ugD+zADo26e9AAACZElEQVR4nO3d227bMBBFUfFJl7Zbss3O+1-sJdaEASkfs+T4WMSf8lEoiuN4HMdxHMdxHMdxnF/O+v7LqjJ7yT3O+l7LzN5nErhL3c38zL0eJ/A89zL3aR/uS+/zfeL93k/gce597vP+2S/cx30mJ/A892k/yfuY+/w+9/k+ye3cx/1eL3G/fT/3eT/L/X6vD/d1f99v8v7xW3weuY+f8x/+nXif++f5sS9xcS/38XP+y7+Jb/L/uV+4L+R+vjd/V4df4nLuv+R+vtdv8P3i4d6n8uP+y/1+P8lX/odv8h/uS7kfv6f7+Vd+l4f7Uq6X+/m+/M5/5T5+L/8kL/L+8e+x/P5J3M/35V35u/xW93f5+Td/l3/z/v7e/l7+y++Lf83391+L/zZ+v4f7Uq7v8ru/L+/LX3l/v7e/l//x9/o/v7e/y+v0b/5ev7e/l3/P99L7Xb7I+8f9/X19eH+/q+svsXAv9/V9+X1/z1+Ly/t6vo/3VXwfv9fL/X7/K/Hf/Hn8vr8v7/X9/lv+V+/h+/+ev8n9fv4+P8v1/f14f7+rv+x3u1+vv+dfy+/z7/F5f7+f93X+X1+Xv/H3+V35Xv/s/f6/vL/J/X3eL+br+39eL3eL+br+3/+/i/nL8vL+/v/f35V/5XV/f39f3/f5J3OevvT/L+/u9vb+/l7/P+/v7e/837vV7ufs/3+dfy3/w+v4/f5339fX5f3/f/fF+/D9/nfe1f8v1e/p3/x+/1eD+br+//1df31/k/r7/t3z/3OevvS/v6/t+v18v7+v7P8v7++v+fn/P9/f6fXw+f9/f8x/uS7lfy/v7+vv+tfy3vL+/t/f3+/f5/X6/f7+/d/f9fl+e/L+/z/v6/j//i/v7f/9f4Hnu9/v9fl/4ff7f+3v+z/Jc3t/r/X6/v+v5fX/f3+v/5X39/X+/v7+/v6+/p3f5XV/f7//v5f39e3v+b3eL+br+3/+/y/X+/vy/l++//yff6X89/f9f3/v7+v/9W/5ev/P833+1/L+//p3f8/29f/9f3u/u+w0c53V+lvfx/n+ev8v7+nv+L/8lX8n7uS/kfn6v3+d1/yRv8v7+vr/L6/L3/i//wff8Xv6d/8v5u/9/t8+f5fd7P9/f+vt/f63f5Xv/V+8+9f7+v7+v7P5+fv8v7+/v7/f69Xn9/f7+/v/+f5V3e3+v9fR/v7/v7+nv+b/k+/69/8/5+/8/r8vf++3/z/q+v7/+v43Ecxxm/AcX+SblP22gAAAAASUVORK5CYII="
      alt="PHBKT Group Logo"
      className={className}
      width={64}
      height={64}
      {...props}
    />
  );
};
