#!/usr/bin/env node

/**
 * Gmail 요약 기능 테스트 스크립트
 * 안 읽은 메일을 가져와서 5줄 요약 기능을 테스트합니다.
 */

import 'dotenv/config';
import { createOAuth2Client, ensureValidToken } from '../src/auth/googleOAuth.js';
import { getUnreadEmails } from '../src/services/gmail.js';
import { summarizeEmailsBrief, summarizeEmails } from '../src/services/openai.js';
import { logger } from '../src/utils/logger.js';

async function testEmailSummary() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Gmail 요약 기능 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. OAuth 인증
    console.log('[1/4] Google OAuth2 인증 시작...');
    const auth = createOAuth2Client();
    await ensureValidToken(auth);
    console.log('✓ OAuth 인증 완료\n');

    // 2. 미읽음 메일 조회
    console.log('[2/4] 미읽음 메일 조회 중...');
    const emails = await getUnreadEmails(auth);
    
    if (!emails || emails.length === 0) {
      console.log('미읽음 메일이 없습니다.');
      return;
    }
    
    console.log(`✓ 미읽음 메일 ${emails.length}건 발견\n`);

    // 3. 메일 목록 출력
    console.log('[3/4] 메일 목록:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    emails.slice(0, 10).forEach((email, idx) => {
      console.log(`${idx + 1}. From: ${email.from}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Date: ${email.date}`);
      console.log(`   Preview: ${email.snippet.substring(0, 100)}...`);
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. 5줄 요약 생성
    console.log('[4/4] 5줄 요약 생성 중...');
    const briefSummary = await summarizeEmailsBrief(emails);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 5줄 요약 결과:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(briefSummary);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 비교를 위해 상세 요약도 생성 (옵션)
    const detailedSummary = await summarizeEmails(emails);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 상세 요약 결과 (비교용):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(detailedSummary);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ 테스트 완료!');
    console.log(`📊 통계:`);
    console.log(`   - 미읽음 메일: ${emails.length}건`);
    console.log(`   - 5줄 요약 길이: ${briefSummary.length}자`);
    console.log(`   - 상세 요약 길이: ${detailedSummary.length}자`);
    console.log('');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    logger.error('테스트 에러', error);
    process.exit(1);
  }
}

// 스크립트 실행
testEmailSummary();
