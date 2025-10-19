export function renderEmailTemplate(template, data) {
    const templates = {
        'verify-email': verifyEmailTemplate,
        'password-reset': passwordResetTemplate,
        welcome: welcomeTemplate,
        'new-post-notification': newPostNotificationTemplate,
    };
    const templateFn = templates[template];
    if (!templateFn) {
        throw new Error(`Template ${template} not found`);
    }
    return templateFn(data);
}
function verifyEmailTemplate(data) {
    const isVietnamese = data.locale === 'vi';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #0070f3; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${isVietnamese ? 'Xác nhận email của bạn' : 'Verify your email'}</h2>
        <p>${isVietnamese ? 'Xin chào' : 'Hello'} ${data.name},</p>
        <p>
          ${isVietnamese
        ? 'Cảm ơn bạn đã đăng ký! Vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:'
        : 'Thank you for signing up! Please verify your email address by clicking the button below:'}
        </p>
        <a href="${data.verificationUrl}" class="button">
          ${isVietnamese ? 'Xác nhận Email' : 'Verify Email'}
        </a>
        <p>
          ${isVietnamese ? 'Hoặc copy link sau vào trình duyệt:' : 'Or copy this link into your browser:'}
        </p>
        <p style="word-break: break-all; color: #0070f3;">${data.verificationUrl}</p>
        <p>
          ${isVietnamese ? 'Link này sẽ hết hạn sau 24 giờ.' : 'This link will expire in 24 hours.'}
        </p>
        <div class="footer">
          <p>
            ${isVietnamese
        ? 'Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.'
        : 'If you did not create an account, please ignore this email.'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
${isVietnamese ? 'Xin chào' : 'Hello'} ${data.name},

${isVietnamese
        ? 'Cảm ơn bạn đã đăng ký! Vui lòng xác nhận email bằng cách truy cập:'
        : 'Thank you for signing up! Please verify your email by visiting:'}

${data.verificationUrl}

${isVietnamese ? 'Link này sẽ hết hạn sau 24 giờ.' : 'This link will expire in 24 hours.'}
  `;
    return { html, text };
}
function passwordResetTemplate(data) {
    const isVietnamese = data.locale === 'vi';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #dc2626; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${isVietnamese ? 'Đặt lại mật khẩu' : 'Reset your password'}</h2>
        <p>${isVietnamese ? 'Xin chào' : 'Hello'} ${data.name},</p>
        <p>
          ${isVietnamese
        ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.'
        : 'We received a request to reset your password.'}
        </p>
        <a href="${data.resetUrl}" class="button">
          ${isVietnamese ? 'Đặt lại mật khẩu' : 'Reset Password'}
        </a>
        <p>
          ${isVietnamese ? 'Hoặc copy link sau vào trình duyệt:' : 'Or copy this link into your browser:'}
        </p>
        <p style="word-break: break-all; color: #dc2626;">${data.resetUrl}</p>
        <div class="warning">
          <strong>${isVietnamese ? '⚠️ Chú ý bảo mật' : '⚠️ Security Notice'}</strong><br>
          ${isVietnamese
        ? 'Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.'
        : 'This link will expire in 1 hour. If you did not request a password reset, please ignore this email.'}
        </div>
      </div>
    </body>
    </html>
  `;
    const text = `
${isVietnamese ? 'Xin chào' : 'Hello'} ${data.name},

${isVietnamese
        ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Truy cập link sau:'
        : 'We received a password reset request. Visit this link:'}

${data.resetUrl}

${isVietnamese ? 'Link này sẽ hết hạn sau 1 giờ.' : 'This link will expire in 1 hour.'}
  `;
    return { html, text };
}
function welcomeTemplate(data) {
    const isVietnamese = data.locale === 'vi';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${isVietnamese ? 'Chào mừng!' : 'Welcome!'}</h2>
        <p>${isVietnamese ? 'Xin chào' : 'Hello'} ${data.name},</p>
        <p>
          ${isVietnamese
        ? 'Cảm ơn bạn đã xác nhận email. Tài khoản của bạn đã được kích hoạt!'
        : 'Thank you for verifying your email. Your account is now active!'}
        </p>
      </div>
    </body>
    </html>
  `;
    const text = `${isVietnamese ? 'Chào mừng' : 'Welcome'} ${data.name}!`;
    return { html, text };
}
function newPostNotificationTemplate(data) {
    const isVietnamese = data.locale === 'vi';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .post-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #0070f3; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${isVietnamese ? 'Bài viết mới từ' : 'New post from'} ${data.authorName}</h2>
        <div class="post-card">
          <h3>${data.postTitle}</h3>
          <p>${data.postExcerpt}</p>
          <a href="${data.postUrl}" class="button">
            ${isVietnamese ? 'Đọc bài viết' : 'Read Post'}
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">
          <a href="${data.unsubscribeUrl}">
            ${isVietnamese ? 'Hủy đăng ký' : 'Unsubscribe'}
          </a>
        </p>
      </div>
    </body>
    </html>
  `;
    const text = `${isVietnamese ? 'Bài viết mới' : 'New post'}: ${data.postTitle}\n\n${data.postExcerpt}\n\n${data.postUrl}`;
    return { html, text };
}
export { verifyEmailTemplate, passwordResetTemplate, welcomeTemplate, newPostNotificationTemplate };
//# sourceMappingURL=index.js.map