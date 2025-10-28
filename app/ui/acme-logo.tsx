import Image from 'next/image';
import { lusitana } from '@/app/ui/fonts';

export default function SiteLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-white`}
    >
      <Image
        src="/logo.png"        // The path is relative to the public folder
        alt="HustleHub Logo"
        width={60}
        height={60}
        className="rounded-lg"
        priority
      />
      <p className="text-[44px] ml-2">HustleHub</p>
    </div>
  );
}

