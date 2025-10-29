export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<{ success: boolean; data?: any; error?: any }>;
  getName(): string; // Thêm method để biết đang dùng provider nào
}
