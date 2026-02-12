/**
 * Gmail API를 통한 이메일 발송
 */

import { getGmailClient } from '../auth/googleOAuth.js';
import { logger } from '../utils/logger.js';

/**
 * Gmail API로 이메일 발송
 */
export async function sendEmail(auth, subject, htmlContent) {
  try {
    const toEmails = process.env.TO_EMAILS;
    const fromEmail = process.env.EMAIL_FROM;

    if (!toEmails) {
      throw new Error('TO_EMAILS 환경변수가 설정되지 않았습니다.');
    }

    if (!fromEmail) {
      throw new Error('EMAIL_FROM 환경변수가 설정되지 않았습니다.');
    }

    // 콤마로 구분된 이메일 주소 파싱
    const recipients = toEmails.split(',').map(email => email.trim());

    logger.info('이메일 발송 시작', {
      to: recipients.length,
      subject: subject
    });

    const gmail = getGmailClient(auth);

    // RFC 2822 형식의 이메일 메시지 생성
    const message = createEmailMessage(fromEmail, recipients, subject, htmlContent);

    // Base64url 인코딩
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Gmail API로 전송
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    logger.success('이메일 발송 완료', {
      messageId: response.data.id,
      recipients: recipients.length
    });

    return true;

  } catch (error) {
    logger.error('이메일 발송 실패', error);
    throw error;
  }
}

/**
 * RFC 2822 형식의 이메일 메시지 생성
 */
function createEmailMessage(from, to, subject, htmlContent) {
  const boundary = '----=_Part_' + Date.now();
  
  const message = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    '이 이메일은 HTML 형식입니다. HTML을 지원하는 이메일 클라이언트에서 확인해주세요.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return message;
}
