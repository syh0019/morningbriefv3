#!/usr/bin/env node

/**
 * Morning Briefing 메인 실행 스크립트
 * 모든 서비스를 조율하고 브리핑 이메일을 발송합니다.
 */

import 'dotenv/config';
import { createOAuth2Client, ensureValidToken } from './auth/googleOAuth.js';
import { getWeather } from './services/weather.js';
import { getCalendarEvents } from './services/calendar.js';
import { getUnreadEmails } from './services/gmail.js';
import { collectNews, formatNewsForSummary } from './services/news.js';
import { summarizeNews, summarizeEmails, summarizeEmailsBrief } from './services/openai.js';
import { generateBriefingHTML, generateSubject } from './email/template.js';
import { sendEmail } from './email/sender.js';
import { generateAllOutputs } from './output/generator.js';
import { logger } from './utils/logger.js';
import { getNowKST, formatDateKorean } from './utils/dateUtils.js';

/**
 * 메인 실행 함수
 */
async function main() {
  const startTime = Date.now();
  const now = getNowKST();
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🌅 Morning Briefing 시작');
  logger.info(`📅 날짜: ${formatDateKorean(now)}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. OAuth 인증
    logger.info('\n[1/7] Google OAuth2 인증 시작...');
    const auth = createOAuth2Client();
    await ensureValidToken(auth);
    logger.success('✓ OAuth 인증 완료');

    // 2. 데이터 수집 (병렬 실행)
    logger.info('\n[2/7] 데이터 수집 시작...');
    const [weather, calendar, emails, newsData] = await Promise.all([
      getWeather().catch(err => {
        logger.error('날씨 조회 실패', err);
        return null;
      }),
      getCalendarEvents(auth).catch(err => {
        logger.error('캘린더 조회 실패', err);
        return null;
      }),
      getUnreadEmails(auth).catch(err => {
        logger.error('Gmail 조회 실패', err);
        return null;
      }),
      collectNews().catch(err => {
        logger.error('뉴스 수집 실패', err);
        return null;
      })
    ]);

    // 데이터 수집 결과 로그
    logger.info('\n데이터 수집 완료:');
    logger.info(`  - 날씨: ${weather ? '✓' : '✗'}`);
    logger.info(`  - 캘린더: ${calendar ? `✓ (오늘 ${calendar.today.length}건, 내일 ${calendar.tomorrow.length}건)` : '✗'}`);
    logger.info(`  - Gmail: ${emails ? `✓ (${emails.length}건)` : '✗'}`);
    logger.info(`  - 뉴스: ${newsData ? `✓ (${newsData.all.length}건)` : '✗'}`);

    // 3. OpenAI 요약 생성
    logger.info('\n[3/7] OpenAI 요약 생성 시작...');
    
    let newsSummary = null;
    if (newsData && newsData.all.length > 0) {
      const newsText = formatNewsForSummary(newsData);
      newsSummary = await summarizeNews(newsText);
      if (newsSummary) {
        logger.success(`✓ 뉴스 요약 완료 (${newsSummary.length}자)`);
      } else {
        logger.warn('⚠ 뉴스 요약 실패');
      }
    } else {
      logger.warn('⚠ 뉴스가 없어 요약을 건너뜁니다.');
      newsSummary = '오늘 수집된 뉴스가 없습니다.';
    }

    let gmailSummary = null;
    if (emails && emails.length > 0) {
      // 환경변수로 요약 방식 선택 (기본값: 상세 요약)
      const useBriefSummary = process.env.GMAIL_BRIEF_SUMMARY === 'true';
      
      if (useBriefSummary) {
        gmailSummary = await summarizeEmailsBrief(emails);
        if (gmailSummary) {
          logger.success(`✓ Gmail 5줄 요약 완료 (${gmailSummary.length}자)`);
        } else {
          logger.warn('⚠ Gmail 5줄 요약 실패, 상세 요약으로 전환');
          gmailSummary = await summarizeEmails(emails);
        }
      } else {
        gmailSummary = await summarizeEmails(emails);
        if (gmailSummary) {
          logger.success(`✓ Gmail 상세 요약 완료 (${gmailSummary.length}자)`);
        } else {
          logger.warn('⚠ Gmail 요약 실패');
        }
      }
    } else {
      logger.info('미읽음 메일이 없습니다.');
      gmailSummary = '미읽음 메일이 없습니다.';
    }

    // 4. 출력 파일 생성 (HTML, MP3, 인덱스)
    logger.info('\n[4/7] 출력 파일 생성 (웹/오디오)...');
    
    const briefingData = {
      date: formatDateKorean(now),
      weather: weather,
      calendar: calendar,
      gmail: gmailSummary,
      newsSummary: newsSummary
    };

    // GitHub Pages URL 설정 (환경변수로 주입 가능)
    const baseUrl = process.env.PAGES_URL || 'https://your-username.github.io/morningbriefv3';
    
    let audioUrl = null;
    let webUrl = null;
    
    try {
      const outputs = await generateAllOutputs(briefingData, {
        generateAudioFile: true,
        createArchive: true,
        audioUrl: './today.mp3'
      });
      
      if (outputs.audio) {
        audioUrl = `${baseUrl}/today.mp3`;
        logger.success('✓ 오디오 파일 생성 완료');
      }
      
      if (outputs.html) {
        webUrl = `${baseUrl}/today.html`;
        logger.success('✓ 웹 페이지 생성 완료');
      }
      
      if (outputs.errors.length > 0) {
        logger.warn(`⚠ 일부 출력 생성 실패: ${outputs.errors.length}건`);
        outputs.errors.forEach(err => {
          logger.warn(`  - ${err.step}: ${err.error}`);
        });
      }
    } catch (error) {
      logger.error('⚠ 출력 파일 생성 실패 (이메일은 계속 발송)', error);
    }

    // 5. HTML 이메일 생성
    logger.info('\n[5/7] HTML 이메일 생성...');
    const htmlContent = generateBriefingHTML(briefingData, {
      webUrl: webUrl,
      audioUrl: audioUrl
    });
    const subject = generateSubject();
    logger.success(`✓ HTML 생성 완료 (${htmlContent.length}자)`);

    // 6. 이메일 발송
    logger.info('\n[6/7] 이메일 발송 시작...');
    await sendEmail(auth, subject, htmlContent);
    logger.success('✓ 이메일 발송 완료');

    // 7. 실행 결과 요약
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('🎉 Morning Briefing 완료!');
    logger.info(`⏱️  실행 시간: ${elapsed}초`);
    if (webUrl) logger.info(`🌐 웹: ${webUrl}`);
    if (audioUrl) logger.info(`🎧 오디오: ${audioUrl}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 정상 종료
    process.exit(0);

  } catch (error) {
    logger.error('\n❌ 치명적 에러 발생', error);
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('💥 Morning Briefing 실패');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 실패 종료 (GitHub Actions에서 실패로 표시됨)
    process.exit(1);
  }
}

// 스크립트 실행
main();
