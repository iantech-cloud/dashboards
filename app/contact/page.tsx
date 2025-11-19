// app/contact/page.tsx
'use client';

import { useState } from 'react';
import Head from 'next/head';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      console.log('📤 Submitting contact form...', formData);

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('📨 API Response:', result);

      if (response.ok && result.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Track conversion in Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'contact_form_submit', {
            event_category: 'Contact',
            event_label: 'Contact Form Submission'
          });
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('❌ Form submission error:', error);
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // JSON-LD Structured Data for Contact Page
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    'name': 'Contact HustleHub Africa',
    'description': 'Get in touch with HustleHub Africa for questions about making money online, digital skills, and growing your business in Kenya and across Africa.',
    'url': `${process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'}/contact`,
    'mainEntity': {
      '@type': 'Organization',
      'name': 'HustleHub Africa',
      'description': 'Africa\'s Premier Earning Platform helping individuals and businesses succeed in the digital economy.',
      'url': process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com',
      'email': 'hello@hustlehubafrica.com',
      'telephone': '+254-748-264-231',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': 'Nairobi',
        'addressCountry': 'Kenya',
        'addressRegion': 'Nairobi County'
      },
      'sameAs': [
        'https://twitter.com/hustlehubafrica',
        'https://facebook.com/hustlehubafrica',
        'https://instagram.com/hustlehubafrica',
        'https://youtube.com/hustlehubafrica'
      ]
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us - HustleHub Africa | Get Help & Support</title>
        <meta 
          name="description" 
          content="Contact HustleHub Africa for support with online earning, digital skills, and business growth in Kenya. Get help with affiliate marketing, content writing, and more." 
        />
        <meta name="keywords" content="contact HustleHub Africa, Kenya online earning support, digital skills help, affiliate marketing Kenya, content writing jobs, online business support" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Social Media Meta Tags */}
        <meta property="og:title" content="Contact HustleHub Africa | Get Help & Support" />
        <meta property="og:description" content="Get in touch with HustleHub Africa for support with online earning, digital skills, and business growth across Africa." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'}/contact`} />
        <meta property="og:image" content={`${process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'}/images/contact-og-image.jpg`} />
        <meta property="og:site_name" content="HustleHub Africa" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact HustleHub Africa | Get Help & Support" />
        <meta name="twitter:description" content="Get in touch with HustleHub Africa for support with online earning, digital skills, and business growth across Africa." />
        <meta name="twitter:image" content={`${process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'}/images/contact-twitter-image.jpg`} />
        <meta name="twitter:site" content="@hustlehubafrica" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`${process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com'}/contact`} />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        
        {/* Additional Meta Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="HustleHub Africa" />
        <meta name="language" content="en" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Geo Location Meta Tags */}
        <meta name="geo.region" content="KE-NAIROBI" />
        <meta name="geo.placename" content="Nairobi" />
        <meta name="geo.position" content="-1.292066;36.821946" />
        <meta name="ICBM" content="-1.292066, 36.821946" />
      </Head>

      {/* Header Component */}
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
            </li>
            <li className="flex items-center">
              <svg className="h-4 w-4 mx-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-600 font-medium">Contact Us</span>
            </li>
          </ol>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section with Enhanced SEO */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Contact <span className="text-blue-600">HustleHub Africa</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Have questions about making money online, digital skills, or growing your business in{' '}
              <strong>Kenya and across Africa</strong>? We're here to help you succeed in the digital economy.
            </p>
            
            {/* Trust Indicators */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                24-48 Hour Response
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Expert Support Team
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Free Consultations
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Contact Information - Enhanced for Local SEO */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Get In Touch</h2>
                
                <div className="space-y-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Email Us</h3>
                      <p className="text-gray-600 mt-2">
                        <a href="mailto:hello@hustlehubafrica.com" className="hover:text-blue-600 transition-colors">
                          hello@hustlehubafrica.com
                        </a>
                      </p>
                      <p className="text-gray-600">
                        <a href="mailto:support@hustlehubafrica.com" className="hover:text-blue-600 transition-colors">
                          support@hustlehubafrica.com
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Based In Kenya</h3>
                      <p className="text-gray-600 mt-2">Nairobi, Kenya</p>
                      <p className="text-gray-600">Serving All of Africa</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <strong>Local SEO Focus:</strong> Kenya, Nairobi, East Africa
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
                      <p className="text-gray-600 mt-2">Within 24-48 hours</p>
                      <p className="text-gray-600">Monday - Friday, 9AM - 6PM EAT</p>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Follow Our Journey</h3>
                  <div className="flex space-x-4">
                    <a 
                      href="https://twitter.com/hustlehubafrica" 
                      aria-label="Follow us on Twitter"
                      className="text-gray-400 hover:text-blue-400 transition-colors transform hover:scale-110"
                    >
                      <span className="sr-only">Twitter</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a 
                      href="https://facebook.com/hustlehubafrica" 
                      aria-label="Like us on Facebook"
                      className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110"
                    >
                      <span className="sr-only">Facebook</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a 
                      href="https://instagram.com/hustlehubafrica" 
                      aria-label="Follow us on Instagram"
                      className="text-gray-400 hover:text-pink-600 transition-colors transform hover:scale-110"
                    >
                      <span className="sr-only">Instagram</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.611-2.448-2.238V9.25c0-1.627 1.151-2.238 2.448-2.238h7.138c1.297 0 2.448.611 2.448 2.238v5.5c0 1.627-1.151 2.238-2.448 2.238H8.449z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M12.996 9.972a2.015 2.015 0 11-4.03 0 2.015 2.015 0 014.03 0z" clipRule="evenodd" />
                        <circle cx="15.515" cy="8.497" r="0.735" />
                      </svg>
                    </a>
                    <a 
                      href="https://youtube.com/hustlehubafrica" 
                      aria-label="Subscribe to our YouTube channel"
                      className="text-gray-400 hover:text-red-600 transition-colors transform hover:scale-110"
                    >
                      <span className="sr-only">YouTube</span>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form - Enhanced for Conversions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Send us a Message</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Ready to start your online earning journey? Have questions about{' '}
                    <strong>affiliate marketing in Kenya, content writing jobs, or digital skills</strong>? 
                    We're here to help you succeed.
                  </p>
                </div>
                
                {submitStatus === 'success' && (
                  <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-green-800 font-semibold text-lg mb-2">
                          Thank you for your message!
                        </p>
                        <p className="text-green-700">
                          We've sent a confirmation to your email and will get back to you within 24-48 hours. 
                          Check your spam folder if you don't see our email.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-red-800 font-semibold text-lg mb-2">
                          Oops! Something went wrong
                        </p>
                        <p className="text-red-700">
                          {errorMessage || 'Failed to send message. Please try again or email us directly.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter your full name"
                        aria-describedby="name-help"
                      />
                      <p id="name-help" className="mt-1 text-sm text-gray-500">We prefer to address you by your real name</p>
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="your.email@example.com"
                        aria-describedby="email-help"
                      />
                      <p id="email-help" className="mt-1 text-sm text-gray-500">We'll send a confirmation to this address</p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                      How can we help you? *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-describedby="subject-help"
                    >
                      <option value="">Select the best category for your inquiry</option>
                      <option value="affiliate-marketing">Affiliate Marketing in Kenya</option>
                      <option value="content-writing">Content Writing Jobs</option>
                      <option value="online-earning">Online Earning Opportunities</option>
                      <option value="digital-skills">Digital Skills Training</option>
                      <option value="business-partnership">Business Partnership</option>
                      <option value="advertising">Advertising & Sponsorship</option>
                      <option value="technical-support">Technical Support</option>
                      <option value="content-submission">Content Submission</option>
                      <option value="other">Other Inquiry</option>
                    </select>
                    <p id="subject-help" className="mt-1 text-sm text-gray-500">Choose the topic that best matches your question</p>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Tell us about your online earning goals, questions about digital skills in Kenya, or how we can help you grow your business..."
                      minLength={10}
                      maxLength={5000}
                      aria-describedby="message-help"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p id="message-help" className="text-sm text-gray-500">
                        Please provide detailed information so we can help you better
                      </p>
                      <span className={`text-sm ${formData.message.length > 4500 ? 'text-red-500' : 'text-gray-500'}`}>
                        {formData.message.length}/5000
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-blue-700 text-sm">
                        <strong>Pro Tip:</strong> Mention your specific interests like "affiliate marketing in Kenya" or 
                        "content writing jobs" for faster and more relevant assistance.
                      </p>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending Your Message...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Message & Start Your Journey
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Enhanced FAQ Section with Local SEO Keywords */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      How can I start with affiliate marketing in Kenya?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      We provide comprehensive guidance on starting affiliate marketing in Kenya, 
                      including platform recommendations, legal requirements, and success strategies 
                      tailored for the Kenyan market. Select "Affiliate Marketing" in the subject field above.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      What online writing jobs are available in Kenya?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Kenya has numerous opportunities in content writing, copywriting, academic writing, 
                      and technical writing. We help connect you with legitimate platforms and clients. 
                      Choose "Content Writing Jobs" for specific assistance.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Do you offer digital skills training for beginners?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Yes! We provide resources and guidance for digital skills including social media marketing, 
                      SEO, web development, and e-commerce specifically designed for African entrepreneurs 
                      and job seekers.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      How quickly will I receive a response?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      We typically respond within 24-48 hours during business days. For urgent matters 
                      related to payments or technical issues, we prioritize those requests.
                    </p>
                  </div>
                </div>

                {/* Local SEO Keywords Section */}
                <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    Popular Topics We Help With in Kenya
                  </h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      'Affiliate Marketing Kenya',
                      'Online Writing Jobs Nairobi',
                      'Digital Skills Training',
                      'Make Money Online Kenya',
                      'Content Writing Opportunities',
                      'Freelance Writing Kenya',
                      'E-commerce Kenya',
                      'Social Media Marketing'
                    ].map((topic) => (
                      <span 
                        key={topic}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-default"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Component */}
      <Footer />
    </>
  );
}
