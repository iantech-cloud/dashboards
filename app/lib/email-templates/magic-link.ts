export function getMagicLinkEmailTemplate(url: string, email: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign In - HustleHub Africa</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">HustleHub Africa</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Secure Sign In</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <h2 style="color: #1f2937; margin-bottom: 20px;">Sign In to Your Account</h2>
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                    Click the button below to securely sign in to your HustleHub Africa account. This link will expire in 15 minutes.
                </p>
                
                <!-- Sign In Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" 
                       style="background-color: #4F46E5; color: white; padding: 14px 32px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-weight: bold; font-size: 16px; border: none; cursor: pointer;
                              box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                        Sign In to HustleHub Africa
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
                        ${url}
                    </p>
                </div>
                
                <!-- Security Warning -->
                <div style="border-left: 4px solid #f59e0b; padding-left: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #92400e; font-weight: bold;">
                        ⚠️ Security Notice:
                    </p>
                    <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                        This link will expire in 15 minutes. If you didn't request this sign-in link, please ignore this email.
                    </p>
                </div>
                
                <!-- Info Box -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        <strong>Email:</strong> ${email}<br>
                        <strong>Requested:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} EAT
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
