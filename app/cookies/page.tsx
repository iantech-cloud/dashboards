//app/cookies/page.tsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CookiesPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            {/* Header Section */}
            <div className="text-center mb-12 border-b border-gray-200 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                Cookies Policy
              </h1>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">Effective Date:</span> January 1, 2025
                </div>
                <div>
                  <span className="font-semibold">Last Updated:</span> January 1, 2025
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                HustleHub Africa Limited, A subsidiary of Platinum Ends Enterprise
              </p>
            </div>

            {/* Introduction */}
            <div className="mb-8">
              <p className="text-gray-700 leading-relaxed">
                This Cookies Policy explains how <strong>HustleHub Africa Limited</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies and similar tracking technologies on our website and online services.
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                By using our website, you consent to the use of cookies in accordance with this Policy, unless you disable them through your browser or our cookie consent settings.
              </p>
            </div>

            {/* Cookies Policy Content */}
            <div className="prose prose-lg max-w-none text-gray-700">
              
              {/* Section 1: What Are Cookies? */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">1. What Are Cookies?</h2>
                <p className="mb-4">
                  Cookies are small text files placed on your device (computer, tablet, or mobile) when you visit a website.
                  They help websites function properly, improve performance, and provide analytical or personalized information to enhance your browsing experience.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-4">
                  <h3 className="font-semibold text-blue-800 mb-3">Cookies may be:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">Session cookies</h4>
                      <p className="text-sm text-gray-700">Temporary files deleted when you close your browser</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Persistent cookies</h4>
                      <p className="text-sm text-gray-700">Stored on your device until they expire or are manually deleted</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">First-party cookies</h4>
                      <p className="text-sm text-gray-700">Set by our domain</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Third-party cookies</h4>
                      <p className="text-sm text-gray-700">Set by other websites providing services such as analytics, ads, or embedded content</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Types of Cookies We Use */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">2. Types of Cookies We Use</h2>
                <p className="mb-6">We use the following categories of cookies:</p>
                
                <div className="space-y-6">
                  <div className="border-l-4 border-green-500 pl-4 bg-green-50 py-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">a. Strictly Necessary Cookies</h3>
                    <p className="mb-2">These cookies are essential for website functionality. They enable core features such as login, security, and payment processing.</p>
                    <p className="text-sm text-gray-600 italic">Without these cookies, the website may not operate correctly.</p>
                    <p className="mt-2 text-sm font-medium">Example: Session management, CSRF protection, authentication tokens</p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 py-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">b. Performance and Analytics Cookies</h3>
                    <p className="mb-2">These cookies help us understand how visitors interact with our website by collecting anonymous usage data. This allows us to improve content, navigation, and functionality.</p>
                    <p className="text-sm font-medium">Example: Google Analytics, Matomo, or other traffic analysis tools</p>
                    <p className="mt-2 text-sm text-gray-600">All analytics cookies are anonymized where possible and only activated with your consent (as per GDPR Article 6(1)(a))</p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 py-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">c. Functional Cookies</h3>
                    <p className="mb-2">These cookies remember your preferences and choices, such as:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Language selection</li>
                      <li>Region settings</li>
                      <li>Display preferences</li>
                    </ul>
                    <p className="mt-2 text-sm text-gray-600">They make your experience smoother but are optional</p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4 bg-orange-50 py-3">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">d. Advertising and Marketing Cookies</h3>
                    <p className="mb-2">These cookies track your browsing activity to deliver personalized advertisements or affiliate offers relevant to your interests. They may be set by third-party networks such as Google Ads, Meta (Facebook), or affiliate programs.</p>
                    <p className="text-sm font-medium">You can opt out of marketing cookies through your consent preferences</p>
                  </div>
                </div>
              </section>

              {/* Section 3: Third-Party Cookies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">3. Third-Party Cookies</h2>
                <p className="mb-4">
                  We may allow trusted third parties to place cookies for analytics, advertising, or referral tracking purposes.
                  Examples include:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                  <li><strong>Google Analytics</strong> (performance tracking)</li>
                  <li><strong>Facebook Pixel</strong> (ad conversion tracking)</li>
                  <li><strong>CJ Affiliate / Amazon / Other networks</strong> (affiliate referral tracking)</li>
                </ul>
                <p className="mb-4">
                  We have no control over third-party cookies once placed.
                  You are encouraged to review their respective privacy and cookie policies.
                </p>
              </section>

              {/* Section 4: How We Use Cookie Data */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">4. How We Use Cookie Data</h2>
                <p className="mb-4">Cookie data helps us to:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>Maintain secure user sessions</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>Track affiliate referrals and commissions</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>Measure website performance and traffic patterns</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>Deliver relevant marketing campaigns</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>Improve platform usability and support</span>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  We do not use cookies to collect sensitive personal information such as passwords or financial details.
                </p>
              </section>

              {/* Section 5: Managing Your Cookie Preferences */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">5. Managing Your Cookie Preferences</h2>
                <p className="mb-4">
                  When you first visit our site, a cookie banner appears, allowing you to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
                  <li>Accept all cookies</li>
                  <li>Reject non-essential cookies</li>
                  <li>Customize cookie settings</li>
                </ul>

                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                  <h3 className="font-semibold text-yellow-800 mb-4">Browser Cookie Controls</h3>
                  <p className="mb-4">You may also manage cookies through your browser settings. Here&rsquo;s how you can control them:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-gray-800">Google Chrome</h4>
                      <p className="text-gray-700">Settings → Privacy and Security → Cookies and other site data</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Mozilla Firefox</h4>
                      <p className="text-gray-700">Options → Privacy & Security → Cookies and Site Data</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Safari</h4>
                      <p className="text-gray-700">Preferences → Privacy → Block all cookies</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Microsoft Edge</h4>
                      <p className="text-gray-700">Settings → Cookies and site permissions</p>
                    </div>
                  </div>
                  <p className="mt-4 text-yellow-700 font-medium">
                    Please note: disabling cookies may affect certain features or functionality.
                  </p>
                </div>
              </section>

              {/* Section 6: Legal Basis for Cookie Use */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">6. Legal Basis for Cookie Use</h2>
                <p className="mb-4">
                  Under the GDPR (Article 6) and Kenya&rsquo;s Data Protection Act (Sections 25–30), we rely on:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-indigo-600 mb-2">Consent</h3>
                    <p className="text-sm text-gray-700">for all non-essential cookies (analytics, marketing, etc.)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-indigo-600 mb-2">Legitimate Interest</h3>
                    <p className="text-sm text-gray-700">for essential cookies required for website operation</p>
                  </div>
                </div>
                <p className="mt-4">
                  You can withdraw consent at any time via our Cookie Preferences tool.
                </p>
              </section>

              {/* Section 7: Data Retention */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">7. Data Retention</h2>
                <p className="mb-4">Cookies are stored for varying durations:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="text-center bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-2">Session cookies</h3>
                    <p className="text-sm text-gray-700">deleted when your browser closes</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-2">Persistent cookies</h3>
                    <p className="text-sm text-gray-700">retained for a maximum of 12 months, unless otherwise specified</p>
                  </div>
                </div>
                <p className="text-gray-600">
                  After expiry, cookies are automatically removed or renewed upon your next visit (with your consent).
                </p>
              </section>

              {/* Section 8: Updates to This Policy */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">8. Updates to This Policy</h2>
                <p className="mb-4">
                  We may update this Cookies Policy periodically to reflect legal or technical changes.
                  The latest version will always be available on this page, with the &ldquo;Last Updated&rdquo; date clearly shown.
                </p>
              </section>

              {/* Section 9: Contact Us */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">9. Contact Us</h2>
                <p className="mb-6">
                  For questions about this Cookies Policy or our use of cookies, please contact us at:
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">HustleHub Africa Limited</h3>
                      <p className="text-sm text-gray-600">A subsidiary of Platinum Ends Enterprise</p>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-xl">📧</span>
                      <a 
                        href="mailto:support@hustlehubafrica.com" 
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        support@hustlehubafrica.com
                      </a>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-xl">🌍</span>
                      <a 
                        href="https://hustlehubafrica.com" 
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        https://hustlehubafrica.com
                      </a>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-xl">📍</span>
                      <span>Nairobi, Kenya</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Acceptance Notice */}
              <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold text-center">
                  ✅ By continuing to use our website, you acknowledge that you have read and understood this Cookies Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiesPage;
