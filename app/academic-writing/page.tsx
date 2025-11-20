import type { Metadata } from 'next'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Academic Writing Jobs | Professional Writing Opportunities | HustleHub Africa',
  description: 'Earn money through academic writing jobs. Professional writing opportunities for researchers, students, and writers. Join HustleHub Africa for legitimate academic writing gigs.',
  keywords: 'academic writing jobs, writing opportunities, research papers, essay writing, thesis writing, literature reviews, academic editing, writing gigs Africa',
  authors: [{ name: 'HustleHub Africa' }],
  creator: 'HustleHub Africa',
  publisher: 'HustleHub Africa',
  robots: 'index, follow, max-image-preview:large',
  openGraph: {
    title: 'Academic Writing Jobs | Professional Writing Opportunities | HustleHub Africa',
    description: 'Earn money through academic writing jobs. Professional writing opportunities for researchers, students, and writers.',
    url: 'https://hustlehubafrica.com/academic-writing',
    siteName: 'HustleHub Africa',
    images: [
      {
        url: '/academic-writing-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Academic Writing Jobs - HustleHub Africa',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Academic Writing Jobs | HustleHub Africa',
    description: 'Earn money through academic writing jobs. Professional writing opportunities for researchers and writers.',
    images: ['/academic-writing-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://hustlehubafrica.com/academic-writing',
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function AcademicWriting() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Academic Writing <span className="text-blue-600">Opportunities</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Turn your writing skills into steady income. Join our platform of academic professionals and earn from writing assignments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105">
                  Start Writing Now
                </button>
                <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="text-blue-100">Active Writers</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$50K+</div>
                <div className="text-blue-100">Paid to Writers</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">4.8/5</div>
                <div className="text-blue-100">Client Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Why Choose Academic Writing with Us?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
                  <div className="text-blue-600 text-2xl mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Writing Categories */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Writing Categories Available
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-blue-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your Academic Writing Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of writers already earning with their skills. No experience required to start.
            </p>
            <button className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-12 rounded-lg text-lg transition duration-300 transform hover:scale-105">
              Get Started Today
            </button>
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
const benefits = [
  {
    icon: '💰',
    title: 'Competitive Pay',
    description: 'Earn competitive rates for your writing skills with timely payments and transparent pricing.'
  },
  {
    icon: '📚',
    title: 'Various Topics',
    description: 'Write on diverse academic subjects and expand your knowledge across different fields.'
  },
  {
    icon: '⏰',
    title: 'Flexible Schedule',
    description: 'Work whenever you want from anywhere. Choose assignments that fit your schedule.'
  },
  {
    icon: '🚀',
    title: 'Skill Development',
    description: 'Enhance your research and writing skills while working on real academic projects.'
  },
  {
    icon: '🛡️',
    title: 'Secure Platform',
    description: 'Work with confidence on our secure platform with guaranteed payments and client protection.'
  },
  {
    icon: '👥',
    title: 'Support Community',
    description: 'Join a community of writers and get support from our team whenever you need help.'
  }
]

const categories = [
  {
    name: 'Research Papers',
    description: 'Comprehensive research papers across all academic disciplines'
  },
  {
    name: 'Essays & Assignments',
    description: 'Academic essays, assignments, and coursework writing'
  },
  {
    name: 'Thesis & Dissertations',
    description: 'Master\'s and PhD level thesis and dissertation writing'
  },
  {
    name: 'Literature Reviews',
    description: 'Systematic literature reviews and critical analyses'
  },
  {
    name: 'Case Studies',
    description: 'Detailed case studies for business and academic purposes'
  },
  {
    name: 'Editing & Proofreading',
    description: 'Professional editing and proofreading services'
  },
  {
    name: 'Article Writing',
    description: 'Academic articles for journals and publications'
  },
  {
    name: 'Technical Writing',
    description: 'Technical documentation and scientific writing'
  }
]

const steps = [
  {
    title: 'Sign Up & Create Profile',
    description: 'Register on our platform and create a detailed writer profile showcasing your expertise and qualifications.'
  },
  {
    title: 'Browse Available Projects',
    description: 'Explore available writing projects that match your skills and interests across various academic fields.'
  },
  {
    title: 'Submit & Get Paid',
    description: 'Submit your completed work, receive feedback, and get paid securely through our payment system.'
  }
]

const faqs = [
  {
    question: 'What qualifications do I need to become an academic writer?',
    answer: 'You need at least a Bachelor\'s degree in your field of expertise. Strong writing skills, research ability, and subject knowledge are essential. We verify qualifications during the application process.'
  },
  {
    question: 'How much can I earn as an academic writer?',
    answer: 'Earnings vary based on project complexity, your expertise, and turnaround time. Writers typically earn between $15-$50 per page depending on the assignment type and urgency.'
  },
  {
    question: 'How are payments processed?',
    answer: 'Payments are processed securely through our platform. You can choose from multiple payment methods including bank transfer, mobile money, or digital wallets. Payments are made upon project completion and approval.'
  },
  {
    question: 'Is there a minimum commitment required?',
    answer: 'No, you can work as much or as little as you want. Our platform is designed for flexibility, allowing you to choose projects that fit your schedule and availability.'
  },
  {
    question: 'What kind of support do you provide to writers?',
    answer: 'We provide 24/7 support through our help desk, writing resources, style guides, and a community forum where writers can share experiences and get advice from peers.'
  }
]
