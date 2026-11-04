import Image from 'next/image';

// The Lanka Women E-Market lotus logo (public/logo.png). Set the height with className, e.g. "h-16".
export default function Logo({ className = 'h-16', preload = false, priority = false, style, ...props }) {
  return (
    <Image
      src="/logo.png"
      alt="Lanka Women E-Market"
      width={388}
      height={360}
      priority={preload || priority}
      className={`w-auto max-w-full shrink-0 object-contain ${className}`}
      style={{ maxHeight: '100%', ...style }}
      {...props}
    />
  );
}
