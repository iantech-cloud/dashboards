//app/privacy/page.tsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            {/* Header Section */}
            <div className="text-center mb-12 border-b border-gray-200 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                Privacy Policy
              </h1>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">Effective Date:</span> January 1, 2025
                </div>
                <div>
                  <span className="font-semibold">Last Updated:</span> January 1, 2025
                </div>
              </div>
            </div>

            {/* Introduction */}
            <div className="mb-8">
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is important to us. This Privacy Policy explains how <strong>HustleHub Africa</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, stores, and protects your personal data when you use our website, services, or participate in our Refer & Earn Affiliate Program (&ldquo;Program&rdquo;).
              </p>
              <p className="text-gray-700 leading-relaxed">
                We are committed to safeguarding your privacy in accordance with:
              </p>
              <ul className="list-disc list-inside mt-3 ml-4 text-gray-700 space-y-1">
                <li>The General Data Protection Regulation (EU) 2016/679 (GDPR)</li>
                <li>The Kenya Data Protection Act (2019)</li>
                <li>Other applicable international privacy laws</li>
              </ul>
            </div>

            {/* Privacy Policy Content */}
            <div className="prose prose-lg max-w-none text-gray-700">
              
              {/* Section 1: Information We Collect */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">1. Information We Collect</h2>
                <p className="mb-4">We collect the following categories of information:</p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">a. Personal Identification Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Full name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Postal or billing address</li>
                      <li>National ID, passport, or tax identification number (where legally required)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">b. Account and Transaction Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Login credentials</li>
                      <li>Affiliate ID and referral activity</li>
                      <li>Commission and payout records</li>
                      <li>Payment details (e.g., bank, PayPal, or M-Pesa account information)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">c. Technical Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>IP address and browser type</li>
                      <li>Device identifiers and operating system</li>
                      <li>Cookies, analytics data, and website usage statistics</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">d. Communication Data</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Messages, support tickets, and feedback</li>
                      <li>Marketing preferences and opt-in choices</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 2: How We Use Your Information */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">2. How We Use Your Information</h2>
                <p className="mb-4">We use your personal data to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Register and manage your affiliate or user account</li>
                  <li>Process referrals, commissions, and payments</li>
                  <li>Communicate updates, policy changes, and marketing information (with consent)</li>
                  <li>Improve our website, services, and user experience</li>
                  <li>Comply with legal and regulatory obligations</li>
                  <li>Detect, prevent, and investigate fraud or misuse</li>
                </ul>
              </section>

              {/* Section 3: Lawful Basis for Processing */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">3. Lawful Basis for Processing</h2>
                <p className="mb-4">
                  We process your personal data under the following lawful bases (GDPR Article 6):
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="font-semibold text-indigo-600 mr-2">Contractual necessity:</span>
                      <span>To perform obligations under the affiliate or user agreement.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-indigo-600 mr-2">Consent:</span>
                      <span>For optional marketing communications and cookies.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-indigo-600 mr-2">Legitimate interest:</span>
                      <span>To improve our services and prevent fraud.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-indigo-600 mr-2">Legal obligation:</span>
                      <span>To comply with applicable financial and data protection laws.</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 4: Cookies and Tracking Technologies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">4. Cookies and Tracking Technologies</h2>
                <p className="mb-4">
                  Our website uses cookies to enhance functionality and improve user experience.
                </p>
                <p className="mb-4">
                  You can manage or disable cookies through your browser settings. However, some features may not function properly if cookies are disabled.
                </p>
                <p>
                  For more information, see our <a href="/cookies" className="text-indigo-600 hover:text-indigo-800 transition-colors">Cookie Policy</a> (if applicable).
                </p>
              </section>

              {/* Section 5: Data Sharing and Disclosure */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">5. Data Sharing and Disclosure</h2>
                <p className="mb-4 font-semibold">We do not sell or rent your personal information.</p>
                <p className="mb-4">We may share data only with trusted parties, including:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                  <li><strong>Service Providers:</strong> Payment processors, analytics platforms, and hosting providers</li>
                  <li><strong>Regulatory Authorities:</strong> When required by law or court order</li>
                  <li><strong>Business Partners:</strong> Only where necessary for referral tracking or payment fulfillment</li>
                </ul>
                <p>All third parties are bound by strict confidentiality and data protection obligations.</p>
              </section>

              {/* Section 6: International Data Transfers */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">6. International Data Transfers</h2>
                <p className="mb-4">
                  Your data may be stored and processed outside your country of residence.
                  Where we transfer data internationally (e.g., from Kenya or the EU), we ensure:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Adequate data protection safeguards (GDPR Article 46)</li>
                  <li>Standard Contractual Clauses or equivalent mechanisms</li>
                  <li>Compliance with Kenya&rsquo;s Data Protection (General) Regulations, 2021</li>
                </ul>
              </section>

              {/* Section 7: Data Retention */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">7. Data Retention</h2>
                <p className="mb-4">We retain your personal data only as long as necessary to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                  <li>Fulfill the purposes outlined in this Policy</li>
                  <li>Comply with legal, tax, or accounting requirements</li>
                </ul>
                <p>After the retention period, your data will be securely deleted or anonymized.</p>
              </section>

              {/* Section 8: Your Rights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">8. Your Rights</h2>
                <p className="mb-4">
                  Depending on your location, you have the right to:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Access your personal data we hold</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Rectify inaccurate or incomplete data</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Erase your data (&ldquo;right to be forgotten&rdquo;)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Restrict processing of your data</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Object to certain types of processing (e.g., marketing)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>Data portability – to receive your data in a structured, commonly used format</span>
                  </div>
                </div>
                <p>
                  To exercise these rights, contact us at <a href="mailto:support@hustlehubafrica.com" className="text-indigo-600 hover:text-indigo-800 transition-colors">support@hustlehubafrica.com</a>.
                  We will respond within 30 days as required by GDPR and Kenya&rsquo;s Data Protection Act.
                </p>
              </section>

              {/* Section 9: Data Security */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">9. Data Security</h2>
                <p className="mb-4">
                  We implement technical and organizational measures to protect your information, including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                  <li>Data encryption (SSL/TLS)</li>
                  <li>Secure servers and limited access control</li>
                  <li>Regular security audits and compliance checks</li>
                </ul>
                <p className="text-gray-600 italic">
                  However, no online transmission is completely secure, and we cannot guarantee absolute protection.
                </p>
              </section>

              {/* Section 10: Children's Privacy */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">10. Children&rsquo;s Privacy</h2>
                <p className="mb-4">
                  Our services are not intended for persons under 18 years of age.
                  We do not knowingly collect personal data from minors.
                </p>
                <p>
                  If we become aware that a minor&rsquo;s information has been collected, we will delete it promptly.
                </p>
              </section>

              {/* Section 11: Marketing Communications */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">11. Marketing Communications</h2>
                <p className="mb-4">
                  You may opt-in to receive promotional messages.
                  You can withdraw consent or unsubscribe anytime via the link in our emails or by contacting us directly.
                </p>
                <p>
                  We only send marketing communications in compliance with GDPR Article 7 and Kenya&rsquo;s Data Protection Act Section 37.
                </p>
              </section>

              {/* Section 12: Changes to This Privacy Policy */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">12. Changes to This Privacy Policy</h2>
                <p className="mb-4">
                  We may update this Privacy Policy from time to time.
                  Any changes will be posted on this page with an updated &ldquo;Effective Date.&rdquo;
                </p>
                <p>
                  Significant updates may be communicated via email or platform notifications.
                </p>
              </section>

              {/* Section 13: Contact Us */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">13. Contact Us</h2>
                <p className="mb-6">
                  If you have any questions, complaints, or requests related to this Privacy Policy, please contact:
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">HustleHub Africa</h3>
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
                  ✅ By using our services or participating in the Refer & Earn Program, you acknowledge that you have read and understood this Privacy Policy and agree to the collection and use of your data as described herein.
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

export default PrivacyPage;
