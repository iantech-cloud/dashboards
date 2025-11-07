import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Use app password, not regular password
  },
});

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json();

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and html or text' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Send email
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Your App',
        address: process.env.EMAIL_USER || 'noreply@yourapp.com',
      },
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
    };

    const result = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      response: result.response,
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: GET method to test email configuration
export async function GET(request: NextRequest) {
  try {
    // Verify transporter configuration
    await transporter.verify();
    
    return NextResponse.json({
      success: true,
      message: 'Email transporter is configured correctly',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Email configuration error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
