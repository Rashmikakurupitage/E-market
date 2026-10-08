import Image from 'next/image';

// The Lanka Women E-Market lotus logo (public/logo.png). Set the height with className, e.g. "h-16".
export default function Logo({ className = 'h-16', preload = false }) {
  return (
    <Image
      src="/logo.png"
      alt="Lanka Women E-Market"
      width={388}
      height={360}
      preload={preload}
      className={`w-auto ${className}`}
    />
  );
}
