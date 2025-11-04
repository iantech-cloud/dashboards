// app/actions/email.ts
'use server';

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Profile } from '@/app/lib/models/Profile';
import { connectToDatabase } from '@/app/lib/mongoose';
import { decrypt } from '@/app/lib/encryption';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
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

    await getTransporter().verify();
    console.log('✅ Email transporter verified successfully');

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
