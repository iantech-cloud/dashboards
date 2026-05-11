// app/actions/email.ts
'use server';

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Profile } from '@/app/lib/models/Profile';
import { connectToDatabase } from '@/app/lib/mongoose';
import { decrypt } from '@/app/lib/encryption';

let transporter: Transporter | null = null;
let transporterUser: string | undefined = undefined;

function getTransporter(): Transporter {
  // Recreate if env vars have changed (e.g. after hot reload in dev)
  if (!transporter || transporterUser !== process.env.GMAIL_USER) {
    transporterUser = process.env.GMAIL_USER;
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Get user's anti-phishing code for email inclusion
 * Uses direct MongoDB queries to bypass Mongoose selection issues
 */
async function getUserAntiPhishingCode(email: string): Promise<string | null> {
  try {
    await connectToDatabase();
    
    console.log('🔍 getUserAntiPhishingCode - Looking up:', email);

    // Use direct MongoDB query to bypass Mongoose selection issues with select: false fields
    const mongoose = await import('mongoose');
    const directResult = await mongoose.default.connection.db.collection('profiles')
      .findOne({ email });

    console.log('🔍 Direct MongoDB lookup:', {
      email,
      userFound: !!directResult,
      antiPhishingCodeSet: directResult?.antiPhishingCodeSet,
      hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode,
      encryptedCodeLength: directResult?.antiPhishingEncryptedCode?.length
    });

    if (!directResult || !directResult.antiPhishingCodeSet || !directResult.antiPhishingEncryptedCode) {
      console.log('❌ No anti-phishing code found for email:', {
        userExists: !!directResult,
        codeSet: directResult?.antiPhishingCodeSet,
        hasEncryptedCode: !!directResult?.antiPhishingEncryptedCode
      });
      return null;
    }
    
    try {
      // Decrypt the code for email display
      const decryptedCode = decrypt(directResult.antiPhishingEncryptedCode);
      console.log('✅ Successfully decrypted anti-phishing code for:', email);
      return decryptedCode;
    } catch (decryptError) {
      console.error('❌ Error decrypting anti-phishing code:', decryptError);
      return null;
    }
  } catch (error) {
    console.error('❌ Error in getUserAntiPhishingCode:', error);
    return null;
  }
}

function generateAntiPhishingSection(antiPhishingCode: string | null): string {
  if (!antiPhishingCode) {
    return `
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">
          ⚠️ Security Notice
        </p>
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.4;">
          You have not set up an anti-phishing code. To enhance your security, 
          set up a personal anti-phishing code in your account settings.
        </p>
      </div>
    `;
  }

  return `
    <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding-right: 15px; vertical-align: top;">
            <div style="background-color: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ✓
            </div>
          </td>
          <td>
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #065f46; font-size: 16px;">
              🔐 Your Anti-Phishing Security Code
            </p>
            <p style="margin: 0 0 12px 0; color: #047857; font-size: 14px; line-height: 1.4;">
              This is your unique security code. Always verify this code appears in emails from HustleHub Africa.
            </p>
            <div style="background-color: white; padding: 12px; border-radius: 6px; border: 2px dashed #10b981; text-align: center;">
              <code style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #065f46; letter-spacing: 2px;">
                ${antiPhishingCode}
              </code>
            </div>
            <p style="margin: 12px 0 0 0; color: #047857; font-size: 12px; font-style: italic;">
              If this code is missing or incorrect, this email may be fraudulent.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// New function for support contact form
export async function sendSupportEmail(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    console.log('📧 Attempting to send support email from:', formData.email);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing email environment variables');
      return { 
        success: false, 
        error: 'Email service not configured properly' 
      };
    }

    const antiPhishingCode = await getUserAntiPhishingCode(formData.email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    // Email to support team
    const supportMailOptions = {
      from: `"HustleHub Africa Support" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to ourselves
      subject: `Support Request: ${formData.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Support Request - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Support Request</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">New Support Request</h2>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <table width="100%" cellpadding="8" style="border-collapse: collapse;">
                            <tr>
                                <td style="font-weight: bold; color: #374151; width: 100px;">From:</td>
                                <td style="color: #6b7280;">${formData.name} (${formData.email})</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151;">Subject:</td>
                                <td style="color: #6b7280;">${formData.subject}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; vertical-align: top;">Message:</td>
                                <td style="color: #6b7280; line-height: 1.6;">${formData.message.replace(/\n/g, '<br>')}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151;">Time:</td>
                                <td style="color: #6b7280;">${new Date().toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>

                    ${antiPhishingSection}

                    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            <strong>Action Required:</strong> Please respond to this support request within 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    // Auto-reply to user
    const userMailOptions = {
      from: `"HustleHub Africa Support" <${process.env.GMAIL_USER}>`,
      to: formData.email,
      subject: `We've received your support request: ${formData.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Support Request Received - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Support Request Received</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${formData.name},</h2>
                    
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                        Thank you for contacting HustleHub Africa support. We have received your message and our team will get back to you as soon as possible.
                    </p>

                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">
                            Your support request details:
                        </p>
                        <table width="100%" cellpadding="8" style="border-collapse: collapse;">
                            <tr>
                                <td style="font-weight: bold; color: #374151; width: 80px;">Subject:</td>
                                <td style="color: #6b7280;">${formData.subject}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; vertical-align: top;">Message:</td>
                                <td style="color: #6b7280; line-height: 1.6;">${formData.message.replace(/\n/g, '<br>')}</td>
                            </tr>
                        </table>
                    </div>

                    ${antiPhishingSection}

                    <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">
                            📞 Need Immediate Assistance?
                        </p>
                        <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">
                            For urgent matters, you can also reach us at:<br>
                            <strong>Phone:</strong> +254 748 264 231<br>
                            <strong>Live Chat:</strong> Available in your dashboard
                        </p>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                            This is an automated response. Please do not reply to this email.
                        </p>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await getTransporter().verify();
    console.log('✅ Email transporter verified successfully');

    // Send both emails
    const supportResult = await getTransporter().sendMail(supportMailOptions);
    const userResult = await getTransporter().sendMail(userMailOptions);

    console.log('✅ Support emails sent successfully');
    console.log('📨 Support Message ID:', supportResult.messageId);
    console.log('📨 User Auto-reply Message ID:', userResult.messageId);

    return { 
      success: true, 
      messageId: supportResult.messageId,
      autoReplyMessageId: userResult.messageId,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Support email sending error:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      if (error.message.includes('Invalid login')) {
        console.error('🔐 Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD');
        return { 
          success: false, 
          error: 'Email authentication failed. Please check email configuration.' 
        };
      }

      if (error.message.includes('ENOTFOUND')) {
        console.error('🌐 Network error. Check internet connection.');
        return { 
          success: false, 
          error: 'Network error. Please check your connection.' 
        };
      }
    }

    return { 
      success: false, 
      error: 'Failed to send support email',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  try {
    console.log('📧 Attempting to send verification email to:', email);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing email environment variables');
      return { 
        success: false, 
        error: 'Email service not configured properly' 
      };
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/confirm?token=${token}`;

    console.log('🔗 Verification URL:', verificationUrl);

    const antiPhishingCode = await getUserAntiPhishingCode(email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    console.log('📧 Email composition:', {
      email,
      hasAntiPhishingCode: !!antiPhishingCode,
      antiPhishingCodePreview: antiPhishingCode ? `${antiPhishingCode.substring(0, 3)}...` : 'None'
    });

    const mailOptions = {
      from: `"HustleHub Africa" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - HustleHub Africa',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Pan-African Earning Platform</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to HustleHub Africa!</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        Thank you for registering. Please verify your email address to continue your journey with us.
                    </p>

                    ${antiPhishingSection}

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                          style="background-color: #4F46E5; color: white; padding: 14px 32px; 
                                 text-decoration: none; border-radius: 8px; display: inline-block;
                                 font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                                 box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                            Verify Email Address
                        </a>
                    </div>

                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">
                            Or copy and paste this link in your browser:
                        </p>
                        <p style="margin: 0; word-break: break-all; color: #4F46E5; 
                                 background-color: white; padding: 12px; border-radius: 6px; 
                                 border: 1px solid #e5e7eb; font-family: monospace; font-size: 14px;">
                            ${verificationUrl}
                        </p>
                    </div>

                    <div style="border-left: 4px solid #f59e0b; padding-left: 15px; margin: 25px 0;">
                        <p style="margin: 0; color: #92400e; font-weight: bold;">
                            ⚠️ Important: This link will expire in 24 hours.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            If you didn't create an account with HustleHub Africa, please ignore this email.
                        </p>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', email);
    console.log('📨 Message ID:', result.messageId);

    return { 
      success: true, 
      messageId: result.messageId,
      email: email,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Email sending error:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      if (error.message.includes('Invalid login')) {
        console.error('🔐 Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD');
        return { 
          success: false, 
          error: 'Email authentication failed. Please check email configuration.' 
        };
      }

      if (error.message.includes('ENOTFOUND')) {
        console.error('🌐 Network error. Check internet connection.');
        return { 
          success: false, 
          error: 'Network error. Please check your connection.' 
        };
      }
    }

    return { 
      success: false, 
      error: 'Failed to send verification email',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendVerificationCodeEmail(
  email: string, 
  code: string, 
  purpose: string = 'Account Verification'
) {
  try {
    console.log(`📧 Sending verification code to: ${email} for ${purpose}`);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing email environment variables');
      return { 
        success: false, 
        error: 'Email service not configured properly' 
      };
    }

    const antiPhishingCode = await getUserAntiPhishingCode(email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    console.log('📧 Verification code email composition:', {
      email,
      purpose,
      hasAntiPhishingCode: !!antiPhishingCode,
      antiPhishingCodePreview: antiPhishingCode ? `${antiPhishingCode.substring(0, 3)}...` : 'None'
    });

    const mailOptions = {
      from: `"HustleHub Africa" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Verification Code - ${purpose}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Verification Required</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">${purpose}</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        You requested to perform a sensitive operation on your HustleHub Africa account. 
                        Please use the verification code below to continue.
                    </p>

                    ${antiPhishingSection}

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); 
                                     color: white; padding: 20px; 
                                     border-radius: 12px; display: inline-block;
                                     font-weight: bold; font-size: 36px; 
                                     letter-spacing: 8px;
                                     box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                            ${code}
                        </div>
                    </div>

                    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">
                            ⚠️ Important Security Information:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                            <li>This code will expire in <strong>10 minutes</strong></li>
                            <li>Never share this code with anyone</li>
                            <li>HustleHub staff will never ask for this code</li>
                            <li>If you didn't request this, please secure your account immediately</li>
                        </ul>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            If you didn't initiate this request, please ignore this email and consider changing your password.
                        </p>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await getTransporter().verify();
    const result = await getTransporter().sendMail(mailOptions);

    console.log('✅ Verification code email sent successfully');
    console.log('📨 Message ID:', result.messageId);

    return { 
      success: true, 
      messageId: result.messageId,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Verification code email error:', error);
    return { 
      success: false, 
      error: 'Failed to send verification code',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendWelcomeEmail(email: string, username: string) {
  try {
    const antiPhishingCode = await getUserAntiPhishingCode(email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    console.log('📧 Welcome email composition:', {
      email,
      username,
      hasAntiPhishingCode: !!antiPhishingCode,
      antiPhishingCodePreview: antiPhishingCode ? `${antiPhishingCode.substring(0, 3)}...` : 'None'
    });

    const mailOptions = {
      from: `"HustleHub Africa" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Welcome to HustleHub Africa!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Welcome to Our Community!</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${username}!</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        Your email has been successfully verified! Welcome to Africa's premier earning platform.
                    </p>

                    ${antiPhishingSection}

                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                        Get ready to start earning through:
                    </p>
                    <ul style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        <li>💼 Surveys and market research</li>
                        <li>📝 Content creation opportunities</li>
                        <li>👥 Referral commissions</li>
                        <li>🎯 Various earning tasks</li>
                    </ul>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" 
                          style="background-color: #4F46E5; color: white; padding: 14px 32px; 
                                 text-decoration: none; border-radius: 8px; display: inline-block;
                                 font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                                 box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                            Go to Dashboard
                        </a>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);

    return { 
      success: true, 
      messageId: result.messageId,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Welcome email sending error:', error);
    return { success: false, error: 'Failed to send welcome email' };
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  return sendVerificationCodeEmail(email, code, 'Password Reset');
}

// NEW INVOICE EMAIL FUNCTIONS

/**
 * Send initial payment invoice after email verification
 * Includes payment instructions and payment link
 */
export async function sendInitialPaymentInvoice(
  email: string,
  username: string,
  invoiceData: {
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    paymentLink: string;
  }
) {
  try {
    console.log('📧 Sending initial payment invoice to:', email);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing email environment variables');
      return { 
        success: false, 
        error: 'Email service not configured properly' 
      };
    }

    const antiPhishingCode = await getUserAntiPhishingCode(email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    const mailOptions = {
      from: `"HustleHub Africa Billing" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Payment Invoice #${invoiceData.invoiceNumber} - Account Activation Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Invoice - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Invoice</p>
                </div>

                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${username}!</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        Thank you for verifying your email. To complete your account activation and start earning, 
                        please complete the payment as per the invoice below.
                    </p>

                    ${antiPhishingSection}

                    <!-- Invoice Details -->
                    <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e2e8f0;">
                        <h3 style="color: #1f2937; margin-bottom: 20px; text-align: center;">INVOICE</h3>
                        
                        <table width="100%" cellpadding="10" style="border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Invoice Number:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">${invoiceData.invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Date Issued:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleDateString()}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Due Date:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">${invoiceData.dueDate}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Amount Due:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #e5e7eb;">
                                    <strong style="color: #dc2626; font-size: 18px;">KES ${invoiceData.amount.toLocaleString()}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151;">Status:</td>
                                <td style="color: #dc2626; font-weight: bold;">PENDING</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Payment Instructions -->
                    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                        <h4 style="color: #1e40af; margin-bottom: 15px;">💳 Payment Instructions</h4>
                        <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px;">
                            <strong>Option 1 - Online Payment:</strong> Click the button below to pay securely online via M-Pesa.
                        </p>
                        <p style="color: #1e40af; margin-bottom: 15px; font-size: 14px;">
                            <strong>Option 2 - Manual M-Pesa:</strong> 
                            <br>1. Go to M-Pesa menu
                            <br>2. Select "Lipa Na M-Pesa"
                            <br>3. Enter Business Number: 4182501
                            <br>4. Enter Amount: KES ${invoiceData.amount}
                            <br>5. Use your name as account reference
                        </p>
                    </div>

                    <!-- Payment Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${invoiceData.paymentLink}" 
                          style="background-color: #10b981; color: white; padding: 16px 40px; 
                                 text-decoration: none; border-radius: 8px; display: inline-block;
                                 font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                                 box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                            💳 Pay Now Securely
                        </a>
                    </div>

                    <!-- No Refund Policy -->
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
                        <h4 style="color: #dc2626; margin-bottom: 15px;">⚠️ No Refund Policy</h4>
                        <p style="color: #dc2626; margin: 0; font-size: 14px; line-height: 1.5;">
                            Please note that all payments made for account activation are <strong>non-refundable</strong>. 
                            By proceeding with this payment, you acknowledge and agree to our no-refund policy. 
                            This payment secures your lifetime access to the HustleHub Africa platform and its earning opportunities.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            If you have any questions about this invoice, please contact our support team.
                        </p>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await getTransporter().verify();
    const result = await getTransporter().sendMail(mailOptions);

    console.log('✅ Initial payment invoice sent successfully');
    console.log('📨 Message ID:', result.messageId);
    console.log('📄 Invoice Details:', {
      invoiceNumber: invoiceData.invoiceNumber,
      amount: invoiceData.amount,
      email: email
    });

    return { 
      success: true, 
      messageId: result.messageId,
      invoiceNumber: invoiceData.invoiceNumber,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Initial payment invoice sending error:', error);
    return { 
      success: false, 
      error: 'Failed to send initial payment invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send payment confirmation invoice after successful payment or admin activation
 */
export async function sendPaymentConfirmationInvoice(
  email: string,
  username: string,
  invoiceData: {
    invoiceNumber: string;
    originalInvoiceNumber: string;
    amount: number;
    paymentDate: string;
    transactionId: string;
    paymentMethod: 'mpesa' | 'admin' | 'manual';
    adminNotes?: string;
  }
) {
  try {
    console.log('📧 Sending payment confirmation invoice to:', email);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing email environment variables');
      return { 
        success: false, 
        error: 'Email service not configured properly' 
      };
    }

    const antiPhishingCode = await getUserAntiPhishingCode(email);
    const antiPhishingSection = generateAntiPhishingSection(antiPhishingCode);

    const paymentMethodText = {
      mpesa: 'M-Pesa',
      admin: 'Admin Activation',
      manual: 'Manual Payment'
    }[invoiceData.paymentMethod];

    const mailOptions = {
      from: `"HustleHub Africa Billing" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Payment Confirmation #${invoiceData.invoiceNumber} - Account Activated`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Confirmation - HustleHub Africa</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Confirmation</p>
                </div>

                <div style="padding: 30px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="background-color: #d1fae5; color: #065f46; padding: 15px; border-radius: 8px; display: inline-block;">
                            <span style="font-size: 48px;">✅</span>
                            <h2 style="margin: 10px 0 5px 0; color: #065f46;">Payment Confirmed!</h2>
                            <p style="margin: 0; font-weight: bold;">Your account has been activated</p>
                        </div>
                    </div>

                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                        Hello <strong>${username}</strong>, your payment has been confirmed and your account is now fully activated. 
                        Welcome to HustleHub Africa!
                    </p>

                    ${antiPhishingSection}

                    <!-- Payment Confirmation Details -->
                    <div style="background-color: #f0fdf4; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #bbf7d0;">
                        <h3 style="color: #065f46; margin-bottom: 20px; text-align: center;">PAYMENT CONFIRMATION</h3>
                        
                        <table width="100%" cellpadding="10" style="border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Confirmation Number:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${invoiceData.invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Original Invoice:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${invoiceData.originalInvoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Transaction ID:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${invoiceData.transactionId}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Payment Date:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${invoiceData.paymentDate}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Payment Method:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">${paymentMethodText}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151; border-bottom: 1px solid #d1fae5;">Amount Paid:</td>
                                <td style="color: #6b7280; border-bottom: 1px solid #d1fae5;">
                                    <strong style="color: #065f46; font-size: 18px;">KES ${invoiceData.amount.toLocaleString()}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold; color: #374151;">Status:</td>
                                <td style="color: #10b981; font-weight: bold;">CONFIRMED</td>
                            </tr>
                        </table>

                        ${invoiceData.adminNotes ? `
                        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 15px;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                                <strong>Admin Notes:</strong> ${invoiceData.adminNotes}
                            </p>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Next Steps -->
                    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                        <h4 style="color: #1e40af; margin-bottom: 15px;">🎉 What's Next?</h4>
                        <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>Access your dashboard to start earning</li>
                            <li>Complete your profile to get more opportunities</li>
                            <li>Explore available earning tasks</li>
                            <li>Invite friends and earn referral bonuses</li>
                        </ul>
                    </div>

                    <!-- Dashboard Access Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" 
                          style="background-color: #4F46E5; color: white; padding: 16px 40px; 
                                 text-decoration: none; border-radius: 8px; display: inline-block;
                                 font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                                 box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                            🚀 Go to Dashboard
                        </a>
                    </div>

                    <!-- No Refund Policy Reminder -->
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
                        <h4 style="color: #dc2626; margin-bottom: 15px;">📝 Payment Confirmation Note</h4>
                        <p style="color: #dc2626; margin: 0; font-size: 14px; line-height: 1.5;">
                            This email confirms your payment of <strong>KES ${invoiceData.amount.toLocaleString()}</strong> 
                            for HustleHub Africa account activation. As per our policy, this payment is <strong>non-refundable</strong>. 
                            Thank you for your investment in your earning journey.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                            Welcome to the HustleHub Africa community! We're excited to have you on board.
                        </p>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        © 2024 HustleHub Africa. All rights reserved.<br>
                        Building Africa's Premier Earning Platform
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    await getTransporter().verify();
    const result = await getTransporter().sendMail(mailOptions);

    console.log('✅ Payment confirmation invoice sent successfully');
    console.log('📨 Message ID:', result.messageId);
    console.log('📄 Confirmation Details:', {
      confirmationNumber: invoiceData.invoiceNumber,
      transactionId: invoiceData.transactionId,
      paymentMethod: invoiceData.paymentMethod,
      email: email
    });

    return { 
      success: true, 
      messageId: result.messageId,
      confirmationNumber: invoiceData.invoiceNumber,
      hasAntiPhishingCode: !!antiPhishingCode
    };
  } catch (error) {
    console.error('❌ Payment confirmation invoice sending error:', error);
    return { 
      success: false, 
      error: 'Failed to send payment confirmation invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testEmailConfig() {
  try {
    console.log('🧪 Testing email configuration...');

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Missing environment variables: GMAIL_USER or GMAIL_APP_PASSWORD');
      return { 
        success: false, 
        error: 'Missing email environment variables' 
      };
    }

    const testTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await testTransporter.verify();
    console.log('✅ Email configuration is correct and working');

    return { 
      success: true, 
      message: 'Email configuration is correct and working',
      email: process.env.GMAIL_USER 
    };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);

    let errorMessage = 'Email configuration failed';
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Gmail authentication failed. Check your GMAIL_APP_PASSWORD.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Network error. Check your internet connection.';
      } else {
        errorMessage = error.message;
      }
    }

    return { 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
