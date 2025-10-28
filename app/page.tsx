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
  { icon: '🤝', name: 'Refer & Earn', description: 'Invite friends and earn commissions on every successful referral. Build your network, grow your income.', link: '/refer-earn' },
  { icon: '🎰', name: 'Spin to Win', description: 'Try your luck daily! Spin the wheel and win instant cash rewards, bonuses, and exclusive prizes.', link: '/spin-to-win' },
  { icon: '📱', name: 'Sell Electronic Airtime', description: 'Become an airtime vendor. Buy and sell airtime at competitive rates and earn profit margins.', link: '/airtime' },
  { icon: '📚', name: 'Academic Writing', description: 'Leverage your expertise. Write academic papers, essays, and research content for students worldwide.', link: '/academic-writing' },
  { icon: '📊', name: 'Research Surveys', description: 'Share your opinions and get paid. Complete market research surveys from top brands.', link: '/surveys' },
  { icon: '✍️', name: 'Blogging / Content Writing', description: 'Create engaging content. Write blog posts, articles, and web content for businesses globally.', link: '/content-writing' },
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
          <li><a href="mailto:support@hustlehubafrica.com" className="hover:text-indigo-400 transition-colors">support@hustlehubafrica.com</a></li>
          <li>+254 700 000 000</li>
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
        Choose how you want to earn. Combine multiple methods to maximize your income potential.
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
        We've built the most comprehensive earning platform designed specifically for African hustlers.
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

const FinalCTA: React.FC = () => (
  <section className="py-16 px-4 md:px-12 bg-indigo-600 text-white">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-4xl font-extrabold mb-4">
        Join 10,000+ Africans Already Earning with HustleHub
      </h2>
      <p className="text-xl mb-8 opacity-90">
        Don't let another day pass without taking control of your financial future. Start your earning journey today!
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
          Join thousands of Africans earning money through multiple income streams. From surveys to content writing, from airtime sales to academic writing - your hustle starts here.
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
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
