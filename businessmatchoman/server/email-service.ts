import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Use verified sender email - user confirmed aditya@fitsoman.com is verified
const FROM_EMAIL = process.env.VERIFIED_SENDER_EMAIL || 'aditya@fitsoman.com';
const COMPANY_NAME = 'TEEJARTI';

/**
 * Send email verification OTP
 */
export async function sendEmailVerificationOtp(email: string, fullName: string, otpCode: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] Email verification OTP for ${email}: ${otpCode}`);
    return true;
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `Verify your ${COMPANY_NAME} account`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">Business Matchmaking Platform</p>
            </div>
            
            <h2 style="color: #1A3B5B; margin-bottom: 20px;">Verify Your Email</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello ${fullName},
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              Welcome to ${COMPANY_NAME}! To complete your account setup, please verify your email address using the code below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #1A3B5B; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 2px; display: inline-block;">
                ${otpCode}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              This code will expire in 10 minutes.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 ${COMPANY_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email verification OTP:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendResetPasswordEmail(email: string, fullName: string, resetLink: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    return true;
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `Reset your ${COMPANY_NAME} password`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">Business Matchmaking Platform</p>
            </div>
            
            <h2 style="color: #1A3B5B; margin-bottom: 20px;">Reset Your Password</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello ${fullName},
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              We received a request to reset your password. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #C79F3D; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #C79F3D; word-break: break-all; font-size: 14px; margin-bottom: 20px;">
              ${resetLink}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 ${COMPANY_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send KYC status notification (pending, approved, rejected)
 */
export async function sendKycStatusEmail(email: string, fullName: string, status: 'pending' | 'approved' | 'rejected'): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] KYC status "${status}" for ${email}`);
    return true;
  }

  try {
    const statusConfig = {
      pending: {
        subject: `Your ${COMPANY_NAME} KYC documents are being reviewed`,
        title: 'KYC Under Review',
        message: 'Thank you for submitting your KYC documents! Our team is currently reviewing your submission.',
        icon: '📋',
        color: '#f59e0b'
      },
      approved: {
        subject: `Your ${COMPANY_NAME} account has been approved!`,
        title: 'Account Approved!',
        message: 'Great news! Your KYC documents have been approved. You now have full access to all platform features.',
        icon: '✅',
        color: '#22c55e'
      },
      rejected: {
        subject: `Action required: ${COMPANY_NAME} KYC verification`,
        title: 'KYC Review Required',
        message: 'We need additional information to complete your verification. Please check your account and resubmit your documents.',
        icon: '❌',
        color: '#ef4444'
      }
    };

    const config = statusConfig[status];
    
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: config.subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">Business Matchmaking Platform</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: ${config.color}; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
                ${config.icon}
              </div>
            </div>
            
            <h2 style="color: #1A3B5B; margin-bottom: 20px; text-align: center;">${config.title}</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello ${fullName},
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              ${config.message}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" style="background: #C79F3D; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Account
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 ${COMPANY_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error(`Error sending KYC ${status} email:`, error);
    return false;
  }
}

/**
 * Send KYC approval notification
 */
export async function sendKycApprovalEmail(email: string, fullName: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] KYC approved for ${email}`);
    return true;
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `Your ${COMPANY_NAME} account has been approved!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">Business Matchmaking Platform</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #22c55e; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
                ✓
              </div>
            </div>
            
            <h2 style="color: #1A3B5B; margin-bottom: 20px; text-align: center;">Account Approved!</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello ${fullName},
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              Great news! Your ${COMPANY_NAME} account has been approved. You can now access all platform features including:
            </p>
            
            <ul style="color: #333; line-height: 1.8; margin-bottom: 30px;">
              <li>Create and publish business listings</li>
              <li>Browse and contact business opportunities</li>
              <li>Access premium investor features</li>
              <li>Connect with verified entrepreneurs and investors</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" style="background: #C79F3D; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Access Dashboard
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 ${COMPANY_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending KYC approval email:', error);
    return false;
  }
}

/**
 * Send KYC rejection notification
 */
export async function sendKycRejectionEmail(email: string, fullName: string, reason: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] KYC rejected for ${email}: ${reason}`);
    return true;
  }

  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `Additional information needed for your ${COMPANY_NAME} account`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">Business Matchmaking Platform</p>
            </div>
            
            <h2 style="color: #1A3B5B; margin-bottom: 20px;">Additional Information Required</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Hello ${fullName},
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Thank you for your interest in ${COMPANY_NAME}. We've reviewed your account verification documents and need additional information to complete the approval process.
            </p>
            
            <div style="background: #fef3cd; border: 1px solid #faebcc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #8a6d3b; margin: 0 0 10px;">Required Action:</h3>
              <p style="color: #8a6d3b; margin: 0; line-height: 1.6;">
                ${reason}
              </p>
            </div>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              Please log in to your account and update your verification documents to proceed with the approval process.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/kyc" style="background: #C79F3D; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Update Documents
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 ${COMPANY_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending KYC rejection email:', error);
    return false;
  }
}

/**
 * Send newsletter welcome email
 */
export async function sendNewsletterWelcomeEmail(email: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] Newsletter welcome email for ${email} - SendGrid not configured`);
    return true;
  }

  console.log(`[EMAIL] Sending newsletter welcome email from verified sender: ${FROM_EMAIL}`);

  // Use direct logo URL from TEEJARTI production site
  const logoUrl = 'https://teejarti.biz/uploads/teejarti_logo_cropped.png';

  try {
    const msg = {
      to: email,
      from: {
        email: FROM_EMAIL,
        name: 'TEEJARTI'
      },
      subject: `Welcome to ${COMPANY_NAME} Newsletter`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${COMPANY_NAME}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #1A3B5B 0%, #2A4B6B 100%); padding: 40px 20px; text-align: center;">
              <img src="${logoUrl}" alt="${COMPANY_NAME}" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px; opacity: 0.9;">Business Matchmaking Platform</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 50px 40px;">
              <h1 style="color: #1A3B5B; font-size: 24px; font-weight: normal; text-align: center; margin: 0 0 30px; letter-spacing: 0.5px;">
                Welcome to Our Newsletter
              </h1>
              
              <p style="color: #555; line-height: 1.7; font-size: 16px; margin-bottom: 25px; text-align: center;">
                Thank you for joining the ${COMPANY_NAME} community. You'll receive curated insights about business opportunities across Oman and the GCC region.
              </p>
              
              <!-- Benefits Section -->
              <div style="background: #f9fafb; border-left: 3px solid #C79F3D; padding: 25px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #1A3B5B; font-size: 16px; margin: 0 0 15px; font-weight: 600;">What You'll Receive:</h3>
                <div style="color: #666; font-size: 14px; line-height: 1.6;">
                  <div style="margin-bottom: 8px;">• Premium business opportunities and investment insights</div>
                  <div style="margin-bottom: 8px;">• Market trends and industry analysis</div>
                  <div style="margin-bottom: 8px;">• Exclusive platform updates and new features</div>
                  <div>• Success stories from our business community</div>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="https://teejarti.biz" 
                   style="display: inline-block; background: #C79F3D; color: #ffffff; text-decoration: none; 
                          padding: 16px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; 
                          letter-spacing: 0.5px; transition: background-color 0.3s ease;">
                  Explore ${COMPANY_NAME}
                </a>
              </div>
              
              <p style="color: #888; font-size: 13px; line-height: 1.6; text-align: center; margin: 30px 0 0;">
                Stay connected with Oman's premier business marketplace and never miss an opportunity to grow your portfolio.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 30px 40px; border-top: 1px solid #eee;">
              <div style="text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0 0 8px;">
                  © 2025 ${COMPANY_NAME}. All rights reserved.
                </p>
                <p style="color: #bbb; font-size: 11px; margin: 0;">
                  You can unsubscribe from these emails at any time.
                </p>
              </div>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log(`[EMAIL] Newsletter welcome email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending newsletter welcome email:', error);
    
    // Log specific error details for debugging
    if (error && typeof error === 'object' && 'response' in error) {
      const sendGridError = error as any;
      if (sendGridError.response?.body?.errors) {
        console.error('SendGrid Error Details:', sendGridError.response.body.errors);
        if (sendGridError.response.body.errors[0]?.message?.includes('verified Sender Identity')) {
          console.error('[SENDGRID] Sender email verification required. Please verify noreply@teejarti.com in SendGrid dashboard.');
        }
      }
    }
    
    return false;
  }
}

// Notify user about a new message
export async function sendNewMessageEmail(toEmail: string, fromName: string, snippet: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[DEV] New message to ${toEmail} from ${fromName}: ${snippet}`);
    return true;
  }
  try {
    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `New message on ${COMPANY_NAME}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Georgia', serif; background: #f8f9fa; padding: 30px;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1A3B5B; margin: 0; font-size: 28px;">${COMPANY_NAME}</h1>
              <p style="color: #666; margin: 5px 0 0;">New Message Notification</p>
            </div>
            <p style="color: #333; line-height: 1.6;">You received a new message from <strong>${fromName}</strong>:</p>
            <blockquote style="color:#555; border-left: 3px solid #C79F3D; padding-left: 12px; margin: 16px 0;">${snippet}</blockquote>
            <div style="text-align:center; margin-top: 24px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/messages" style="background:#C79F3D;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">Open Messages</a>
            </div>
          </div>
        </div>
      `,
    } as any;
    await sgMail.send(msg);
    return true;
  } catch (e) {
    console.error('Error sending new message email:', e);
    return false;
  }
}
