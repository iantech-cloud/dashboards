// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendSupportEmail } from '@/app/actions/email';

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Contact form API route called');
    
    const body = await request.json();
    console.log('📝 Request body received:', { 
      name: body.name,
      email: body.email,
      subject: body.subject,
      messageLength: body.message?.length 
    });

    // Validate required fields
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      console.error('❌ Missing required fields:', { name, email, subject, message });
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required: name, email, subject, message' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 10) {
      console.error('❌ Message too short:', message.length);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message must be at least 10 characters long' 
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      console.error('❌ Message too long:', message.length);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message must be less than 5000 characters' 
        },
        { status: 400 }
      );
    }

    // Sanitize inputs (basic sanitization)
    const sanitizedData = {
      name: name.trim().substring(0, 100),
      email: email.trim().toLowerCase(),
      subject: subject.trim().substring(0, 200),
      message: message.trim().substring(0, 5000)
    };

    console.log('✅ Form data validated and sanitized');

    // Send email using your existing email system
    console.log('📧 Calling sendSupportEmail...');
    const emailResult = await sendSupportEmail(sanitizedData);

    if (!emailResult.success) {
      console.error('❌ Email sending failed:', emailResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: emailResult.error || 'Failed to send email. Please try again later.' 
        },
        { status: 500 }
      );
    }

    console.log('✅ Contact form submission successful:', {
      messageId: emailResult.messageId,
      autoReplyMessageId: emailResult.autoReplyMessageId,
      hasAntiPhishingCode: emailResult.hasAntiPhishingCode
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you within 24 hours.',
      messageId: emailResult.messageId,
      autoReplySent: !!emailResult.autoReplyMessageId,
      hasAntiPhishingCode: emailResult.hasAntiPhishingCode
    });

  } catch (error) {
    console.error('❌ Contact form API error:', error);
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
