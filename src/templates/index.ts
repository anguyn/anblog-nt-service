import { t, Locale } from '#libs/i18n';
import { baseEmailTemplate } from './base.template';

export type EmailTemplate = 'verify-email' | 'password-reset' | 'welcome' | 'new-post-notification' | 'newsletter';

export interface RenderTemplateParams {
  template: EmailTemplate;
  locale?: Locale;
  data: Record<string, any>;
}

export function renderEmailTemplate({ template, locale = 'vi', data }: RenderTemplateParams) {
  const templates: Record<EmailTemplate, Function> = {
    'verify-email': verifyEmailTemplate,
    'password-reset': passwordResetTemplate,
    welcome: welcomeTemplate,
    'new-post-notification': newPostNotificationTemplate,
    newsletter: newsletterTemplate,
  };

  const templateFn = templates[template];
  if (!templateFn) {
    throw new Error(`Template ${template} not found`);
  }

  return templateFn({ ...data, locale });
}

function verifyEmailTemplate(data: { name: string; verificationUrl: string; locale: Locale }) {
  const { name, verificationUrl, locale } = data;

  const content = `
    <h2>${t('email.verification.subject', locale)}</h2>
    <p>${t('verification.greeting', locale, { name })}</p>
    <p>${t('verification.message', locale)}</p>
    
    <a href="${verificationUrl}" class="button">
      ${t('verification.button', locale)}
    </a>
    
    <p>${t('verification.expiry', locale)}</p>
  `;

  return {
    html: content,
    subject: t('email.verification.subject', locale),
  };
}

function passwordResetTemplate(data: { name: string; resetUrl: string; locale: Locale }) {
  const { name, resetUrl, locale } = data;

  const content = `
    <h2>${locale === 'vi' ? 'Đặt lại mật khẩu' : 'Reset your password'}</h2>
    <p>${locale === 'vi' ? 'Xin chào' : 'Hello'} ${name},</p>
    <p>
      ${
        locale === 'vi'
          ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.'
          : 'We received a request to reset your password.'
      }
    </p>
    
    <a href="${resetUrl}" class="button" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
      ${locale === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password'}
    </a>
    
    <div class="divider"></div>
    
    <p class="text-muted">
      ${locale === 'vi' ? 'Hoặc copy link sau vào trình duyệt:' : 'Or copy this link into your browser:'}
    </p>
    <p style="word-break: break-all;">
      <a href="${resetUrl}" class="link">${resetUrl}</a>
    </p>
    
    <div class="warning-box">
      <strong>⚠️ ${locale === 'vi' ? 'Chú ý bảo mật' : 'Security Notice'}</strong><br>
      ${
        locale === 'vi'
          ? 'Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.'
          : 'This link will expire in 1 hour. If you did not request a password reset, please ignore this email.'
      }
    </div>
  `;

  const html = baseEmailTemplate({
    locale,
    preheader: locale === 'vi' ? 'Đặt lại mật khẩu của bạn' : 'Reset your password',
    children: content,
  });

  const text = `
${locale === 'vi' ? 'Xin chào' : 'Hello'} ${name},

${
  locale === 'vi'
    ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Truy cập link sau:'
    : 'We received a password reset request. Visit this link:'
}

${resetUrl}

${locale === 'vi' ? 'Link này sẽ hết hạn sau 1 giờ.' : 'This link will expire in 1 hour.'}
  `;

  return {
    html,
    text,
    subject: locale === 'vi' ? 'Đặt lại mật khẩu' : 'Reset your password',
  };
}

function welcomeTemplate(data: { name: string; locale: Locale }) {
  const { name, locale } = data;

  const content = `
    <h2>${locale === 'vi' ? 'Chào mừng!' : 'Welcome!'}</h2>
    <p>${locale === 'vi' ? 'Xin chào' : 'Hello'} ${name},</p>
    <p>
      ${
        locale === 'vi'
          ? 'Cảm ơn bạn đã xác nhận email. Tài khoản của bạn đã được kích hoạt!'
          : 'Thank you for verifying your email. Your account is now active!'
      }
    </p>
  `;

  const html = baseEmailTemplate({
    locale,
    preheader: locale === 'vi' ? 'Tài khoản đã được kích hoạt' : 'Your account is now active',
    children: content,
  });

  const text = `${locale === 'vi' ? 'Chào mừng' : 'Welcome'} ${name}!`;

  return {
    html,
    text,
    subject: locale === 'vi' ? 'Chào mừng!' : 'Welcome!',
  };
}

function newPostNotificationTemplate(data: {
  subscriberName: string;
  authorName: string;
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  unsubscribeUrl: string;
  locale: Locale;
}) {
  const { subscriberName, authorName, postTitle, postExcerpt, postUrl, unsubscribeUrl, locale } = data;

  const content = `
    <h2>${locale === 'vi' ? 'Bài viết mới từ' : 'New post from'} ${authorName}</h2>
    <p>${locale === 'vi' ? 'Xin chào' : 'Hello'} ${subscriberName},</p>
    
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; background: #f9fafb;">
      <h3 style="margin-top: 0;">${postTitle}</h3>
      <p>${postExcerpt}</p>
      <a href="${postUrl}" class="button">
        ${locale === 'vi' ? 'Đọc bài viết' : 'Read Post'}
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="text-muted" style="text-align: center;">
      <a href="${unsubscribeUrl}" class="link">
        ${locale === 'vi' ? 'Hủy đăng ký' : 'Unsubscribe'}
      </a>
    </p>
  `;

  const html = baseEmailTemplate({
    locale,
    preheader: postExcerpt.substring(0, 100),
    children: content,
  });

  const text = `${locale === 'vi' ? 'Bài viết mới' : 'New post'}: ${postTitle}\n\n${postExcerpt}\n\n${postUrl}`;

  return {
    html,
    text,
    subject: `${locale === 'vi' ? 'Bài viết mới từ' : 'New post from'} ${authorName}`,
  };
}

function newsletterTemplate(data: {
  title: string;
  content: string;
  featuredImage?: string;
  images?: Array<{ url: string; alt: string }>;
  ctaText?: string;
  ctaUrl?: string;
  locale: Locale;
}) {
  const { title, content, featuredImage, images, ctaText, ctaUrl, locale } = data;

  const content_html = `
    <h1 style="font-size: 28px; margin-bottom: 20px; color: #111827;">${title}</h1>
    
    ${
      featuredImage
        ? `
      <img 
        src="${featuredImage}" 
        alt="${title}"
        style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;"
      >
    `
        : ''
    }
    
    <div style="font-size: 16px; line-height: 1.8;">
      ${content}
    </div>
    
    ${
      images && images.length > 0
        ? `
      <div style="margin: 30px 0;">
        ${images
          .map(
            (img) => `
          <img 
            src="${img.url}" 
            alt="${img.alt}"
            style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;"
          >
        `
          )
          .join('')}
      </div>
    `
        : ''
    }
    
    ${
      ctaText && ctaUrl
        ? `
      <div style="text-align: center; margin: 40px 0;">
        <a href="${ctaUrl}" class="button">${ctaText}</a>
      </div>
    `
        : ''
    }
  `;

  const html = baseEmailTemplate({
    locale,
    preheader: content.substring(0, 100),
    children: content_html,
  });

  return { html, text: content, subject: title };
}

export { verifyEmailTemplate, passwordResetTemplate, welcomeTemplate, newPostNotificationTemplate, newsletterTemplate };
