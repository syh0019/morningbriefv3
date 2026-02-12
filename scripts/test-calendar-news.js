#!/usr/bin/env node

/**
 * 구글 캘린더와 뉴스 브리핑 테스트 스크립트
 */

import 'dotenv/config';
import { createOAuth2Client, ensureValidToken } from '../src/auth/googleOAuth.js';
import { getCalendarEvents, formatCalendarSection } from '../src/services/calendar.js';
import { collectNews, formatNewsForSummary } from '../src/services/news.js';
import { logger } from '../src/utils/logger.js';

async function testCalendarAndNews() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 구글 캘린더 & 뉴스 브리핑 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. OAuth 인증
    console.log('[1/3] Google OAuth2 인증 중...');
    const auth = createOAuth2Client();
    await ensureValidToken(auth);
    console.log('✓ OAuth 인증 성공\n');

    // 2. 구글 캘린더 테스트
    console.log('[2/3] 구글 캘린더 조회 중...');
    const calendarData = await getCalendarEvents(auth);
    
    if (calendarData) {
      console.log('✓ 캘린더 조회 성공');
      console.log(`  - 오늘 일정: ${calendarData.today.length}건`);
      console.log(`  - 내일 일정: ${calendarData.tomorrow.length}건`);
      
      console.log('\n📅 오늘 일정:');
      if (calendarData.today.length === 0) {
        console.log('  일정 없음');
      } else {
        calendarData.today.forEach((event, idx) => {
          console.log(`  ${idx + 1}. ${event.time} - ${event.title}`);
          if (event.calendarName) console.log(`     📆 ${event.calendarName}`);
          if (event.location) console.log(`     📍 ${event.location}`);
          if (event.meetLink) console.log(`     🎥 ${event.meetLink}`);
        });
      }
      
      console.log('\n📅 내일 일정:');
      if (calendarData.tomorrow.length === 0) {
        console.log('  일정 없음');
      } else {
        calendarData.tomorrow.forEach((event, idx) => {
          console.log(`  ${idx + 1}. ${event.time} - ${event.title}`);
          if (event.calendarName) console.log(`     📆 ${event.calendarName}`);
          if (event.location) console.log(`     📍 ${event.location}`);
          if (event.meetLink) console.log(`     🎥 ${event.meetLink}`);
        });
      }
      
      console.log('\n📄 HTML 포맷 샘플:');
      const htmlSection = formatCalendarSection(calendarData);
      console.log(htmlSection.substring(0, 300) + '...\n');
    } else {
      console.log('✗ 캘린더 조회 실패\n');
    }

    // 3. 뉴스 브리핑 테스트
    console.log('[3/3] 뉴스 수집 중...');
    const newsData = await collectNews();
    
    if (newsData && newsData.all.length > 0) {
      console.log('✓ 뉴스 수집 성공');
      console.log(`  - 총 ${newsData.all.length}건 수집\n`);
      
      console.log('📰 카테고리별 뉴스:');
      console.log(`  - 국내정책: ${newsData.categorized.domestic.length}건`);
      console.log(`  - 경제: ${newsData.categorized.economy.length}건`);
      console.log(`  - 테크: ${newsData.categorized.tech.length}건`);
      console.log(`  - 글로벌: ${newsData.categorized.global.length}건`);
      
      console.log('\n📰 최근 뉴스 샘플 (각 카테고리 1건):');
      
      if (newsData.categorized.domestic.length > 0) {
        const article = newsData.categorized.domestic[0];
        console.log(`\n[국내정책]`);
        console.log(`  제목: ${article.title}`);
        console.log(`  출처: ${article.source}`);
        console.log(`  링크: ${article.link}`);
      }
      
      if (newsData.categorized.economy.length > 0) {
        const article = newsData.categorized.economy[0];
        console.log(`\n[경제]`);
        console.log(`  제목: ${article.title}`);
        console.log(`  출처: ${article.source}`);
        console.log(`  링크: ${article.link}`);
      }
      
      if (newsData.categorized.tech.length > 0) {
        const article = newsData.categorized.tech[0];
        console.log(`\n[테크]`);
        console.log(`  제목: ${article.title}`);
        console.log(`  출처: ${article.source}`);
        console.log(`  링크: ${article.link}`);
      }
      
      if (newsData.categorized.global.length > 0) {
        const article = newsData.categorized.global[0];
        console.log(`\n[글로벌]`);
        console.log(`  제목: ${article.title}`);
        console.log(`  출처: ${article.source}`);
        console.log(`  링크: ${article.link}`);
      }
      
      console.log('\n📄 OpenAI 요약용 포맷 샘플:');
      const newsFormatted = formatNewsForSummary(newsData);
      console.log(newsFormatted.substring(0, 500) + '...\n');
    } else {
      console.log('✗ 뉴스 수집 실패\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 테스트 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

testCalendarAndNews();
