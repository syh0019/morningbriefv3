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
 * 환경 변수 검증
 */
function validateEnvironment() {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'OPENAI_API_KEY',
    'WEATHER_API_KEY',
    'TO_EMAILS',
    'EMAIL_FROM'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('❌ 필수 환경 변수가 설정되지 않았습니다:');
    missing.forEach(key => {
      logger.error(`  - ${key}`);
    });
    logger.info('\n💡 GitHub Secrets에서 다음 변수들을 설정해주세요:');
    logger.info('   Repository Settings > Secrets and variables > Actions > New repository secret');
    return false;
  }
  
  logger.success('✓ 모든 필수 환경 변수가 설정되었습니다.');
  return true;
}

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

  // 환경 변수 검증
  logger.info('\n[0/7] 환경 변수 검증...');
  if (!validateEnvironment()) {
    logger.error('\n❌ 환경 변수 검증 실패');
    process.exit(1);
  }

  // 실패한 단계 추적
  const failures = [];
  
  try {
    // 1. OAuth 인증
    logger.info('\n[1/7] Google OAuth2 인증 시작...');
    const auth = createOAuth2Client();
    
    try {
      await ensureValidToken(auth);
      logger.success('✓ OAuth 인증 완료');
    } catch (error) {
      logger.error('✗ OAuth 인증 실패', error);
      failures.push({ step: 'OAuth 인증', error: error.message });
      throw error; // OAuth 실패는 치명적이므로 중단
    }

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
    
    // 데이터 수집 실패 추적
    if (!weather) failures.push({ step: '날씨 조회', error: '날씨 데이터를 가져올 수 없습니다' });
    if (!calendar) failures.push({ step: '캘린더 조회', error: '캘린더 데이터를 가져올 수 없습니다' });
    if (!emails) failures.push({ step: 'Gmail 조회', error: 'Gmail 데이터를 가져올 수 없습니다' });
    if (!newsData) failures.push({ step: '뉴스 수집', error: '뉴스 데이터를 가져올 수 없습니다' });

    // 3. OpenAI 요약 생성
    logger.info('\n[3/7] OpenAI 요약 생성 시작...');
    
    let newsSummary = null;
    if (newsData && newsData.all.length > 0) {
      try {
        const newsText = formatNewsForSummary(newsData);
        newsSummary = await summarizeNews(newsText);
        if (newsSummary) {
          logger.success(`✓ 뉴스 요약 완료 (${newsSummary.length}자)`);
        } else {
          logger.warn('⚠ 뉴스 요약 실패');
          newsSummary = '뉴스 요약을 생성할 수 없습니다.';
          failures.push({ step: '뉴스 요약', error: 'OpenAI API 응답 없음' });
        }
      } catch (error) {
        logger.error('⚠ 뉴스 요약 중 에러 발생', error);
        newsSummary = '뉴스 요약을 생성할 수 없습니다.';
        failures.push({ step: '뉴스 요약', error: error.message });
      }
    } else {
      logger.warn('⚠ 뉴스가 없어 요약을 건너뜁니다.');
      newsSummary = '오늘 수집된 뉴스가 없습니다.';
    }

    let gmailSummary = null;
    if (emails && emails.length > 0) {
      try {
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
            gmailSummary = 'Gmail 요약을 생성할 수 없습니다.';
            failures.push({ step: 'Gmail 요약', error: 'OpenAI API 응답 없음' });
          }
        }
      } catch (error) {
        logger.error('⚠ Gmail 요약 중 에러 발생', error);
        gmailSummary = 'Gmail 요약을 생성할 수 없습니다.';
        failures.push({ step: 'Gmail 요약', error: error.message });
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
    try {
      await sendEmail(auth, subject, htmlContent);
      logger.success('✓ 이메일 발송 완료');
    } catch (error) {
      logger.error('⚠ 이메일 발송 실패', error);
      failures.push({ step: '이메일 발송', error: error.message });
      // 이메일 발송 실패는 치명적이지 않으므로 계속 진행
    }

    // 7. 실행 결과 요약
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (failures.length === 0) {
      logger.success('🎉 Morning Briefing 완료!');
    } else {
      logger.warn(`⚠️  Morning Briefing 완료 (${failures.length}개 단계 실패)`);
      logger.info('\n실패한 단계:');
      failures.forEach((failure, index) => {
        logger.warn(`  ${index + 1}. ${failure.step}: ${failure.error}`);
      });
    }
    
    logger.info(`\n⏱️  실행 시간: ${elapsed}초`);
    if (webUrl) logger.info(`🌐 웹: ${webUrl}`);
    if (audioUrl) logger.info(`🎧 오디오: ${audioUrl}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 일부 실패가 있어도 웹 페이지와 아카이브가 생성되었다면 성공으로 간주
    // 단, OAuth나 치명적 에러는 이미 위에서 throw되어 catch 블록으로 이동
    if (failures.length > 0) {
      logger.warn('⚠️  일부 단계가 실패했지만 브리핑은 생성되었습니다.');
    }
    
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
