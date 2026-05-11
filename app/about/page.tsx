//app/about/page.tsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">
              About Us
            </h1>
            <p className="text-xl sm:text-2xl font-semibold mb-8">
              Welcome to HustleHub Africa
            </p>
            <p className="text-lg sm:text-xl opacity-90 leading-relaxed">
              At HustleHub Africa, we believe that every individual deserves the opportunity to earn, grow, and achieve financial independence—no matter where they are.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transforming Hustles into Sustainable Income
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                We are a Pan-African digital earning platform that empowers users with multiple, legitimate income streams in one secure and easy-to-use system.
              </p>
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 text-left">
                <p className="text-xl font-semibold text-indigo-800">
                  Our mission is simple: to transform everyday hustles into sustainable income opportunities through technology, innovation, and community support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Income Streams Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Multiple Income Streams, One Platform
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Choose how you want to earn. Combine multiple methods to maximize your income potential. HustleHub Africa offers a variety of flexible and rewarding earning options tailored to your lifestyle, skills, and goals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Refer & Earn */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Refer & Earn</h3>
                <p className="text-gray-700">
                  Invite friends and earn commissions on every successful referral. Build your network, grow your income, and help others discover new earning opportunities.
                </p>
              </div>

              {/* Spin to Win */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">🎰</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Spin to Win</h3>
                <p className="text-gray-700">
                  Try your luck daily! Spin the wheel and win instant cash rewards, bonuses, and exclusive prizes. Every spin gives you a chance to boost your income effortlessly.
                </p>
              </div>

              {/* Sell Electronic Airtime */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Sell Electronic Airtime</h3>
                <p className="text-gray-700">
                  Become an airtime vendor and start earning immediately. Buy and sell airtime at competitive rates from leading mobile providers and keep the profit margins.
                </p>
              </div>

              {/* Academic Writing */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Academic Writing</h3>
                <p className="text-gray-700">
                  Leverage your academic expertise to write essays, research papers, and academic projects for students and institutions worldwide. Turn your knowledge into income.
                </p>
              </div>

              {/* Research Surveys */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Research Surveys</h3>
                <p className="text-gray-700">
                  Share your opinions and insights by completing paid surveys from trusted brands and organizations. Your feedback helps shape products and services across industries.
                </p>
              </div>

              {/* Blogging / Content Writing */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">✍️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Blogging / Content Writing</h3>
                <p className="text-gray-700">
                  Showcase your writing skills and creativity. Produce high-quality blog posts, articles, and digital content for businesses and publishers globally—and get paid for it.
                </p>
              </div>

              {/* Sales & Marketing */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Sales & Marketing</h3>
                <p className="text-gray-700">
                  Earn through affiliate marketing and direct sales. Promote top products and services, drive conversions, and earn commissions for every successful transaction.
                </p>
              </div>

              {/* Spin Vouchers */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">🎁</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Spin Vouchers</h3>
                <p className="text-gray-700">
                  Redeem and trade vouchers earned from your spins. Convert them into cash, bonuses, or exclusive premium benefits within the HustleHub ecosystem.
                </p>
              </div>

              {/* Leadership Token */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">👑</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Leadership Token</h3>
                <p className="text-gray-700">
                  Grow your influence and leadership within the platform. Earn exclusive tokens as you rise through the ranks, unlocking premium opportunities and extra rewards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose HustleHub Africa?
              </h2>
              <p className="text-lg text-gray-700">
                We've built the most comprehensive earning platform designed specifically for African hustlers, freelancers, and digital entrepreneurs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: '🔒', title: 'Secure & Trusted', description: 'We use bank-grade security to protect your data, transactions, and personal information. Your safety is our top priority.' },
                { icon: '⚡', title: 'Instant Payouts', description: 'Enjoy fast and reliable withdrawals directly through M-Pesa. Access your money instantly—anytime, anywhere.' },
                { icon: '⚙️', title: 'Multiple Earning Methods', description: 'Diversify your income easily. With nine different earning options, you have complete freedom to choose what works best for you.' },
                { icon: '🤝', title: 'Community Support', description: 'Join a vibrant community of motivated earners across Africa. Our 24/7 support team is always ready to assist you.' },
                { icon: '⏰', title: 'Flexible Schedule', description: 'Work on your own terms. Choose when and how to earn—part-time or full-time, it’s all up to you.' },
                { icon: '🌍', title: 'Pan-African Platform', description: 'We proudly serve users across the continent with localized payment solutions and culturally relevant earning opportunities. HustleHub Africa is built for Africans, by Africans.' }
              ].map((feature, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-indigo-300 transition-colors">
                  <div className="text-2xl mb-3">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Start Earning in 4 Simple Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '1️⃣', title: 'Create Account', description: 'Sign up in minutes with your email and phone number. A one-time registration fee of KES 100 applies.' },
                { step: '2️⃣', title: 'Choose Your Hustle', description: 'Pick from 9 different earning methods that match your skills, passion, and lifestyle.' },
                { step: '3️⃣', title: 'Start Earning', description: 'Complete daily tasks, projects, or activities and watch your income grow every day.' },
                { step: '4️⃣', title: 'Withdraw Instantly', description: 'Request withdrawals anytime via M-Pesa, and receive your money within minutes.' }
              ].map((step, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-200">
                  <div className="text-3xl mb-4">{step.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-700 text-sm">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center px-8 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-lg text-lg"
              >
                Start Your Hustle Today
              </Link>
            </div>
          </div>
        </section>

        {/* Vision & Mission Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Vision */}
              <div className="text-center">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  To be Africa's most trusted and innovative digital earning hub—empowering millions to achieve financial freedom and economic inclusion through technology.
                </p>
              </div>

              {/* Mission */}
              <div className="text-center">
                <div className="text-4xl mb-4">💪</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  To simplify digital work and online earning by providing accessible, secure, and diverse income opportunities for all Africans.
                </p>
              </div>
            </div>

            {/* Final CTA */}
            <div className="text-center mt-16">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                  HustleHub Africa – Where Hustle Meets Opportunity.
                </h3>
                <p className="text-lg opacity-90 mb-6">
                  Join thousands of Africans who are already transforming their financial future.
                </p>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center px-8 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Get Started Now
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
