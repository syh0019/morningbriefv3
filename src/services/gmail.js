/**
 * Gmail 서비스
 * 미읽음 메일 조회 (개인정보 보호 적용)
 */

import { getGmailClient } from '../auth/googleOAuth.js';
import { logger } from '../utils/logger.js';

const MAX_EMAIL_CONTENT_LENGTH = 1500; // 메일당 최대 길이
const DEFAULT_UNREAD_MAX = 15;

/**
 * Gmail 미읽음 메일 조회
 */
export async function getUnreadEmails(auth) {
  try {
    const gmail = getGmailClient(auth);
    const maxResults = parseInt(process.env.UNREAD_MAX || DEFAULT_UNREAD_MAX);

    logger.info('Gmail 미읽음 메일 조회 시작');

    // 미읽은 메일 검색
    const query = 'in:inbox is:unread newer_than:2d';
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults
    });

    const messages = listResponse.data.messages || [];
    
    if (messages.length === 0) {
      logger.info('미읽음 메일 없음');
      return [];
    }

    logger.info(`미읽음 메일 ${messages.length}건 발견`);

    // 각 메일의 상세 정보 조회
    const emailPromises = messages.map(message =>
      gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      })
    );

    const emailResponses = await Promise.all(emailPromises);
    const emails = emailResponses.map(response => parseEmail(response.data));

    logger.info(`미읽음 메일 ${emails.length}건 파싱 완료`);

    return emails;

  } catch (error) {
    logger.error('Gmail 미읽음 메일 조회 실패', error);
    return null;
  }
}

/**
 * Gmail 메시지 파싱 (개인정보 마스킹 적용)
 */
function parseEmail(message) {
  const headers = message.payload.headers;
  
  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  const from = getHeader('From');
  const subject = getHeader('Subject');
  const date = getHeader('Date');

  // 스니펫 또는 본문 추출
  let snippet = message.snippet || '';
  
  // 본문 추출 시도 (snippet이 너무 짧은 경우)
  if (snippet.length < 50) {
    const body = getEmailBody(message.payload);
    if (body) {
      snippet = body;
    }
  }

  // 길이 제한
  if (snippet.length > MAX_EMAIL_CONTENT_LENGTH) {
    snippet = snippet.substring(0, MAX_EMAIL_CONTENT_LENGTH) + '...';
  }

  // 개인정보 마스킹
  snippet = maskSensitiveInfo(snippet);

  return {
    id: message.id, // 메일 ID 추가
    from: parseFromAddress(from),
    subject: subject || '(제목 없음)',
    date: date,
    snippet: snippet
  };
}

/**
 * 이메일 본문 추출
 */
function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return decodeBase64(part.body.data);
      }
    }
    
    // text/html도 시도
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body.data) {
        const html = decodeBase64(part.body.data);
        return stripHtmlTags(html);
      }
    }
  }

  return '';
}

/**
 * Base64 디코딩
 */
function decodeBase64(data) {
  try {
    // URL-safe base64를 일반 base64로 변환
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    return '';
  }
}

/**
 * HTML 태그 제거
 */
function stripHtmlTags(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * From 필드 파싱 (이름 우선)
 */
function parseFromAddress(from) {
  // "Name <email@example.com>" 형식 파싱
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return match[1].replace(/^["']|["']$/g, '').trim();
  }
  
  // 이메일만 있는 경우
  if (from.includes('@')) {
    const emailMatch = from.match(/([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }
  
  return from;
}

/**
 * 개인정보 마스킹
 * 이메일, 전화번호, 계좌번호 등 패턴 마스킹
 */
function maskSensitiveInfo(text) {
  // 이메일 마스킹
  text = text.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
  
  // 전화번호 마스킹 (한국 형식)
  text = text.replace(/01[0-9]-?\d{3,4}-?\d{4}/g, '010-****-****');
  text = text.replace(/\d{2,3}-?\d{3,4}-?\d{4}/g, '0**-****-****');
  
  // 계좌번호 패턴 (숫자가 길게 나열된 경우)
  text = text.replace(/\b\d{10,16}\b/g, '************');
  
  return text;
}

/**
 * Gmail 요약 포맷팅 (OpenAI 요약 적용)
 */
export function formatGmailSection(emailSummary) {
  if (!emailSummary) {
    return '<p style="color: #999;">미읽음 메일을 불러오지 못했습니다.</p>';
  }

  // HTML 이스케이프 후 Gmail 링크를 클릭 가능한 링크로 변환
  let formatted = escapeHtml(emailSummary);
  
  // Gmail 링크를 클릭 가능한 <a> 태그로 변환
  formatted = formatted.replace(
    /https:\/\/mail\.google\.com\/mail\/u\/0\/#inbox\/[a-zA-Z0-9]+/g,
    (url) => `<a href="${url}" target="_blank" style="color: #1a73e8; text-decoration: none; font-weight: 500;">${url}</a>`
  );

  return `<div style="white-space: pre-line;">${formatted}</div>`;
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
