import Link from 'next/link';
import Image from 'next/image';

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-gray-400 pt-12 pb-8 px-4 md:px-12">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1 rounded-full ring-4 ring-white">
          <Image
            src="/logo.png"
            alt="HustleHub Africa Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        <h3 className="text-2xl font-extrabold text-white">HustleHub Africa</h3>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3">Quick Links</h4>
        <ul className="space-y-2 text-sm">
          <li><Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link></li>
          <li><Link href="/#earning" className="hover:text-indigo-400 transition-colors">Ways to Earn</Link></li>
          <li><Link href="/#why-us" className="hover:text-indigo-400 transition-colors">Features</Link></li>
          <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About Us</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3">Support</h4>
        <ul className="space-y-2 text-sm">
          <li><Link href="/help" className="hover:text-indigo-400 transition-colors">Help Center</Link></li>
          <li><Link href="/faq" className="hover:text-indigo-400 transition-colors">FAQs</Link></li>
          <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
          <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3">Contact Us</h4>
        <ul className="space-y-2 text-sm">
          <li><a href="mailto:support@hustlehubafrica.com" className="hover:text-indigo-400 transition-colors">support@hustlehubafrica.com</a></li>
          <li>+254 748 264 231</li>
          <li>Nairobi, Kenya</li>
        </ul>
      </div>
    </div>

    <div className="max-w-7xl mx-auto border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs">
      <p>&copy; 2025 HustleHub Africa. All rights reserved.</p>
      <div className="space-x-4 mt-3 md:mt-0">
        <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms</Link>
        <span className="text-gray-700">•</span>
        <Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy</Link>
        <span className="text-gray-700">•</span>
        <Link href="/cookies" className="hover:text-indigo-400 transition-colors">Cookies</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
