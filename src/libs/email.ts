import { getEmailProvider, SendEmailParams } from './email-providers';

export async function sendEmail(params: SendEmailParams) {
  const provider = getEmailProvider();
  return provider.send(params);
}
