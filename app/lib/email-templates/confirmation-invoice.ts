// app/lib/email-templates/confirmation-invoice.ts

export interface ConfirmationInvoiceData {
  invoiceNumber: string;
  originalInvoiceNumber: string;
  amount: number;
  paymentDate: string;
  transactionId: string;
  paymentMethod: 'mpesa' | 'admin' | 'manual';
  user: {
    name: string;
    email: string;
  };
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  adminNotes?: string;
  activationDate: string;
}

/**
 * Generate HTML template for payment confirmation invoice
 */
export function generateConfirmationInvoiceTemplate(data: ConfirmationInvoiceData): string {
  const { 
    invoiceNumber, 
    originalInvoiceNumber, 
    amount, 
    paymentDate, 
    transactionId, 
    paymentMethod, 
    user, 
    business, 
    adminNotes,
    activationDate 
  } = data;

  const paymentMethodText = {
    mpesa: 'M-Pesa Mobile Payment',
    admin: 'Admin Manual Activation',
    manual: 'Manual Payment'
  }[paymentMethod];

  const paymentMethodIcon = {
    mpesa: '📱',
    admin: '👨‍💼',
    manual: '💳'
  }[paymentMethod];

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation - HustleHub Africa</title>
        <style>
            @media only screen and (max-width: 600px) {
                .container {
                    width: 100% !important;
                }
                .confirmation-table {
                    width: 100% !important;
                }
                .mobile-center {
                    text-align: center !important;
                }
            }
        </style>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Confirmation</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
                <!-- Success Banner -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background-color: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; display: inline-block;">
                        <span style="font-size: 48px;">✅</span>
                        <h2 style="margin: 10px 0 5px 0; color: #065f46;">Payment Confirmed!</h2>
                        <p style="margin: 0; font-weight: bold; font-size: 16px;">Your account has been activated</p>
                    </div>
                </div>

                <!-- Greeting -->
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                    Hello <strong>${user.name}</strong>, your payment has been confirmed and your account is now fully activated. 
                    Welcome to HustleHub Africa!
                </p>

                <!-- Confirmation Details -->
                <div style="background-color: #f0fdf4; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #bbf7d0;">
                    <h3 style="color: #065f46; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px;">PAYMENT CONFIRMATION</h3>
                    
                    <!-- Confirmation Header -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                            <td style="padding-bottom: 15px;">
                                <strong style="color: #374151;">From:</strong><br>
                                ${business.name}<br>
                                ${business.address}<br>
                                Phone: ${business.phone}<br>
                                Email: ${business.email}
                            </td>
                            <td style="text-align: right; padding-bottom: 15px;">
                                <strong style="color: #374151;">Account:</strong><br>
                                ${user.name}<br>
                                ${user.email}<br>
                                Activated: ${activationDate}
                            </td>
                        </tr>
                    </table>

                    <!-- Confirmation Details Table -->
                    <table class="confirmation-table" width="100%" cellpadding="10" style="border-collapse: collapse; background-color: white; border-radius: 6px; overflow: hidden;">
                        <thead>
                            <tr style="background-color: #10b981; color: white;">
                                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb;">Description</th>
                                <th style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    <strong>HustleHub Africa Account Activation</strong><br>
                                    <span style="color: #6b7280; font-size: 14px;">
                                        Lifetime access - Payment Confirmed
                                    </span>
                                </td>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    KES ${amount.toLocaleString()}
                                </td>
                            </tr>
                            <tr style="background-color: #f0fdf4;">
                                <td style="padding: 12px; font-weight: bold; color: #374151;">
                                    TOTAL PAID
                                </td>
                                <td style="text-align: right; padding: 12px; font-weight: bold; color: #065f46; font-size: 18px;">
                                    KES ${amount.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Payment Metadata -->
                    <table width="100%" cellpadding="10" style="border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Confirmation Number:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5; font-weight: bold;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Original Invoice:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${originalInvoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Transaction ID:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${transactionId}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Payment Date:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${paymentDate}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Activation Date:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${activationDate}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Payment Method:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">
                                ${paymentMethodIcon} ${paymentMethodText}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151;">Status:</td>
                            <td style="color: #10b981; font-weight: bold;">PAYMENT CONFIRMED ✅</td>
                        </tr>
                    </table>

                    ${adminNotes ? `
                    <!-- Admin Notes -->
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Admin Notes:</strong> ${adminNotes}
                        </p>
                    </div>
                    ` : ''}
                </div>

                <!-- Next Steps -->
                <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                    <h4 style="color: #1e40af; margin-bottom: 15px;">🎉 Welcome to HustleHub Africa!</h4>
                    <p style="color: #1e40af; margin-bottom: 15px; font-size: 14px;">
                        Your account is now active and ready to start earning. Here's what you can do next:
                    </p>
                    <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
                        <li><strong>Complete Your Profile:</strong> Add more details to get personalized opportunities</li>
                        <li><strong>Explore Earning Tasks:</strong> Browse available surveys, content creation, and other tasks</li>
                        <li><strong>Invite Friends:</strong> Earn referral bonuses when your friends join and activate</li>
                        <li><strong>Set Payment Methods:</strong> Configure how you want to receive your earnings</li>
                    </ul>
                </div>

                <!-- Dashboard Access -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" 
                      style="background-color: #4F46E5; color: white; padding: 16px 40px; 
                             text-decoration: none; border-radius: 8px; display: inline-block;
                             font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                             box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3); transition: all 0.3s ease;">
                        🚀 Go to Dashboard & Start Earning
                    </a>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                        Access your personalized dashboard to begin your earning journey
                    </p>
                </div>

                <!-- Refund Policy Reminder -->
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
                    <h4 style="color: #dc2626; margin-bottom: 15px;">📝 Payment Confirmation Note</h4>
                    <p style="color: #dc2626; margin: 0; font-size: 14px; line-height: 1.5;">
                        This email confirms your payment of <strong>KES ${amount.toLocaleString()}</strong> 
                        for HustleHub Africa account activation. As per our policy stated in the initial invoice, 
                        this payment is <strong>non-refundable</strong>. 
                    </p>
                    <p style="color: #dc2626; margin: 10px 0 0 0; font-size: 14px;">
                        Thank you for your investment in your earning journey with HustleHub Africa. 
                        We're committed to providing you with valuable earning opportunities.
                    </p>
                </div>

                <!-- Support Information -->
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <h4 style="color: #374151; margin-bottom: 15px;">Need Assistance?</h4>
                    <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                        Our support team is here to help you get started:
                    </p>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                        📞 ${business.phone} | ✉️ ${business.email}<br>
                        💬 Live chat available in your dashboard
                    </p>
                </div>

                <!-- Welcome Message -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">
                        Welcome to the HustleHub Africa community! We're excited to have you on board and 
                        can't wait to see you achieve your earning goals.
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    © 2024 HustleHub Africa. All rights reserved.<br>
                    Building Africa's Premier Earning Platform
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text version for confirmation invoice
 */
export function generateConfirmationInvoicePlainText(data: ConfirmationInvoiceData): string {
  const { 
    invoiceNumber, 
    originalInvoiceNumber, 
    amount, 
    paymentDate, 
    transactionId, 
    paymentMethod, 
    user, 
    business, 
    adminNotes,
    activationDate 
  } = data;

  const paymentMethodText = {
    mpesa: 'M-Pesa Mobile Payment',
    admin: 'Admin Manual Activation',
    manual: 'Manual Payment'
  }[paymentMethod];

  return `
HUSTLEHUB AFRICA - PAYMENT CONFIRMATION
========================================

✅ PAYMENT CONFIRMED! YOUR ACCOUNT HAS BEEN ACTIVATED.

Hello ${user.name},

Your payment has been confirmed and your account is now fully activated. 
Welcome to HustleHub Africa!

CONFIRMATION DETAILS:
---------------------
Confirmation Number: ${invoiceNumber}
Original Invoice: ${originalInvoiceNumber}
Transaction ID: ${transactionId}
Payment Date: ${paymentDate}
Activation Date: ${activationDate}
Payment Method: ${paymentMethodText}
Status: PAYMENT CONFIRMED

FROM:
${business.name}
${business.address}
Phone: ${business.phone}
Email: ${business.email}

ACCOUNT:
${user.name}
${user.email}

PAYMENT SUMMARY:
----------------
- HustleHub Africa Account Activation
  Lifetime access - Payment Confirmed
  Amount: KES ${amount.toLocaleString()}

TOTAL PAID: KES ${amount.toLocaleString()}

${adminNotes ? `
ADMIN NOTES:
${adminNotes}
` : ''}

NEXT STEPS:
-----------
1. Complete Your Profile: Add more details to get personalized opportunities
2. Explore Earning Tasks: Browse available surveys, content creation, and other tasks
3. Invite Friends: Earn referral bonuses when your friends join and activate
4. Set Payment Methods: Configure how you want to receive your earnings

GET STARTED:
------------
Access your dashboard: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard

PAYMENT CONFIRMATION NOTE:
--------------------------
This email confirms your payment of KES ${amount.toLocaleString()} for HustleHub Africa account activation. 
As per our policy stated in the initial invoice, this payment is NON-REFUNDABLE.

Thank you for your investment in your earning journey with HustleHub Africa. 
We're committed to providing you with valuable earning opportunities.

NEED ASSISTANCE?
----------------
Our support team is here to help you get started:
Phone: ${business.phone}
Email: ${business.email}
Live chat available in your dashboard

Welcome to the HustleHub Africa community! We're excited to have you on board and 
can't wait to see you achieve your earning goals.

© 2024 HustleHub Africa. All rights reserved.
Building Africa's Premier Earning Platform
  `.trim();
}
