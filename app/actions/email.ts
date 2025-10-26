// app/actions/email.ts
'use server';

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Create transporter (cached for better performance)
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

export async function sendVerificationEmail(email: string, token: string) {
  try {
    console.log('📧 Attempting to send verification email to:', email);
    
    // Validate environment variables
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
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Pan-African Earning Platform</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to HustleHub Africa!</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        Thank you for registering. Please verify your email address to continue your journey with us.
                    </p>
                    
                    <!-- Verification Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #4F46E5; color: white; padding: 14px 32px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block;
                                  font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                                  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <!-- Alternative Link -->
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
                    
                    <!-- Important Note -->
                    <div style="border-left: 4px solid #f59e0b; padding-left: 15px; margin: 25px 0;">
                        <p style="margin: 0; color: #92400e; font-weight: bold;">
                            ⚠️ Important: This link will expire in 24 hours.
                        </p>
                    </div>
                    
                    <!-- Security Note -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            If you didn't create an account with HustleHub Africa, please ignore this email.
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
      `,
    };

    // Test transporter connection first
    await getTransporter().verify();
    console.log('✅ Email transporter verified successfully');

    // Send the email
    const result = await getTransporter().sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', email);
    console.log('📨 Message ID:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId,
      email: email 
    };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Specific error handling
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

/**
 * Send verification code email for sensitive operations
 */
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
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Verification Required</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">${purpose}</h2>
                    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                        You requested to perform a sensitive operation on your HustleHub Africa account. 
                        Please use the verification code below to continue.
                    </p>
                    
                    <!-- Verification Code -->
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
                    
                    <!-- Important Notes -->
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
                    
                    <!-- Security Note -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            If you didn't initiate this request, please ignore this email and consider changing your password.
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
      `,
    };

    await getTransporter().verify();
    const result = await getTransporter().sendMail(mailOptions);
    
    console.log('✅ Verification code email sent successfully');
    console.log('📨 Message ID:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId 
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

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, code: string) {
  return sendVerificationCodeEmail(email, code, 'Password Reset');
}

// Test email configuration function
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

    // Verify connection configuration
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

// Function to send welcome email after verification
export async function sendWelcomeEmail(email: string, username: string) {
  try {
    const mailOptions = {
      from: `"HustleHub Africa" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Welcome to HustleHub Africa!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Welcome to HustleHub Africa!</h1>
          </div>
          <div style="padding: 30px; background: white;">
            <h2>Hello ${username},</h2>
            <p>Your email has been successfully verified! Welcome to our community.</p>
            <p>Get ready to start earning through:</p>
            <ul>
              <li>💼 Surveys and market research</li>
              <li>📝 Content creation opportunities</li>
              <li>👥 Referral commissions</li>
              <li>🎯 Various earning tasks</li>
            </ul>
            <p>Login to your account to get started!</p>
          </div>
        </div>
      `,
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Welcome email sending error:', error);
    return { success: false, error: 'Failed to send welcome email' };
  }
}
