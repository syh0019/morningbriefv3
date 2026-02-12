/**
 * Google OAuth2 통합 인증 모듈
 * Calendar, Gmail API 모두 이 모듈을 통해 인증
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';

// OAuth2 스코프 정의 (최소 권한 원칙)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',  // 캘린더 읽기
  'https://www.googleapis.com/auth/gmail.readonly',     // Gmail 읽기 (미읽은 메일)
  'https://www.googleapis.com/auth/gmail.send'          // Gmail 발송 (브리핑 전송)
];

/**
 * OAuth2 클라이언트 생성 및 초기화
 */
export function createOAuth2Client() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth 환경변수가 설정되지 않았습니다. (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'  // 리디렉션 URI (로컬 토큰 발급용)
  );

  // Refresh Token 설정
  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN
  });

  logger.info('Google OAuth2 클라이언트 초기화 완료');
  
  return oauth2Client;
}

/**
 * 인증된 Calendar API 클라이언트 반환
 */
export function getCalendarClient(auth) {
  return google.calendar({ version: 'v3', auth });
}

/**
 * 인증된 Gmail API 클라이언트 반환
 */
export function getGmailClient(auth) {
  return google.gmail({ version: 'v1', auth });
}

/**
 * Access Token 검증 및 갱신 (필요시)
 */
export async function ensureValidToken(oauth2Client) {
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Access Token 발급 실패');
    }
    logger.info('Access Token 발급/갱신 완료');
    return true;
  } catch (error) {
    logger.error('Access Token 발급 실패', error);
    throw error;
  }
}

export { SCOPES };
