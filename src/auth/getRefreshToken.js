#!/usr/bin/env node

/**
 * Google OAuth2 Refresh Token 발급 스크립트
 * 최초 1회 로컬에서 실행하여 Refresh Token을 발급받습니다.
 * 
 * 사용법:
 * 1. .env 파일에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 설정
 * 2. node src/auth/getRefreshToken.js 실행
 * 3. 브라우저에서 Google 계정 로그인 및 권한 승인
 * 4. 출력된 Refresh Token을 GitHub Secrets에 등록
 */

import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import open from 'open';

// 환경변수 로드 (로컬 실행 시)
import dotenv from 'dotenv';
dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const PORT = 3000;

async function getRefreshToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('❌ 에러: GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET 환경변수를 설정해주세요.');
    console.error('   .env 파일을 생성하거나 환경변수로 설정하세요.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  // 인증 URL 생성
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Refresh Token 발급
    scope: SCOPES,
    prompt: 'consent'  // 매번 동의 화면 표시 (Refresh Token 재발급)
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Google OAuth2 Refresh Token 발급');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. 브라우저가 자동으로 열립니다.');
  console.log('2. Google 계정으로 로그인하세요.');
  console.log('3. 권한 승인 화면에서 "허용"을 클릭하세요.\n');

  // HTTP 서버 시작 (콜백 수신)
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      
      if (url.pathname === '/oauth2callback') {
        const code = url.searchParams.get('code');
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>❌ 인증 실패</h1><p>인증 코드를 받지 못했습니다.</p>');
          server.close();
          process.exit(1);
        }

        // 인증 코드로 토큰 교환
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>⚠️ Refresh Token 없음</h1><p>이미 발급받은 적이 있을 수 있습니다. Google 계정 설정에서 앱 연결을 해제하고 다시 시도하세요.</p>');
          server.close();
          process.exit(1);
        }

        // 성공 응답
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>✅ 인증 성공!</h1>
              <p>터미널로 돌아가서 Refresh Token을 확인하세요.</p>
              <p>이 창은 닫아도 됩니다.</p>
            </body>
          </html>
        `);

        // 콘솔에 결과 출력
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Refresh Token 발급 완료!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('아래 값을 GitHub Secrets에 등록하세요:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 서버 종료
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ 에러:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>❌ 에러 발생</h1><p>터미널을 확인하세요.</p>');
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, async () => {
    console.log(`로컬 서버 시작: http://localhost:${PORT}\n`);
    
    try {
      // 브라우저 자동 오픈
      await open(authUrl);
    } catch (error) {
      console.log('브라우저를 자동으로 열 수 없습니다. 아래 URL을 복사하여 브라우저에 붙여넣으세요:\n');
      console.log(authUrl);
      console.log();
    }
  });
}

// 실행
getRefreshToken().catch(error => {
  console.error('❌ 치명적 에러:', error);
  process.exit(1);
});
