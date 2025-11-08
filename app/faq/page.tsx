'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sendSupportEmail } from '@/app/actions/email';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Registration & Account
  {
    question: "How do I create an account on HustleHub Africa?",
    answer: "Creating an account is simple! Click the 'Get Started' button on our homepage, fill in your details including your email and phone number, pay the one-time registration fee of Ksh 1000, and you'll have immediate access to all earning methods.",
    category: "Registration & Account"
  },
  {
    question: "Is there a registration fee?",
    answer: "Yes, there is a one-time registration fee of Ksh 1000. This gives you lifetime access to all 9 earning methods on our platform with no additional hidden charges.",
    category: "Registration & Account"
  },
  {
    question: "Can I use the same account on multiple devices?",
    answer: "Absolutely! Your HustleHub Africa account can be accessed from any device - phone, tablet, or computer. Simply log in with your credentials to continue earning.",
    category: "Registration & Account"
  },

  // Earning Methods
  {
    question: "What are the different ways to earn on HustleHub Africa?",
    answer: "We offer 9 distinct earning methods: 1) Refer & Earn program, 2) Spin to Win daily rewards, 3) Electronic Airtime sales, 4) Academic Writing, 5) Research Surveys, 6) Content Writing, 7) Sales & Marketing, 8) Spin Vouchers, and 9) Leadership Token rewards.",
    category: "Earning Methods"
  },
  {
    question: "How does the 'Earn for Life' referral program work?",
    answer: "Our referral program pays you recurring commissions from your referrals' activities. Unlike one-time bonuses, you earn continuously as long as your referrals remain active on the platform, creating sustainable passive income.",
    category: "Earning Methods"
  },
  {
    question: "What is the daily Spin to Win feature?",
    answer: "Spin to Win is our daily reward system where you can spin a virtual wheel to win instant cash, bonuses, or exclusive prizes. Every registered user gets one free spin per day.",
    category: "Earning Methods"
  },
  {
    question: "How much can I earn from academic writing?",
    answer: "Earnings vary based on project complexity and your expertise. Most writers earn between Ksh 500 - Ksh 5,000 per assignment. We have a steady flow of academic writing projects from students worldwide.",
    category: "Earning Methods"
  },
  {
    question: "Are the research surveys legitimate?",
    answer: "Yes! All surveys on our platform are from verified market research companies and international brands. Each completed survey earns you between Ksh 200 - Ksh 2,000 depending on length and complexity.",
    category: "Earning Methods"
  },

  // Payments & Withdrawals
  {
    question: "How do I withdraw my earnings?",
    answer: "Withdrawals are processed instantly via M-Pesa. Go to your dashboard, click 'Withdraw', enter your M-Pesa number and amount, and you'll receive your money within minutes. Minimum withdrawal is Ksh 500.",
    category: "Payments & Withdrawals"
  },
  {
    question: "Is there a withdrawal fee?",
    answer: "We charge a small processing fee of 2% per withdrawal to cover transaction costs. This ensures we can maintain instant M-Pesa processing for all our users.",
    category: "Payments & Withdrawals"
  },
  {
    question: "What is the minimum withdrawal amount?",
    answer: "The minimum withdrawal amount is Ksh 500. This helps us keep transaction costs reasonable while ensuring you can access your earnings regularly.",
    category: "Payments & Withdrawals"
  },
  {
    question: "How often can I withdraw my earnings?",
    answer: "You can withdraw as often as you like! There are no limits on withdrawal frequency as long as you meet the minimum amount of Ksh 500.",
    category: "Payments & Withdrawals"
  },

  // Technical Support
  {
    question: "What if I forget my password?",
    answer: "Click 'Forgot Password' on the login page. We'll send a reset link to your registered email. You can also contact our support team for immediate assistance.",
    category: "Technical Support"
  },
  {
    question: "Is my personal information secure?",
    answer: "Absolutely! We use bank-grade encryption and follow strict data protection protocols. Your personal and financial information is never shared with third parties without your consent.",
    category: "Technical Support"
  },
  {
    question: "What devices are supported?",
    answer: "HustleHub Africa works on all devices - smartphones (Android & iOS), tablets, laptops, and desktop computers. Our platform is fully responsive and optimized for mobile use.",
    category: "Technical Support"
  },

  // Platform & Community
  {
    question: "Is HustleHub Africa available outside Kenya?",
    answer: "Currently, we primarily serve Kenyan users due to our M-Pesa integration. However, we're expanding to other African countries soon. Follow our social media for updates on expansion.",
    category: "Platform & Community"
  },
  {
    question: "How do I contact customer support?",
    answer: "You can reach our 24/7 support team via: Email: support@hustlehubafrica.com, Phone: +254 748 264 231, or through the live chat in your dashboard. Average response time is under 15 minutes.",
    category: "Platform & Community"
  },
  {
    question: "Are there any community features?",
    answer: "Yes! We have an active community forum, regular training webinars, and group chats where members share tips and support each other. It's more than a platform - it's a community!",
    category: "Platform & Community"
  },
  {
    question: "Can I use multiple earning methods simultaneously?",
    answer: "Definitely! In fact, we encourage diversifying your income streams. Many of our top earners combine 3-4 methods to maximize their monthly income potential.",
    category: "Platform & Community"
  }
];

const categories = [
  "All Questions",
  "Registration & Account",
  "Earning Methods",
  "Payments & Withdrawals",
  "Technical Support",
  "Platform & Community"
];

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
        <Link href="/faq" className="text-indigo-600 font-semibold transition-colors">FAQs</Link>
        <Link href="/blog" className="text-gray-600 hover:text-indigo-600 transition-colors">Blog</Link>
        <Link href="/auth/login" className="text-gray-600 hover:text-indigo-600 transition-colors">Login</Link>
        
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
        <Link href="/faq" className="block py-2 px-3 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>FAQs</Link>
        <Link href="/blog" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Blog</Link>
        <Link href="/auth/login" className="block py-2 px-3 text-gray-700 hover:bg-indigo-50 rounded-lg" onClick={toggleMenu}>Login</Link>
        
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

const FAQItem: React.FC<{ item: FAQItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
      <button
        className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 rounded-2xl"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="text-lg font-semibold text-gray-900 pr-4">{item.question}</span>
        <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div className={`px-6 pb-5 transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-gray-700 leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

const SearchBar: React.FC<{ searchTerm: string; setSearchTerm: (term: string) => void }> = ({ 
  searchTerm, 
  setSearchTerm 
}) => (
  <div className="relative max-w-2xl mx-auto mb-12">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
      </svg>
    </div>
    <input
      type="text"
      placeholder="Search for answers... (e.g., 'withdrawal', 'registration', 'earning')"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-300"
    />
  </div>
);

const CategoryFilter: React.FC<{ 
  selectedCategory: string; 
  setSelectedCategory: (category: string) => void 
}> = ({ selectedCategory, setSelectedCategory }) => (
  <div className="flex flex-wrap justify-center gap-3 mb-12">
    {categories.map((category) => (
      <button
        key={category}
        onClick={() => setSelectedCategory(category)}
        className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
          selectedCategory === category
            ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
        }`}
      >
        {category}
      </button>
    ))}
  </div>
);

const ContactSection: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const result = await sendSupportEmail(formData);
      
      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you for your message! We have received your support request and will get back to you within 24 hours. You should receive a confirmation email shortly.'
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Failed to send your message. Please try again or contact us directly at support@hustlehubafrica.com'
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again or contact us directly at support@hustlehubafrica.com'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 px-4 md:px-12 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold mb-4">Still Have Questions?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Contact Our Support</h3>
            
            {submitStatus.type && (
              <div className={`mb-6 p-4 rounded-lg ${
                submitStatus.type === 'success' 
                  ? 'bg-green-500 bg-opacity-20 border border-green-400' 
                  : 'bg-red-500 bg-opacity-20 border border-red-400'
              }`}>
                <p className={submitStatus.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                  {submitStatus.message}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    placeholder="Your name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    placeholder="your@email.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  placeholder="What is your question about?"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-20 border border-white border-opacity-30 text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 resize-none"
                  placeholder="Describe your question in detail..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-colors duration-300 shadow-lg transform hover:scale-105 ${
                  isSubmitting
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-400 text-gray-900 hover:bg-green-500'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h4 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email Support
              </h4>
              <p className="opacity-90 mb-2">For detailed inquiries and documentation</p>
              <a href="mailto:support@hustlehubafrica.com" className="text-green-300 hover:text-green-400 font-semibold text-lg">
                support@hustlehubafrica.com
              </a>
              <p className="text-sm opacity-80 mt-2">Average response time: 2 hours</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h4 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Phone Support
              </h4>
              <p className="opacity-90 mb-2">For urgent matters and immediate assistance</p>
              <a href="tel:+254748264231" className="text-green-300 hover:text-green-400 font-semibold text-lg">
                +254 748 264 231
              </a>
              <p className="text-sm opacity-80 mt-2">Available 24/7</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6">
              <h4 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Live Chat
              </h4>
              <p className="opacity-90 mb-2">For quick questions and real-time help</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="bg-green-400 text-gray-900 font-bold py-3 px-6 rounded-xl hover:bg-green-500 transition-colors duration-300 shadow-lg transform hover:scale-105"
              >
                Start Live Chat
              </button>
              <p className="text-sm opacity-80 mt-2">Available in your dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </section>
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
          <li><Link href="/faq" className="hover:text-indigo-400 transition-colors">FAQs</Link></li>
          <li><Link href="/blog" className="hover:text-indigo-400 transition-colors">Blog</Link></li>
          <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About Us</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3">Support</h4>
        <ul className="space-y-2 text-sm">
          <li><Link href="/help" className="hover:text-indigo-400 transition-colors">Help Center</Link></li>
          <li><Link href="/contact" className="hover:text-indigo-400 transition-colors">Contact Us</Link></li>
          <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
          <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-semibold mb-3">Contact Info</h4>
        <ul className="space-y-2 text-sm">
          <li>support@hustlehubafrica.com</li>
          <li>+254 748 264 231</li>
          <li>Nairobi, Kenya</li>
        </ul>
      </div>
    </div>

    <div className="max-w-7xl mx-auto border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs">
      <p>&copy; 2024 HustleHub Africa. All rights reserved.</p>
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

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Questions');

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Questions' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-4 md:px-12 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-8">
              Find quick answers to common questions about HustleHub Africa. 
              Everything you need to know about earning money online in Kenya.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">Registration</span>
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">Earning Methods</span>
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">Withdrawals</span>
              <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full">Support</span>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16 px-4 md:px-12">
          <div className="max-w-4xl mx-auto">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <CategoryFilter 
              selectedCategory={selectedCategory} 
              setSelectedCategory={setSelectedCategory} 
            />

            <div className="space-y-6">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((item, index) => (
                  <FAQItem key={index} item={item} />
                ))
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search or filter criteria. If you can't find what you're looking for, 
                    contact our support team below.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
