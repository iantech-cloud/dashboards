//app/terms/page.tsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            {/* Header Section */}
            <div className="text-center mb-12 border-b border-gray-200 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                Refer & Earn Affiliate Program – Terms and Conditions
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
              <p className="text-gray-700 leading-relaxed">
                Welcome to our <strong>Refer & Earn Affiliate Program</strong> (&ldquo;Program&rdquo;). 
                These Terms and Conditions (&ldquo;Terms&rdquo;) govern your participation in the Program. 
                By joining, you agree to comply with and be bound by these Terms. Please read them carefully before participating.
              </p>
            </div>

            {/* Terms Content */}
            <div className="prose prose-lg max-w-none text-gray-700">
              
              {/* Section 1: Definitions */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">1. Definitions</h2>
                <ul className="space-y-3">
                  <li>
                    <strong>Company, We, Us, or Our</strong> – refers to HustleHub Africa, the operator of the Program.
                  </li>
                  <li>
                    <strong>Affiliate, You, or Your</strong> – refers to an individual or entity approved by the Company to participate in the Program.
                  </li>
                  <li>
                    <strong>Referral Link</strong> – a unique tracking URL provided to the Affiliate to promote our products or services.
                  </li>
                  <li>
                    <strong>Qualified Referral</strong> – a new customer who signs up or makes a purchase through your Referral Link and meets all requirements described in these Terms.
                  </li>
                  <li>
                    <strong>Commission</strong> – the reward or payment earned by the Affiliate for generating Qualified Referrals.
                  </li>
                </ul>
              </section>

              {/* Section 2: Eligibility */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">2. Eligibility</h2>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">To participate, you must:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Be at least 18 years of age (or the age of majority in your jurisdiction)</li>
                      <li>Have a valid email address and payment method</li>
                      <li>Operate in a manner compliant with applicable laws and regulations</li>
                    </ul>
                  </div>
                  <p>
                    The Company reserves the right to approve or reject any application at its sole discretion, 
                    without obligation to provide reasons.
                  </p>
                </div>
              </section>

              {/* Section 3: Enrollment and Account */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">3. Enrollment and Account</h2>
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>Once approved, you will receive access to your Affiliate Dashboard containing your Referral Link, statistics, and earnings</li>
                  <li>You are responsible for maintaining the confidentiality of your login credentials</li>
                  <li>Any activity conducted under your account is deemed to be performed by you</li>
                </ol>
              </section>

              {/* Section 4: Referral Process */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">4. Referral Process</h2>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">A Qualified Referral must:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Access our website using your unique Referral Link</li>
                      <li>Complete the required action (e.g., registration, purchase, or subscription)</li>
                      <li>Not have previously interacted with our services before the referral</li>
                    </ul>
                  </div>
                  <p>
                    Self-referrals or referrals from duplicate, fake, or fraudulent accounts are strictly prohibited.
                  </p>
                </div>
              </section>

              {/* Section 5: Commission and Payment */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">5. Commission and Payment</h2>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">Commission Structure:</p>
                    <p>The commission rate and eligible actions will be communicated via your Affiliate Dashboard or email.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Payment Terms:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Commissions are payable once a Qualified Referral is verified and the transaction is confirmed as valid</li>
                      <li>Payments are made via M-Pesa, Bank Transfer, or other methods once your account balance reaches the minimum payout threshold</li>
                      <li>All payments are made in KES (Kenyan Shilling), unless otherwise stated</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">Tax Responsibility:</p>
                    <p>Affiliates are solely responsible for declaring and paying any taxes applicable to commissions received in their jurisdiction.</p>
                  </div>
                </div>
              </section>

              {/* Section 6: Prohibited Activities */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">6. Prohibited Activities</h2>
                <p className="font-semibold mb-4">You must not:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Engage in misleading, deceptive, or unethical marketing practices</li>
                  <li>Use spam emails, pop-ups, or unsolicited advertisements</li>
                  <li>Misrepresent the Company, its products, or your relationship with us</li>
                  <li>Bid on our brand keywords or domain names in search engine advertising</li>
                  <li>Create fake leads or manipulate referral data</li>
                  <li>Use content that is offensive, unlawful, or infringes upon intellectual property rights</li>
                </ul>
                <p className="mt-4">
                  Violation of these rules may result in immediate termination and forfeiture of unpaid commissions.
                </p>
              </section>

              {/* Section 7: Intellectual Property */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">7. Intellectual Property</h2>
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>
                    The Company grants you a limited, non-exclusive, revocable license to use our name, logo, 
                    and promotional materials solely for Program participation
                  </li>
                  <li>
                    You may not alter or misuse our trademarks or create derivative materials without written permission
                  </li>
                </ol>
              </section>

              {/* Section 8: Termination */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">8. Termination</h2>
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>Either party may terminate participation at any time, with or without cause, by providing written notice</li>
                  <li>
                    Upon termination:
                    <ul className="list-disc list-inside space-y-2 ml-6 mt-2">
                      <li>All pending commissions for unverified referrals will be void</li>
                      <li>You must stop using our brand materials and Referral Links immediately</li>
                    </ul>
                  </li>
                </ol>
              </section>

              {/* Section 9: Limitation of Liability */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">9. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, 
                  or consequential damages arising from or related to the Program, including but not limited to loss of income, 
                  reputation, or data.
                </p>
              </section>

              {/* Section 10: Disclaimer of Warranties */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">10. Disclaimer of Warranties</h2>
                <p>
                  The Program and all related materials are provided &ldquo;as is.&rdquo; The Company makes no warranties, 
                  express or implied, regarding functionality, availability, or accuracy of tracking.
                </p>
              </section>

              {/* Section 11: Confidentiality */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">11. Confidentiality</h2>
                <p>
                  All non-public information obtained through your participation (including commission rates, business practices, 
                  or system data) must be kept confidential and not disclosed to any third party.
                </p>
              </section>

              {/* Section 12: Governing Law and Jurisdiction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">12. Governing Law and Jurisdiction</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of Kenya. 
                  Any disputes shall be resolved exclusively in the competent courts of Nairobi, Kenya.
                </p>
              </section>

              {/* Section 13: Amendments */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">13. Amendments</h2>
                <p>
                  The Company reserves the right to modify these Terms at any time. Changes will take effect upon posting 
                  on our website or notification via email. Continued participation constitutes acceptance of the updated Terms.
                </p>
              </section>

              {/* Section 14: Contact Us */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">14. Contact Us</h2>
                <p className="mb-4">
                  If you have any questions or concerns about these Terms or your participation in the Program, 
                  please contact us at:
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="mr-3">📧</span>
                      <a 
                        href="mailto:support@hustlehubafrica.com" 
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        support@hustlehubafrica.com
                      </a>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">📞</span>
                      <span>+254 700 000 000</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3">📍</span>
                      <span>Nairobi, Kenya</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Acceptance Notice */}
              <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold text-center">
                  ✅ By joining or continuing to participate in the Refer & Earn Affiliate Program, 
                  you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
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

export default TermsPage;
