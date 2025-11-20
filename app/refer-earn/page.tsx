import type { Metadata } from 'next'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Refer & Earn Program | Affiliate Marketing Opportunities | HustleHub Africa',
  description: 'Earn commissions by referring friends and promoting brands. Learn how refer-earn programs and affiliate marketing work together to maximize your income potential.',
  keywords: 'refer and earn, affiliate marketing, referral program, commission earnings, referral bonuses, affiliate links, passive income, network marketing',
  authors: [{ name: 'HustleHub Africa' }],
  creator: 'HustleHub Africa',
  publisher: 'HustleHub Africa',
  robots: 'index, follow, max-image-preview:large',
  openGraph: {
    title: 'Refer & Earn Program | Affiliate Marketing Opportunities | HustleHub Africa',
    description: 'Earn commissions by referring friends and promoting brands through our refer-earn and affiliate programs.',
    url: 'https://hustlehubafrica.com/refer-earn',
    siteName: 'HustleHub Africa',
    images: [
      {
        url: '/refer-earn-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Refer & Earn Program - HustleHub Africa',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Refer & Earn Program | HustleHub Africa',
    description: 'Earn commissions through referrals and affiliate marketing.',
    images: ['/refer-earn-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://hustlehubafrica.com/refer-earn',
  },
}

export default function ReferEarn() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Refer & <span className="text-purple-600">Earn</span> Program
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Turn your network into income. Earn commissions by referring friends and promoting brands through our powerful affiliate system.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105">
                  Get Your Referral Link
                </button>
                <button className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                  Learn How It Works
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">10,000+</div>
                <div className="text-purple-100">Active Referrers</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$1M+</div>
                <div className="text-purple-100">Paid in Commissions</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-purple-100">Partner Brands</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">30%</div>
                <div className="text-purple-100">Average Commission</div>
              </div>
            </div>
          </div>
        </section>

        {/* Understanding Refer-Earn & Affiliate Marketing */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Understanding Refer-Earn & Affiliate Marketing
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Refer-Earn Program */}
              <div className="bg-purple-50 p-8 rounded-lg">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    👥
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Refer-Earn Program</h3>
                  <p className="text-purple-600 font-semibold">People-Based Commission System</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Focus: People Network</h4>
                      <p className="text-gray-600">You earn by referring individuals to join platforms or services</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Commission Structure</h4>
                      <p className="text-gray-600">One-time or recurring commissions based on referrals' activity</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Examples</h4>
                      <p className="text-gray-600">Referring friends to apps, services, or membership platforms</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Affiliate Marketing */}
              <div className="bg-pink-50 p-8 rounded-lg">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-pink-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    🛒
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Affiliate Marketing</h3>
                  <p className="text-pink-600 font-semibold">Product-Based Commission System</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Focus: Product Promotion</h4>
                      <p className="text-gray-600">You earn commissions by promoting specific products or services</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Commission Structure</h4>
                      <p className="text-gray-600">Percentage of sales, fixed amount per sale, or pay-per-click</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm mr-3 mt-1">✓</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Examples</h4>
                      <p className="text-gray-600">Promoting e-commerce products, software, or online courses</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How They Work Together */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              How They Work Together
            </h2>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  🔄
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The Perfect Synergy</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Refer-earn and affiliate marketing complement each other to create multiple income streams from the same network.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Refer Friends to Join</h4>
                  <p className="text-gray-600">Share your referral link to bring friends into the platform</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Promote Products to Them</h4>
                  <p className="text-gray-600">Use affiliate links to recommend products to your referrals</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Earn Double Commissions</h4>
                  <p className="text-gray-600">Get referral bonuses + affiliate commissions from the same person</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Commission Structure */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Commission Structure
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Refer-Earn Commissions */}
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Refer-Earn Commissions</h3>
                <div className="space-y-4">
                  {referEarnCommissions.map((commission, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="font-medium text-gray-700">{commission.tier}</span>
                      <span className="font-bold text-purple-600">{commission.amount}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-purple-100 rounded-lg">
                  <p className="text-sm text-purple-800 text-center">
                    💡 <strong>Pro Tip:</strong> Referrals who become active users can earn you recurring commissions for up to 12 months!
                  </p>
                </div>
              </div>

              {/* Affiliate Commissions */}
              <div className="bg-pink-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Affiliate Commissions</h3>
                <div className="space-y-4">
                  {affiliateCommissions.map((commission, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="font-medium text-gray-700">{commission.category}</span>
                      <span className="font-bold text-pink-600">{commission.commission}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-pink-100 rounded-lg">
                  <p className="text-sm text-pink-800 text-center">
                    💰 <strong>Bonus:</strong> Some products offer tiered commissions that increase with more sales!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success Path */}
        <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Your Path to Success
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {successPath.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white text-purple-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-purple-100 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools & Resources */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Tools & Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tools.map((tool, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg text-center">
                  <div className="text-3xl mb-4">{tool.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{tool.title}</h3>
                  <p className="text-gray-600 mb-4">{tool.description}</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {tool.features.map((feature, featureIndex) => (
                      <li key={featureIndex}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Examples */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Real Earning Examples
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {earningExamples.map((example, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {example.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{example.name}</h3>
                      <p className="text-sm text-gray-600">{example.duration}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Referrals:</span>
                      <span className="font-semibold">{example.referrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Affiliate Sales:</span>
                      <span className="font-semibold">{example.sales}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span className="text-gray-900 font-bold">Total Earned:</span>
                      <span className="text-green-600 font-bold">{example.earned}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-purple-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Earning Through Referrals?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Join thousands of successful referrers and affiliate marketers. Get your unique link and start earning today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg text-lg transition duration-300 transform hover:scale-105">
                Get Started Now
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-purple-600 font-bold py-4 px-8 rounded-lg text-lg transition duration-300">
                Download Referral Guide
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// Data arrays
const referEarnCommissions = [
  { tier: 'Direct Referral Bonus', amount: '$10 per signup' },
  { tier: 'Level 2 Referrals', amount: '$5 per signup' },
  { tier: 'Level 3 Referrals', amount: '$2 per signup' },
  { tier: 'Activity Bonus', amount: '$20 monthly' },
  { tier: 'Team Performance Bonus', amount: 'Up to $500' }
]

const affiliateCommissions = [
  { category: 'Digital Products', commission: '30-50%' },
  { category: 'Physical Products', commission: '10-25%' },
  { category: 'Services', commission: '15-40%' },
  { category: 'Software Subscriptions', commission: '20-30% recurring' },
  { category: 'Course Sales', commission: '40-60%' }
]

const successPath = [
  {
    icon: '🔗',
    title: 'Get Your Link',
    description: 'Receive unique referral and affiliate links'
  },
  {
    icon: '📤',
    title: 'Share Widely',
    description: 'Share across social media and personal networks'
  },
  {
    icon: '💸',
    title: 'Earn Commissions',
    description: 'Get paid for referrals and product sales'
  },
  {
    icon: '📈',
    title: 'Scale Up',
    description: 'Use earnings to expand your marketing efforts'
  }
]

const tools = [
  {
    icon: '📊',
    title: 'Dashboard & Analytics',
    description: 'Track your referrals, clicks, and earnings in real-time',
    features: ['Real-time tracking', 'Performance analytics', 'Commission reports']
  },
  {
    icon: '🎨',
    title: 'Marketing Materials',
    description: 'Ready-to-use banners, posts, and copy for promotion',
    features: ['Social media templates', 'Email templates', 'Banner ads']
  },
  {
    icon: '👥',
    title: 'Community Support',
    description: 'Learn from successful referrers and affiliate marketers',
    features: ['Private community', 'Weekly training', 'Success stories']
  }
]

const earningExamples = [
  {
    name: 'Sarah M.',
    initials: 'SM',
    duration: '3 months',
    referrals: '45 people',
    sales: '28 products',
    earned: '$2,340'
  },
  {
    name: 'David K.',
    initials: 'DK',
    duration: '6 months',
    referrals: '120 people',
    sales: '75 products',
    earned: '$6,890'
  },
  {
    name: 'Grace W.',
    initials: 'GW',
    duration: '1 year',
    referrals: '300 people',
    sales: '210 products',
    earned: '$18,450'
  }
]

const faqs = [
  {
    question: 'What\'s the difference between refer-earn and affiliate marketing?',
    answer: 'Refer-earn focuses on getting people to join platforms/services (people-based), while affiliate marketing focuses on promoting specific products/services (product-based). They often work together - you can refer people and then promote products to them.'
  },
  {
    question: 'How do I get paid for referrals and affiliate sales?',
    answer: 'Commissions are tracked automatically through your unique links. Payments are processed weekly via bank transfer, mobile money, or digital wallets once you reach the minimum payout threshold of $50.'
  },
  {
    question: 'Is there a limit to how much I can earn?',
    answer: 'No limits! Your earning potential is based on your network size and marketing efforts. Top performers earn $5,000+ monthly through combined referral bonuses and affiliate commissions.'
  },
  {
    question: 'Do I need a large social media following to succeed?',
    answer: 'Not necessarily. While social media helps, many successful referrers start with personal networks, email lists, or niche communities. Quality relationships often convert better than large audiences.'
  },
  {
    question: 'How are the referral levels calculated?',
    answer: 'Level 1: People you directly refer. Level 2: People referred by your Level 1 referrals. Level 3: People referred by your Level 2 referrals. You earn commissions from all three levels.'
  },
  {
    question: 'Can I combine refer-earn with other earning methods on the platform?',
    answer: 'Absolutely! Many members combine refer-earn with academic writing, surveys, and other opportunities. Your referrals can also participate in multiple earning methods, potentially increasing your commissions.'
  }
]
