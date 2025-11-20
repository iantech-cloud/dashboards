import type { Metadata } from 'next'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Sales & Marketing Jobs | Digital Marketing Opportunities | HustleHub Africa',
  description: 'Earn through sales commissions and digital marketing. Promote products, generate leads, and build your marketing career. Join Africa\'s fastest-growing sales platform.',
  keywords: 'sales jobs, marketing opportunities, affiliate marketing, digital marketing, commission-based sales, lead generation, brand promotion, sales representative jobs Africa',
  authors: [{ name: 'HustleHub Africa' }],
  creator: 'HustleHub Africa',
  publisher: 'HustleHub Africa',
  robots: 'index, follow, max-image-preview:large',
  openGraph: {
    title: 'Sales & Marketing Jobs | Digital Marketing Opportunities | HustleHub Africa',
    description: 'Earn through sales commissions and digital marketing. Promote products and build your marketing career.',
    url: 'https://hustlehubafrica.com/sales-marketing',
    siteName: 'HustleHub Africa',
    images: [
      {
        url: '/sales-marketing-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Sales & Marketing Jobs - HustleHub Africa',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sales & Marketing Jobs | HustleHub Africa',
    description: 'Earn through sales commissions and digital marketing opportunities.',
    images: ['/sales-marketing-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://hustlehubafrica.com/sales-marketing',
  },
}

export default function SalesMarketing() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Sales & <span className="text-green-600">Marketing</span> Excellence
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Master the art of selling and marketing. Earn commissions, build brands, and develop career skills that last a lifetime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105">
                  Start Selling Now
                </button>
                <button className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                  View Opportunities
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-green-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">2,000+</div>
                <div className="text-green-100">Active Marketers</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$500K+</div>
                <div className="text-green-100">Total Commissions</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">150+</div>
                <div className="text-green-100">Partner Brands</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">4.9/5</div>
                <div className="text-green-100">Success Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Sales & Marketing Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              What is Sales & Marketing?
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg text-gray-600 mb-6">
                  Sales and marketing are the driving forces behind business growth. While often used together, they serve distinct but complementary purposes in the customer journey.
                </p>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <h3 className="font-semibold text-gray-900 mb-2">Marketing</h3>
                    <p className="text-gray-600">Creating awareness, generating interest, and building brand reputation through various channels and strategies.</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-semibold text-gray-900 mb-2">Sales</h3>
                    <p className="text-gray-600">Converting interested prospects into paying customers through direct interaction and relationship building.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">The Perfect Partnership</h3>
                <p className="text-gray-600 mb-4">
                  Marketing creates the runway for sales to take off. Together, they form a powerful engine for business growth and customer acquisition.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Marketing generates leads, sales closes them</li>
                  <li>• Marketing builds brand, sales builds relationships</li>
                  <li>• Marketing creates demand, sales fulfills it</li>
                  <li>• Marketing is science, sales is art</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sales Opportunities */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Sales Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {salesOpportunities.map((opportunity, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 border-t-4 border-green-500">
                  <div className="text-green-600 text-2xl mb-4">{opportunity.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{opportunity.title}</h3>
                  <p className="text-gray-600 mb-4">{opportunity.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Commission: {opportunity.commission}</span>
                    <span>Payout: {opportunity.payout}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Marketing Opportunities */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Marketing Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {marketingOpportunities.map((opportunity, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 border-t-4 border-blue-500">
                  <div className="text-blue-600 text-2xl mb-4">{opportunity.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{opportunity.title}</h3>
                  <p className="text-gray-600 mb-4">{opportunity.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Earning: {opportunity.earning}</span>
                    <span>Flexibility: {opportunity.flexibility}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sales Process */}
        <section className="py-16 bg-green-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              The Sales Process
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {salesProcess.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Marketing Strategies */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Digital Marketing Strategies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {marketingStrategies.map((strategy, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{strategy.title}</h3>
                  <p className="text-gray-600 mb-4">{strategy.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.tools.map((tool, toolIndex) => (
                      <span key={toolIndex} className="bg-white px-3 py-1 rounded-full text-sm text-gray-600 border">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Skills Development */}
        <section className="py-16 bg-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Essential Skills You'll Develop
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {skills.map((skill, index) => (
                <div key={index} className="bg-white p-6 rounded-lg text-center shadow-md">
                  <div className="text-blue-600 text-3xl mb-3">{skill.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{skill.title}</h3>
                  <p className="text-sm text-gray-600">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Success Stories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {successStories.map((story, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold mr-4">
                      {story.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{story.name}</h3>
                      <p className="text-sm text-gray-600">{story.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{story.quote}"</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Earnings: {story.earnings}</span>
                    <span>Joined: {story.joined}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-green-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your Sales & Marketing Career?
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Join thousands of successful marketers and sales professionals. No experience required - we provide training and support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-green-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg text-lg transition duration-300 transform hover:scale-105">
                Start Earning Today
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-green-600 font-bold py-4 px-8 rounded-lg text-lg transition duration-300">
                Download Training Guide
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md">
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
const salesOpportunities = [
  {
    icon: '🏠',
    title: 'Direct Sales',
    description: 'Sell products directly to customers through personal networks and community outreach.',
    commission: '10-25%',
    payout: 'Weekly'
  },
  {
    icon: '📞',
    title: 'Telemarketing',
    description: 'Reach potential customers through phone calls and convert leads into sales.',
    commission: '15-30%',
    payout: 'Bi-weekly'
  },
  {
    icon: '🤝',
    title: 'B2B Sales',
    description: 'Sell products and services to other businesses and corporate clients.',
    commission: '20-40%',
    payout: 'Monthly'
  },
  {
    icon: '🛒',
    title: 'Retail Sales',
    description: 'Work with partner retail stores to promote and sell products to walk-in customers.',
    commission: '8-20%',
    payout: 'Weekly'
  },
  {
    icon: '🌐',
    title: 'Online Sales',
    description: 'Sell products through digital platforms, social media, and e-commerce channels.',
    commission: '12-25%',
    payout: 'Instant'
  },
  {
    icon: '📊',
    title: 'Enterprise Sales',
    description: 'Handle large corporate accounts and negotiate bulk purchase deals.',
    commission: '25-50%',
    payout: 'Project-based'
  }
]

const marketingOpportunities = [
  {
    icon: '📱',
    title: 'Social Media Marketing',
    description: 'Promote brands and products through social media platforms and influencer marketing.',
    earning: '$200-$2000/month',
    flexibility: 'High'
  },
  {
    icon: '✍️',
    title: 'Content Marketing',
    description: 'Create engaging content, blog posts, and articles to attract and retain customers.',
    earning: '$15-$50/article',
    flexibility: 'Very High'
  },
  {
    icon: '🔍',
    title: 'SEO Marketing',
    description: 'Optimize websites and content to rank higher in search engine results.',
    earning: '$300-$1500/project',
    flexibility: 'Medium'
  },
  {
    icon: '📧',
    title: 'Email Marketing',
    description: 'Create and manage email campaigns to nurture leads and drive conversions.',
    earning: '$25-$100/campaign',
    flexibility: 'High'
  },
  {
    icon: '🎬',
    title: 'Video Marketing',
    description: 'Create promotional videos and content for brands and products.',
    earning: '$50-$500/video',
    flexibility: 'Medium'
  },
  {
    icon: '📈',
    title: 'Digital Advertising',
    description: 'Manage paid advertising campaigns across various digital platforms.',
    earning: '20-30% of ad spend',
    flexibility: 'Medium'
  }
]

const salesProcess = [
  {
    title: 'Prospecting',
    description: 'Identify potential customers'
  },
  {
    title: 'Approach',
    description: 'Make initial contact'
  },
  {
    title: 'Presentation',
    description: 'Showcase value proposition'
  },
  {
    title: 'Handling Objections',
    description: 'Address concerns'
  },
  {
    title: 'Closing',
    description: 'Secure the deal'
  }
]

const marketingStrategies = [
  {
    title: 'Content Marketing',
    description: 'Create valuable content to attract and engage target audience through blogs, videos, and social media.',
    tools: ['WordPress', 'Canva', 'Google Analytics', 'SEMrush']
  },
  {
    title: 'Social Media Marketing',
    description: 'Leverage social platforms to build brand awareness and engage with potential customers.',
    tools: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok']
  },
  {
    title: 'Email Marketing',
    description: 'Nurture leads and maintain customer relationships through targeted email campaigns.',
    tools: ['Mailchimp', 'ConvertKit', 'ActiveCampaign', 'HubSpot']
  },
  {
    title: 'Search Engine Optimization',
    description: 'Optimize online content to improve visibility in organic search results.',
    tools: ['Google Search Console', 'Ahrefs', 'Moz', 'Yoast SEO']
  }
]

const skills = [
  {
    icon: '💬',
    title: 'Communication',
    description: 'Master verbal and written communication for effective persuasion'
  },
  {
    icon: '🎯',
    title: 'Negotiation',
    description: 'Learn to negotiate win-win deals and close sales effectively'
  },
  {
    icon: '📊',
    title: 'Analytics',
    description: 'Understand data to measure performance and optimize strategies'
  },
  {
    icon: '🎨',
    title: 'Creativity',
    description: 'Develop creative marketing campaigns that stand out'
  },
  {
    icon: '👥',
    title: 'Relationship Building',
    description: 'Build lasting relationships with customers and partners'
  },
  {
    icon: '⏰',
    title: 'Time Management',
    description: 'Manage multiple clients and projects efficiently'
  },
  {
    icon: '💰',
    title: 'Financial Literacy',
    description: 'Understand commissions, pricing, and revenue models'
  },
  {
    icon: '🌍',
    title: 'Digital Literacy',
    description: 'Master digital tools and platforms for modern marketing'
  }
]

const successStories = [
  {
    name: 'Sarah K.',
    initials: 'SK',
    role: 'Social Media Marketer',
    quote: 'Started with zero experience, now earning $3,000 monthly managing social media for 5 brands.',
    earnings: '$3,000/month',
    joined: '6 months ago'
  },
  {
    name: 'David M.',
    initials: 'DM',
    role: 'Sales Representative',
    quote: 'The training transformed my approach to sales. I went from shy to confident closer in 3 months.',
    earnings: '$4,500/month',
    joined: '1 year ago'
  },
  {
    name: 'Grace W.',
    initials: 'GW',
    role: 'Content Marketer',
    quote: 'Built my freelance business from scratch. Now I have a waiting list of clients wanting my services.',
    earnings: '$2,800/month',
    joined: '8 months ago'
  }
]

const faqs = [
  {
    question: 'Do I need previous sales or marketing experience?',
    answer: 'No prior experience is required. We provide comprehensive training, resources, and mentorship to help you succeed. Many of our top performers started with no background in sales or marketing.'
  },
  {
    question: 'How much can I realistically earn?',
    answer: 'Earnings vary based on your effort, skills, and the opportunities you pursue. Entry-level marketers typically earn $200-$800 monthly, while experienced professionals can earn $2,000-$10,000+ monthly through various commission structures and projects.'
  },
  {
    question: 'What tools and resources do you provide?',
    answer: 'We provide access to sales scripts, marketing templates, CRM tools, training materials, webinars, and a supportive community. You\'ll also get mentorship from experienced sales and marketing professionals.'
  },
  {
    question: 'How flexible is the work schedule?',
    answer: 'Complete flexibility. You can work full-time or part-time, during hours that suit you. Most opportunities allow you to work remotely from anywhere with internet access.'
  },
  {
    question: 'What types of products will I be marketing?',
    answer: 'We partner with various brands across different industries including technology, education, finance, healthcare, and consumer goods. You can choose products that align with your interests and expertise.'
  },
  {
    question: 'Is there any cost to join?',
    answer: 'No, joining our sales and marketing program is completely free. We believe in providing equal opportunities for everyone to earn and grow their skills without financial barriers.'
  }
]
