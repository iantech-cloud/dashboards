// app/lib/email-templates/initial-invoice.ts

export interface InitialInvoiceData {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  user: {
    name: string;
    email: string;
  };
  paymentLink: string;
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

/**
 * Generate HTML template for initial payment invoice (payment request)
 */
export function generateInitialInvoiceTemplate(data: InitialInvoiceData): string {
  const { invoiceNumber, amount, dueDate, issueDate, user, paymentLink, business } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Invoice - HustleHub Africa</title>
        <style>
            @media only screen and (max-width: 600px) {
                .container {
                    width: 100% !important;
                }
                .invoice-table {
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
            <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Invoice</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 30px;">
                <!-- Greeting -->
                <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${user.name}!</h2>
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                    Thank you for verifying your email. To complete your account activation and start earning, 
                    please complete the payment as per the invoice below.
                </p>

                <!-- Invoice Details -->
                <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e2e8f0;">
                    <h3 style="color: #1f2937; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">INVOICE</h3>
                    
                    <!-- Invoice Header -->
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
                                <strong style="color: #374151;">Bill To:</strong><br>
                                ${user.name}<br>
                                ${user.email}
                            </td>
                        </tr>
                    </table>

                    <!-- Invoice Details Table -->
                    <table class="invoice-table" width="100%" cellpadding="10" style="border-collapse: collapse; background-color: white; border-radius: 6px; overflow: hidden;">
                        <thead>
                            <tr style="background-color: #4F46E5; color: white;">
                                <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb;">Description</th>
                                <th style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    <strong>HustleHub Africa Account Activation</strong><br>
                                    <span style="color: #6b7280; font-size: 14px;">
                                        Lifetime access to earning opportunities, surveys, and referral program
                                    </span>
                                </td>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    KES ${amount.toLocaleString()}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    <strong>Platform Access Fee</strong><br>
                                    <span style="color: #6b7280; font-size: 14px;">
                                        One-time activation fee
                                    </span>
                                </td>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    KES 0
                                </td>
                            </tr>
                            <tr style="background-color: #f8fafc;">
                                <td style="padding: 12px; font-weight: bold; color: #374151;">
                                    TOTAL DUE
                                </td>
                                <td style="text-align: right; padding: 12px; font-weight: bold; color: #dc2626; font-size: 18px;">
                                    KES ${amount.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Invoice Metadata -->
                    <table width="100%" cellpadding="10" style="border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Invoice Number:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Issue Date:</td>
                            <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">${issueDate}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Due Date:</td>
                            <td style="color: #dc2626; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${dueDate}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #374151;">Status:</td>
                            <td style="color: #dc2626; font-weight: bold;">PENDING PAYMENT</td>
                        </tr>
                    </table>
                </div>

                <!-- Payment Instructions -->
                <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                    <h4 style="color: #1e40af; margin-bottom: 15px;">💳 Payment Instructions</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px; font-weight: bold;">
                            Option 1 - Secure Online Payment (Recommended):
                        </p>
                        <p style="color: #1e40af; margin: 0; font-size: 14px;">
                            Click the "Pay Now Securely" button below to complete your payment instantly via M-Pesa.
                        </p>
                    </div>

                    <div>
                        <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px; font-weight: bold;">
                            Option 2 - Manual M-Pesa Payment:
                        </p>
                        <ol style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>Go to M-Pesa menu on your phone</li>
                            <li>Select "Lipa Na M-Pesa"</li>
                            <li>Select "Pay Bill"</li>
                            <li>Enter Business Number: <strong>4182501</strong></li>
                            <li>Enter Account Number: <strong>${invoiceNumber}</strong></li>
                            <li>Enter Amount: <strong>KES ${amount}</strong></li>
                            <li>Enter your M-Pesa PIN</li>
                            <li>Wait for confirmation message</li>
                        </ol>
                    </div>
                </div>

                <!-- Payment Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${paymentLink}" 
                      style="background-color: #10b981; color: white; padding: 16px 40px; 
                             text-decoration: none; border-radius: 8px; display: inline-block;
                             font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                             box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
                        💳 Pay Now Securely
                    </a>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                        You will be redirected to our secure payment gateway
                    </p>
                </div>

                <!-- No Refund Policy -->
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
                    <h4 style="color: #dc2626; margin-bottom: 15px;">⚠️ No Refund Policy</h4>
                    <p style="color: #dc2626; margin: 0; font-size: 14px; line-height: 1.5;">
                        <strong>Important:</strong> All payments made for HustleHub Africa account activation are <strong>non-refundable</strong>. 
                        By proceeding with this payment, you acknowledge and agree to our no-refund policy. 
                        This one-time payment secures your lifetime access to our platform, including:
                    </p>
                    <ul style="color: #dc2626; margin: 10px 0 0 20px; padding: 0; font-size: 14px;">
                        <li>Unlimited access to earning opportunities</li>
                        <li>Survey participation and rewards</li>
                        <li>Referral program with commission earnings</li>
                        <li>Content creation opportunities</li>
                        <li>Lifetime platform updates and new features</li>
                    </ul>
                    <p style="color: #dc2626; margin: 15px 0 0 0; font-size: 14px; font-style: italic;">
                        We do not offer refunds for any reason, including but not limited to account non-usage, 
                        personal circumstances, or dissatisfaction with available opportunities.
                    </p>
                </div>

                <!-- Contact Information -->
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <h4 style="color: #374151; margin-bottom: 15px;">Need Help?</h4>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                        Contact our support team:<br>
                        📞 ${business.phone} | ✉️ ${business.email}
                    </p>
                </div>

                <!-- Footer Note -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                        This is an automated invoice. Please do not reply to this email.<br>
                        Invoice will expire on ${dueDate}.
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
 * Generate plain text version for initial invoice
 */
export function generateInitialInvoicePlainText(data: InitialInvoiceData): string {
  const { invoiceNumber, amount, dueDate, issueDate, user, paymentLink, business } = data;

  return `
HUSTLEHUB AFRICA - PAYMENT INVOICE
===================================

Hello ${user.name},

Thank you for verifying your email. To complete your account activation and start earning, please complete the payment as per the invoice below.

INVOICE DETAILS:
----------------
Invoice Number: ${invoiceNumber}
Issue Date: ${issueDate}
Due Date: ${dueDate}
Status: PENDING PAYMENT

FROM:
${business.name}
${business.address}
Phone: ${business.phone}
Email: ${business.email}

BILL TO:
${user.name}
${user.email}

ITEMS:
------
- HustleHub Africa Account Activation
  Lifetime access to earning opportunities, surveys, and referral program
  Amount: KES ${amount.toLocaleString()}

- Platform Access Fee
  One-time activation fee
  Amount: KES 0

TOTAL DUE: KES ${amount.toLocaleString()}

PAYMENT INSTRUCTIONS:
---------------------
Option 1 - Secure Online Payment (Recommended):
Click the following link to pay securely: ${paymentLink}

Option 2 - Manual M-Pesa Payment:
1. Go to M-Pesa menu
2. Select "Lipa Na M-Pesa"
3. Select "Pay Bill"
4. Business Number: 123456
5. Account Number: ${invoiceNumber}
6. Amount: KES ${amount}
7. Enter your M-Pesa PIN
8. Wait for confirmation

NO REFUND POLICY:
-----------------
All payments made for HustleHub Africa account activation are NON-REFUNDABLE. By proceeding with this payment, you acknowledge and agree to our no-refund policy. This one-time payment secures your lifetime access to our platform.

We do not offer refunds for any reason, including but not limited to account non-usage, personal circumstances, or dissatisfaction with available opportunities.

NEED HELP?
----------
Contact our support team:
Phone: ${business.phone}
Email: ${business.email}

This is an automated invoice. Please do not reply to this email.
Invoice will expire on ${dueDate}.

© 2024 HustleHub Africa. All rights reserved.
Building Africa's Premier Earning Platform
  `.trim();
}
