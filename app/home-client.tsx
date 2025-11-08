'use client'; 

import React from 'react';
import Link from 'next/link'; 
import Image from 'next/image'; 

interface EarningFeature {
  icon: string;
  name: string;
  description: string;
  link: string;
}

interface ValueProp {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  step: string;
  title: string;
  description: string;
}

const earningFeatures: EarningFeature[] = [
  { icon: '🤝', name: 'Refer & Earn', description: 'Invite friends and earn commissions on every successful referral. Build your network, grow your income through our earn for life referral program.', link: '/refer-earn' },
  { icon: '🎰', name: 'Spin to Win', description: 'Try your luck daily! Spin the wheel and win instant cash rewards, bonuses, and exclusive prizes.', link: '/dashboard' },
  { icon: '📱', name: 'Sell Electronic Airtime', description: 'Become an airtime vendor. Buy and sell airtime at competitive rates and earn profit margins.', link: '/dashboard' },
  { icon: '📚', name: 'Academic Writing', description: 'Leverage your expertise. Write academic papers, essays, and research content for students worldwide.', link: '/academic-writing' },
  { icon: '📊', name: 'Research Surveys', description: 'Share your opinions and get paid. Complete market research surveys from top brands.', link: '/dashboard/surveys' },
  { icon: '✍️', name: 'Blogging / Content Writing', description: 'Create engaging content. Write blog posts, articles, and web content for businesses globally.', link: '/dashboard/content' },
  { icon: '📈', name: 'Sales & Marketing', description: 'Promote products and services. Earn commissions through affiliate marketing and direct sales.', link: '/sales-marketing' },
  { icon: '🎁', name: 'Spin Vouchers', description: 'Redeem and trade vouchers. Convert your spin rewards into cash or premium benefits.', link: '/vouchers' },
  { icon: '👑', name: 'Leadership Token', description: 'Climb the leadership ranks. Earn exclusive tokens and unlock premium earning opportunities.', link: '/leadership' },
];

const valuePropositions: ValueProp[] = [
  { icon: '🔒', title: 'Secure & Trusted', description: 'Bank-grade security to protect your earnings and personal information.' },
  { icon: '⚡', title: 'Instant Payouts', description: 'Quick withdrawal processing with M-Pesa integration for instant access to your money.' },
  { icon: '⚙️', title: 'Multiple Earning Methods', description: 'Diversify your income with 9 different ways to earn on one platform.' },
  { icon: '🤝', title: 'Community Support', description: 'Join a thriving community of earners with 24/7 support team assistance.' },
  { icon: '⏰', title: 'Flexible Schedule', description: 'Work whenever you want. Set your own hours and earn at your own pace.' },
  { icon: '🌍', title: 'Pan-African Platform', description: 'Built for Africa, serving users across the continent with local payment solutions.' },
];

const steps: Step[] = [
  { step: '01', title: 'Create Account', description: "Sign up in minutes with your email and phone number. A one-time registration fee of Ksh 1000 applies." },
  { step: '02', title: 'Choose Your Hustle', description: 'Select from 9 different earning methods that match your skills and interests.' },
  { step: '03', title: 'Start Earning', description: 'Complete tasks, projects, or activities and watch your earnings grow daily.' },
  { step: '04', title: 'Withdraw Instantly', description: 'Request withdrawals anytime via M-Pesa and receive your money within minutes.' },
];

// Email obfuscation component
const ObfuscatedEmail: React.FC<{ user: string; domain: string; className?: string }> = ({ user, domain, className }) => {
  const [email, setEmail] = React.useState<string>('');
  
  React.useEffect(() => {
    setEmail(`${user}@${domain}`);
  }, [user, domain]);
  
  return email ? (
    <a href={`mailto:${email}`} className={className}>
      {email}
    </a>
  ) : (
    <span className={className}>Loading...</span>
  );
};

// Social share component - Fixed hydration issue
const SocialShare: React.FC = () => {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Use environment variable for base URL with fallback
  const baseUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com';
  const shareUrl = isClient ? window.location.href : baseUrl;
  const shareText = 'Join HustleHub Africa - Unlock Your Financial Freedom with Multiple Income Streams';
  
  if (!isClient) {
    return (
      <div className="flex space-x-4 justify-center items-center my-8">
        <span className="text-gray-600 font-semibold">Share:</span>
        <div className="p-2 bg-blue-600 text-white rounded-full opacity-50">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
        <div className="p-2 bg-sky-500 text-white rounded-full opacity-50">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </div>
        <div className="p-2 bg-blue-700 text-white rounded-full opacity-50">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
        <div className="p-2 bg-green-500 text-white rounded-full opacity-50">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex space-x-4 justify-center items-center my-8">
      <span className="text-gray-600 font-semibold">Share:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        aria-label="Share on Facebook"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors"
        aria-label="Share on Twitter"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
        aria-label="Share on WhatsApp"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
};

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="flex flex-col sm:flex-row justify-between items-center py-4 px-4 md:px-12 bg-white shadow-lg sticky top-0 z-50">
      
      <div className="flex justify-between items-center w-full sm:w-auto">
        <div className="flex items-center space-x-2">
          <Link href="/" aria-label="Go to HustleHub Africa homepage">
            <Image
              src="/logo.png"
              alt="HustleHub Africa Logo"
              width={50}
              height={50}
              className="rounded-md ring-4 ring-blue-500 hover:ring-blue-600 transition duration-300"
              priority
            />
          </Link>
          <Link
            href="/"
            className="hover:text-indigo-700 transition-colors text-2xl font-extrabold text-indigo-600 hidden sm:inline"
          >
            HustleHub Africa
          </Link>
        </div>

        <button
          onClick={toggleMenu}
          className="sm:hidden p-2 text-gray-600 hover:text-indigo-600 focus:outline-none rounded-lg"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          )}
        </button>
      </div>
      
      <nav className="hidden sm:flex space-x-4 sm:space-x-8 items-center" aria-label="Primary navigation">
        <Link href="/" className="text-gray-600 hover:text-indigo-600 transition-colors">Home</Link>
        <Link href="/blog" className="text-gray-600 hover:text-indigo-600 transition-colors">Blog</Link>
        <Link href="#earning" className="text-gray-600 hover:text-indigo-600 transition-colors">Paid Surveys</Link>
        <Link href="/auth/login" className="text-gray-600 hover:text-indigo-600 transition-colors">Login</Link>
        <Link href="/admin" className="text-gray-600 hover:text-indigo-600 transition-colors hidden lg:block" aria-label="Admin Login Portal">Admin Login</Link>
        
        <Link 
          href="/auth/sign-up"
          className="px-4 py-2 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors shadow-md text-sm sm:text-base"
          aria-label="Get started and create a new account"
        >
          Get Started
        </Link>
      </nav>

      <nav 
        id="mobile-menu"
        className={`sm:hidden w-full flex-col mt-3 transition-all duration-300 ease-in-out bg-white ${isOpen ? 'max-h-96 opacity-100 py-2 border-t border-gray-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
        aria-label="Mobile navigation menu"
      >
        <Link href="/" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Home</Link>
        <Link href="/blog" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Blog</Link>
        <Link href="#earning" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Paid Surveys</Link>
        <Link href="/auth/login" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Login</Link>
        <Link href="/admin" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" aria-label="Admin Login Portal" onClick={toggleMenu}>Admin Login</Link>
        
        <Link 
          href="/auth/sign-up"
          className="w-full mt-4 py-2 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors shadow-md text-center block"
          aria-label="Get started and create a new account (mobile)"
          onClick={toggleMenu}
        >
          Get Started
        </Link>
      </nav>
    </header>
  );
};

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
          <li><Link href="#earning" className="hover:text-indigo-400 transition-colors">Ways to Earn</Link></li>
          <li><Link href="#why-us" className="hover:text-indigo-400 transition-colors">Features</Link></li>
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
          <li>
            <ObfuscatedEmail 
              user="support" 
              domain="hustlehubafrica.com" 
              className="hover:text-indigo-400 transition-colors"
            />
          </li>
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

const EarningSection: React.FC = () => (
  <section id="earning" className="py-16 px-4 md:px-12 bg-white">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900 mb-12">
        Multiple Income Streams, <span className="text-indigo-600">One Platform</span>
      </h2>
      <p className="text-center text-xl text-gray-600 mb-12 max-w-4xl mx-auto">
        Choose how you want to earn. Combine multiple methods to maximize your income potential. Discover the best ways to make money online in Kenya through our comprehensive platform.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {earningFeatures.map((feature, index) => (
          <div key={index} className="bg-gray-50 p-6 rounded-2xl shadow-xl border-t-4 border-indigo-500 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-4xl">{feature.icon}</span>
              <h3 className="text-xl font-bold text-gray-900">{feature.name}</h3>
            </div>
            <p className="text-gray-600 mb-4">{feature.description}</p>
            <Link 
              href={feature.link} 
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors group"
              aria-label={`Details about the ${feature.name} earning method`}
            >
              Learn more →
              <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1"></span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const WhyChooseUsSection: React.FC = () => (
  <section id="why-us" className="py-16 px-4 md:px-12 bg-gray-900 text-white">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-4">
        Why Choose <span className="text-green-400">HustleHub Africa?</span>
      </h2>
      <p className="text-center text-lg text-gray-400 mb-12">
        We've built the most comprehensive earning platform designed specifically for African hustlers. Experience the easy way to make money online in Kenya with our secure and trusted platform.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {valuePropositions.map((prop, index) => (
          <div key={index} className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
            <span className="text-4xl mb-3 block">{prop.icon}</span>
            <h3 className="text-xl font-semibold mb-2 text-white">{prop.title}</h3>
            <p className="text-gray-400 text-sm">{prop.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FourStepProcess: React.FC = () => (
  <section className="py-16 px-4 md:px-12 bg-white">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900 mb-12">
        Start Earning in <span className="text-indigo-600">4 Simple Steps</span>
      </h2>
      <div className="relative">
        <div className="hidden lg:block absolute top-1/4 left-0 right-0 h-1 bg-indigo-200 transform translate-y-1/2"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((item, index) => (
            <div key={index} className="flex flex-col items-start lg:items-center text-left lg:text-center relative">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-lg z-10 shadow-lg">
                  {item.step.slice(1)}
                </div>
                {index < steps.length - 1 && (
                  <div className="lg:hidden absolute left-5 top-10 h-full w-0.5 bg-indigo-200 -z-10"></div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-2 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const AdditionalContent: React.FC = () => (
  <section className="py-16 px-4 md:px-12 bg-gray-50">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 text-center">
        How to Make Money Online Kenya: Your Complete Guide
      </h2>
      
      <div className="prose prose-lg max-w-none text-gray-700">
        <p className="mb-6 text-lg">
          Looking for ways of making money in Kenya? HustleHub Africa provides multiple legitimate opportunities to earn money online in Kenya. Whether you're a student, professional, or entrepreneur, our platform offers diverse income streams tailored to your skills and schedule.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Ways to Make Money in Kenya Through HustleHub
        </h3>
        
        <p className="mb-6">
          Our platform stands out as the premier destination for anyone asking "how can I make money online in Kenya?" We've created a comprehensive ecosystem where you can explore various earning opportunities without the need for multiple accounts or platforms. From our innovative earn for life referral program to traditional freelance work, we've got you covered.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Make Money Online Kenya: The HustleHub Advantage
        </h3>
        
        <p className="mb-6">
          What makes HustleHub the easy way to make money online in Kenya? First, we integrate M-Pesa for instant withdrawals, eliminating the payment delays common with international platforms. Second, our diverse earning methods mean you're never dependent on a single income source. Third, our community of over 10,000 active users provides support, tips, and motivation as you build your online income.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Earn Money Online in Kenya: Real Success Stories
        </h3>
        
        <p className="mb-6">
          Our users have transformed their lives through HustleHub Africa. Sarah from Nairobi started with research surveys and now earns over Ksh 50,000 monthly combining surveys with our referral program. James leveraged his academic background to build a thriving academic writing business through our platform. These success stories demonstrate the real potential of ways to make money online in Kenya through dedicated effort on our platform.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          The Earn for Life Referral Program
        </h3>
        
        <p className="mb-6">
          Our earn for life referral program is revolutionary in the Kenyan market. Unlike traditional referral programs that offer one-time bonuses, you earn recurring commissions from your referrals' activities. Build your network once and create a sustainable passive income stream. This program alone has helped hundreds of users generate consistent monthly income while helping others discover legitimate ways of making money in Kenya.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Flexible Work, Guaranteed Security
        </h3>
        
        <p className="mb-6">
          When people search for "how to make money online Kenya," security is often a major concern. HustleHub Africa employs bank-grade encryption and secure payment processing to protect your earnings and personal information. Our transparent fee structure (one-time Ksh 1000 registration) means no hidden costs or surprise deductions from your hard-earned money.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Multiple Ways of Making Money in Kenya
        </h3>
        
        <p className="mb-6">
          Diversification is key to sustainable online income. HustleHub offers nine distinct earning methods: academic writing for students worldwide, research surveys from international brands, content writing for global businesses, airtime reselling with profit margins, sales and marketing through affiliate programs, our innovative spin-to-win daily rewards, spin vouchers for additional benefits, leadership tokens for top performers, and our lucrative referral program. This variety ensures you can always find ways to make money in Kenya that match your current skills and interests.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
          Join the HustleHub Community Today
        </h3>
        
        <p className="mb-6">
          Ready to start your journey to financial freedom? HustleHub Africa isn't just a platform—it's a community of ambitious Kenyans building their futures together. With 24/7 support, regular training webinars, and a thriving community forum, you're never alone in your journey to earn money online in Kenya. Our success is built on your success, which is why we continuously improve our platform and add new earning opportunities based on user feedback.
        </p>
      </div>
      
      <SocialShare />
    </div>
  </section>
);

const FinalCTA: React.FC = () => (
  <section className="py-16 px-4 md:px-12 bg-indigo-600 text-white">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-4xl font-extrabold mb-4">
        Join 10,000+ Africans Already Earning with HustleHub
      </h2>
      <p className="text-xl mb-8 opacity-90">
        Don't let another day pass without taking control of your financial future. Start your earning journey today and discover the best ways to make money online in Kenya!
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-2">
        <Link 
          href="/auth/sign-up"
          className="px-10 py-4 text-lg font-bold bg-green-400 text-gray-900 rounded-full hover:bg-green-500 transition-colors shadow-2xl transform hover:scale-105 block"
          aria-label="Create your Hustle Hub account and register now"
        >
          Create Account
        </Link>
        <Link 
          href="/demo"
          className="px-10 py-4 text-lg font-bold border-2 border-white text-white rounded-full hover:bg-white hover:text-indigo-600 transition-colors block"
          aria-label="Watch the platform demonstration video"
        >
          Watch Demo Video
        </Link>
      </div>

      <p className="text-base font-semibold mt-2 mb-8 opacity-90">
        <span className="text-green-400">One-time Registration Fee: Ksh 1000</span>
      </p>

      <div className="flex flex-wrap justify-center items-center text-sm space-x-4 sm:space-x-8 mt-10">
        <span className="flex items-center space-x-1"><span className="text-xl mr-1">✅</span> Instant M-Pesa withdrawals</span>
        <span className="flex items-center space-x-1"><span className="text-xl mr-1">✅</span> 24/7 support team</span>
        <span className="flex items-center space-x-1"><span className="text-xl mr-1">✅</span> Multiple earning streams</span>
      </div>
    </div>
  </section>
);

const HeroSection: React.FC = () => (
  <section className="relative py-20 md:py-32 px-4 md:px-12 bg-blue-50 overflow-hidden">
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:justify-between">
      <div className="lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Unlock Your <span className="text-indigo-600">Financial Freedom</span> with HustleHub Africa
        </h1>
        <p className="text-xl text-gray-700 mb-10 max-w-xl lg:max-w-full mx-auto">
          Join thousands of Africans earning money through multiple income streams. From surveys to content writing, from airtime sales to academic writing - your hustle starts here. Discover how to make money online Kenya with our proven platform.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
          <Link 
            href="/auth/sign-up"
            className="px-8 py-3 text-lg font-bold bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-xl transform hover:scale-105 text-center"
            aria-label="Start earning by creating an account today"
          >
            Start Earning Today
          </Link>
          <Link 
            href="#earning" 
            className="px-8 py-3 text-lg font-bold border-2 border-indigo-600 text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors text-center"
            aria-label="Learn more about the ways you can earn money on this platform"
          >
            Learn More
          </Link>
        </div>

        <div className="flex flex-wrap justify-center lg:justify-start gap-y-4 gap-x-8 text-left border-t pt-6 mt-6 border-indigo-200">
          <div className="text-center lg:text-left">
            <p className="text-3xl font-bold text-indigo-600">10K+</p>
            <p className="text-gray-500 text-sm">Active Users 👨‍👩‍👧‍👦</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-3xl font-bold text-indigo-600">$500K+</p>
            <p className="text-gray-500 text-sm">Paid Out 💰</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-3xl font-bold text-indigo-600">9</p>
            <p className="text-gray-500 text-sm">Earning Ways ✨</p>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex justify-center">
        <div className="hidden md:block p-2 ring-8 ring-blue-500 rounded-2xl">
          <Image
            src="/hero-desktop.png"
            width={1000}
            height={760}
            className="hidden md:block"
            alt="Screenshots of the dashboard project showing desktop version"
          />
        </div>
        <div className="block md:hidden p-2 ring-8 ring-blue-500 rounded-2xl">
          <Image
            src="/hero-mobile.png"
            width={560}
            height={620}
            className="block md:hidden"
            alt="Screenshot of the dashboard project showing mobile version"
          />
        </div>
      </div>
    </div>
  </section>
);

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-grow">
        <HeroSection />
        <EarningSection />
        <WhyChooseUsSection />
        <FourStepProcess />
        <AdditionalContent />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
