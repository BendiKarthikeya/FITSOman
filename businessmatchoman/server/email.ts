import sgMail from '@sendgrid/mail';

// Initialize SendGrid (be lenient in local/dev)
const HAS_SENDGRID = Boolean(process.env.SENDGRID_API_KEY);
if (HAS_SENDGRID) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
} else {
  // In development, allow running without a key and just log email payloads
  // This avoids crashes when using local .env files or when intentionally skipping email send.
  console.warn('[EMAIL] SENDGRID_API_KEY not set; emails will be logged only');
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private fromEmail = 'noreply@teejarti.com';
  private fromName = 'TEEJARTI';

  private getBaseTemplate(content: string, isRtl = false): string {
    const direction = isRtl ? 'rtl' : 'ltr';
    const align = isRtl ? 'right' : 'left';
    
    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isRtl ? 'ar' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TEEJARTI</title>
    <style>
        body { 
            font-family: ${isRtl ? 'Tahoma, Arial' : 'Georgia, serif'}; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa; 
            color: #333;
            direction: ${direction};
            text-align: ${align};
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #1A3B5B 0%, #2A4B6B 100%); 
            color: white; 
            padding: 30px; 
            text-align: center;
        }
        .logo { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px;
            letter-spacing: 2px;
        }
        .content { 
            padding: 40px 30px;
            line-height: 1.6;
        }
        .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #C79F3D; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #eee;
        }
        .highlight { 
            background: #FFF9E6; 
            padding: 15px; 
            border-left: 4px solid #C79F3D; 
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning {
            background: #FFF5F5;
            border-left: 4px solid #E53E3E;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">تيجارتي | TEEJARTI</div>
            <div style="font-size: 14px; opacity: 0.9;">
                ${isRtl ? 'منصة الأعمال الرائدة في الخليج' : 'Leading Business Platform in the Gulf'}
            </div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2025 TEEJARTI. ${isRtl ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}.</p>
            <p>
                ${isRtl ? 'إذا لم تعد ترغب في تلقي هذه الرسائل، يمكنك' : 'If you no longer wish to receive these emails, you can'} 
                <a href="#" style="color: #C79F3D;">${isRtl ? 'إلغاء الاشتراك هنا' : 'unsubscribe here'}</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  private async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const msg = {
        to: template.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      if (!HAS_SENDGRID) {
        console.log('[EMAIL:DEV] Would send email:', {
          to: template.to,
          subject: template.subject,
        });
        return true;
      }

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${template.to}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(to: string, userName: string, language = 'en'): Promise<boolean> {
    const isRtl = language === 'ar';
    
    const content = isRtl ? `
      <h2>مرحباً بك في تيجارتي، ${userName}!</h2>
      <p>نحن متحمسون لانضمامك إلى منصة الأعمال الرائدة في منطقة الخليج العربي.</p>
      
      <div class="highlight">
        <strong>الخطوات التالية:</strong>
        <ul>
          <li>تحقق من بريدك الإلكتروني</li>
          <li>أكمل ملفك الشخصي</li>
          <li>استكشف فرص الأعمال المتاحة</li>
          <li>ابدأ في التواصل مع المستثمرين</li>
        </ul>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/profile" class="button">
        أكمل ملفك الشخصي
      </a>
      
      <p>إذا كان لديك أي أسئلة، فريق الدعم جاهز لمساعدتك.</p>
      <p>مع أطيب التحيات،<br>فريق تيجارتي</p>
    ` : `
      <h2>Welcome to TEEJARTI, ${userName}!</h2>
      <p>We're excited to have you join the leading business platform in the Gulf region.</p>
      
      <div class="highlight">
        <strong>Next steps:</strong>
        <ul>
          <li>Verify your email address</li>
          <li>Complete your profile</li>
          <li>Explore available business opportunities</li>
          <li>Start connecting with investors</li>
        </ul>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/profile" class="button">
        Complete Your Profile
      </a>
      
      <p>If you have any questions, our support team is here to help.</p>
      <p>Best regards,<br>The TEEJARTI Team</p>
    `;

    const subject = isRtl ? 
      `مرحباً بك في تيجارتي، ${userName}!` : 
      `Welcome to TEEJARTI, ${userName}!`;

    return this.sendEmail({
      to,
      subject,
      html: this.getBaseTemplate(content, isRtl),
    });
  }

  // Email verification
  async sendEmailVerification(to: string, userName: string, verificationToken: string, language = 'en'): Promise<boolean> {
    const isRtl = language === 'ar';
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://teejarti.com'}/verify-email?token=${verificationToken}`;
    
    const content = isRtl ? `
      <h2>تحقق من بريدك الإلكتروني</h2>
      <p>مرحباً ${userName},</p>
      <p>يرجى النقر على الزر أدناه لتحقق من عنوان بريدك الإلكتروني وتفعيل حسابك:</p>
      
      <a href="${verificationUrl}" class="button">تحقق من البريد الإلكتروني</a>
      
      <div class="warning">
        <strong>تنبيه أمني:</strong> هذا الرابط صالح لمدة 24 ساعة فقط. إذا لم تطلب هذا التحقق، يرجى تجاهل هذه الرسالة.
      </div>
      
      <p>إذا لم يعمل الزر، يمكنك نسخ ولصق الرابط التالي في متصفحك:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    ` : `
      <h2>Verify Your Email Address</h2>
      <p>Hello ${userName},</p>
      <p>Please click the button below to verify your email address and activate your account:</p>
      
      <a href="${verificationUrl}" class="button">Verify Email Address</a>
      
      <div class="warning">
        <strong>Security Notice:</strong> This link is valid for 24 hours only. If you didn't request this verification, please ignore this email.
      </div>
      
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    `;

    const subject = isRtl ? 
      'تحقق من بريدك الإلكتروني - تيجارتي' : 
      'Verify Your Email Address - TEEJARTI';

    return this.sendEmail({
      to,
      subject,
      html: this.getBaseTemplate(content, isRtl),
    });
  }

  // Password reset
  async sendPasswordReset(to: string, userName: string, resetToken: string, language = 'en'): Promise<boolean> {
    const isRtl = language === 'ar';
    const resetUrl = `${process.env.FRONTEND_URL || 'https://teejarti.com'}/reset-password?token=${resetToken}`;
    
    const content = isRtl ? `
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>مرحباً ${userName},</p>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
      
      <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
      
      <div class="warning">
        <strong>تنبيه أمني:</strong> 
        <ul>
          <li>هذا الرابط صالح لمدة ساعة واحدة فقط</li>
          <li>إذا لم تطلب إعادة التعيين، يرجى تجاهل هذه الرسالة</li>
          <li>لا تشارك هذا الرابط مع أي شخص</li>
        </ul>
      </div>
      
      <p>إذا لم يعمل الزر، يمكنك نسخ ولصق الرابط التالي في متصفحك:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
    ` : `
      <h2>Reset Your Password</h2>
      <p>Hello ${userName},</p>
      <p>We received a request to reset the password for your account. Click the button below to create a new password:</p>
      
      <a href="${resetUrl}" class="button">Reset Password</a>
      
      <div class="warning">
        <strong>Security Notice:</strong>
        <ul>
          <li>This link is valid for 1 hour only</li>
          <li>If you didn't request this reset, please ignore this email</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
    `;

    const subject = isRtl ? 
      'إعادة تعيين كلمة المرور - تيجارتي' : 
      'Reset Your Password - TEEJARTI';

    return this.sendEmail({
      to,
      subject,
      html: this.getBaseTemplate(content, isRtl),
    });
  }

  // Admin notification for new user registration
  async sendAdminNewUserNotification(userEmail: string, userName: string, userRole: string): Promise<boolean> {
    const content = `
      <h2>New User Registration</h2>
      <p>A new user has registered on the TEEJARTI platform:</p>
      
      <div class="highlight">
        <strong>User Details:</strong>
        <ul>
          <li><strong>Name:</strong> ${userName}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>Role:</strong> ${userRole}</li>
          <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/admin/users" class="button">
        View in Admin Panel
      </a>
      
      <p>This is an automated notification from the TEEJARTI system.</p>
    `;

    return this.sendEmail({
      to: 'admin@teejarti.com',
      subject: `New User Registration: ${userName}`,
      html: this.getBaseTemplate(content, false),
    });
  }

  // Listing approval notification
  async sendListingApprovalNotification(to: string, userName: string, listingTitle: string, isApproved: boolean, language = 'en'): Promise<boolean> {
    const isRtl = language === 'ar';
    
    const content = isRtl ? `
      <h2>${isApproved ? 'تم قبول إعلانك' : 'تم رفض إعلانك'}</h2>
      <p>مرحباً ${userName},</p>
      <p>
        ${isApproved ? 
          `تم قبول إعلانك "${listingTitle}" ونشره على المنصة.` : 
          `نأسف لإبلاغك أن إعلانك "${listingTitle}" لم يتم قبوله.`
        }
      </p>
      
      ${isApproved ? `
        <div class="highlight">
          <p>إعلانك متاح الآن للمستثمرين والمشترين المحتملين. نتمنى لك التوفيق!</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/listings" class="button">
          عرض إعلانك
        </a>
      ` : `
        <div class="warning">
          <p>يرجى مراجعة معايير النشر وإعادة إرسال إعلانك مع التعديلات المطلوبة.</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/create-listing" class="button">
          إنشاء إعلان جديد
        </a>
      `}
    ` : `
      <h2>Your Listing ${isApproved ? 'Approved' : 'Rejected'}</h2>
      <p>Hello ${userName},</p>
      <p>
        ${isApproved ? 
          `Your listing "${listingTitle}" has been approved and is now live on the platform.` : 
          `We regret to inform you that your listing "${listingTitle}" was not approved.`
        }
      </p>
      
      ${isApproved ? `
        <div class="highlight">
          <p>Your listing is now visible to potential investors and buyers. Best of luck!</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/listings" class="button">
          View Your Listing
        </a>
      ` : `
        <div class="warning">
          <p>Please review our posting guidelines and resubmit your listing with the required modifications.</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/create-listing" class="button">
          Create New Listing
        </a>
      `}
    `;

    const subject = isRtl ? 
      `${isApproved ? 'تم قبول' : 'تم رفض'} إعلانك - تيجارتي` : 
      `Your Listing ${isApproved ? 'Approved' : 'Rejected'} - TEEJARTI`;

    return this.sendEmail({
      to,
      subject,
      html: this.getBaseTemplate(content, isRtl),
    });
  }

  // Contact inquiry notification
  async sendContactInquiryNotification(sellerEmail: string, sellerName: string, buyerName: string, buyerEmail: string, listingTitle: string, message: string, language = 'en'): Promise<boolean> {
    const isRtl = language === 'ar';
    
    const content = isRtl ? `
      <h2>استفسار جديد حول إعلانك</h2>
      <p>مرحباً ${sellerName},</p>
      <p>تلقيت استفساراً جديداً حول إعلانك "${listingTitle}":</p>
      
      <div class="highlight">
        <strong>تفاصيل المستفسر:</strong>
        <ul>
          <li><strong>الاسم:</strong> ${buyerName}</li>
          <li><strong>البريد الإلكتروني:</strong> ${buyerEmail}</li>
        </ul>
        
        <strong>الرسالة:</strong>
        <p style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
          "${message}"
        </p>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/messages" class="button">
        الرد على الاستفسار
      </a>
      
      <p>يرجى الرد في أقرب وقت ممكن للحفاظ على تفاعل جيد مع العملاء المحتملين.</p>
    ` : `
      <h2>New Inquiry About Your Listing</h2>
      <p>Hello ${sellerName},</p>
      <p>You have received a new inquiry about your listing "${listingTitle}":</p>
      
      <div class="highlight">
        <strong>Inquirer Details:</strong>
        <ul>
          <li><strong>Name:</strong> ${buyerName}</li>
          <li><strong>Email:</strong> ${buyerEmail}</li>
        </ul>
        
        <strong>Message:</strong>
        <p style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
          "${message}"
        </p>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://teejarti.com'}/messages" class="button">
        Respond to Inquiry
      </a>
      
      <p>Please respond promptly to maintain good engagement with potential clients.</p>
    `;

    const subject = isRtl ? 
      `استفسار جديد: ${listingTitle} - تيجارتي` : 
      `New Inquiry: ${listingTitle} - TEEJARTI`;

    return this.sendEmail({
      to: sellerEmail,
      subject,
      html: this.getBaseTemplate(content, isRtl),
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
