import { Locale } from '#libs/i18n';
import { config } from '../config';

interface BaseTemplateParams {
  locale: Locale;
  preheader?: string;
  children: string;
}

export function baseEmailTemplate({ locale, preheader, children }: BaseTemplateParams): string {
  const isVietnamese = locale === 'vi';
  const logoUrl = `${config.mainAppUrl}/assets/logo-email.png`;

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      ${preheader ? `<meta name="description" content="${preheader}">` : ''}
      <title>${config.email.from.name}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: #f4f4f5;
        }
        .email-wrapper {
          width: 100%;
          background-color: #f4f4f5;
          padding: 20px 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .email-logo {
          max-width: 150px;
          height: auto;
        }
        .email-body {
          padding: 40px 30px;
        }
        .email-footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .warning-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 30px 0;
        }
        .text-muted {
          color: #6b7280;
          font-size: 14px;
        }
        .link {
          color: #667eea;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        @media only screen and (max-width: 600px) {
          .email-body {
            padding: 30px 20px;
          }
          .button {
            display: block;
            text-align: center;
          }
        }
      </style>
    </head>
    <body>
      ${
        preheader
          ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
          : ''
      }
      
      <div class="email-wrapper">
        <div class="email-container">
          <div class="email-header">
            <img src="${logoUrl}" alt="${config.email.from.name}" class="email-logo">
          </div>
          
          <div class="email-body">
            ${children}
          </div>
          
          <div class="email-footer">
            <p>© ${new Date().getFullYear()} ${config.email.from.name}. ${
              isVietnamese ? 'Bảo lưu mọi quyền.' : 'All rights reserved.'
            }</p>
            <p>
              <a href="${config.mainAppUrl}" class="link">${isVietnamese ? 'Trang chủ' : 'Home'}</a> · 
              <a href="${config.mainAppUrl}/contact" class="link">${isVietnamese ? 'Liên hệ' : 'Contact'}</a> · 
              <a href="${config.mainAppUrl}/privacy-policy" class="link">${isVietnamese ? 'Chính sách' : 'Privacy'}</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
