/**
 * Google News RSS 수집 서비스
 * 카테고리별 뉴스 수집 및 중복 제거
 */

import Parser from 'rss-parser';
import { logger } from '../utils/logger.js';

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MorningBriefBot/1.0)'
  }
});

// Google News RSS 카테고리 정의
const NEWS_CATEGORIES = {
  'domestic': {
    name: '국내정책',
    query: 'site:kr 정책 OR 정부 OR 국회',
    limit: 5
  },
  'economy': {
    name: '경제',
    query: '경제 금리 물가 환율 증시',
    limit: 5
  },
  'tech': {
    name: '테크',
    query: 'AI 반도체 빅테크 스타트업',
    limit: 5
  },
  'global': {
    name: '글로벌',
    query: '미국 중국 연준 ECB 지정학',
    limit: 5
  }
};

/**
 * Google News RSS URL 생성 (URL 인코딩 적용)
 */
function buildNewsUrl(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;
}

/**
 * 모든 카테고리의 뉴스 수집
 */
export async function collectNews() {
  logger.info('Google News RSS 수집 시작');

  const results = {
    domestic: [],
    economy: [],
    tech: [],
    global: []
  };

  const categoryStats = {};

  // 각 카테고리별로 병렬 수집
  const promises = Object.entries(NEWS_CATEGORIES).map(async ([key, config]) => {
    try {
      const url = buildNewsUrl(config.query);
      const articles = await fetchCategoryNews(url, config.limit);
      results[key] = articles;
      categoryStats[config.name] = articles.length;
      logger.info(`${config.name} 카테고리: ${articles.length}건 수집`);
    } catch (error) {
      logger.error(`${config.name} 카테고리 수집 실패`, error);
      categoryStats[config.name] = 0;
    }
  });

  await Promise.all(promises);

  // 중복 제거 (URL 기준)
  const allArticles = [
    ...results.domestic,
    ...results.economy,
    ...results.tech,
    ...results.global
  ];

  const uniqueArticles = removeDuplicates(allArticles);

  logger.info('Google News RSS 수집 완료', {
    ...categoryStats,
    total: uniqueArticles.length
  });

  return {
    categorized: results,
    all: uniqueArticles
  };
}

/**
 * 특정 카테고리의 뉴스 수집
 */
async function fetchCategoryNews(url, limit) {
  try {
    const feed = await rssParser.parseURL(url);
    const articles = [];

    for (let i = 0; i < Math.min(feed.items.length, limit); i++) {
      const item = feed.items[i];
      
      // Google News 리디렉션 링크를 실제 링크로 변환 시도
      let articleUrl = item.link;
      if (articleUrl.includes('news.google.com')) {
        // URL 파라미터에서 실제 링크 추출 시도
        const urlMatch = articleUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          articleUrl = decodeURIComponent(urlMatch[1]);
        }
      }

      articles.push({
        title: cleanTitle(item.title),
        link: articleUrl,
        pubDate: item.pubDate || item.isoDate,
        source: extractSource(item),
        contentSnippet: item.contentSnippet || ''
      });
    }

    return articles;
  } catch (error) {
    logger.error(`RSS 파싱 실패: ${url}`, error);
    return [];
  }
}

/**
 * 제목 정리 (출처 제거 등)
 */
function cleanTitle(title) {
  // "제목 - 출처" 형식에서 출처 제거
  return title.replace(/\s*-\s*[^-]+$/, '').trim();
}

/**
 * 출처 추출
 */
function extractSource(item) {
  // RSS 아이템에서 출처 추출
  if (item.source && item.source.title) {
    return item.source.title;
  }
  
  // 제목에서 출처 추출 시도
  const match = item.title.match(/\s*-\s*([^-]+)$/);
  if (match) {
    return match[1].trim();
  }
  
  return '';
}

/**
 * 중복 제거 (URL 기준 + 제목 유사도)
 */
function removeDuplicates(articles) {
  const seen = new Map();
  const unique = [];

  for (const article of articles) {
    // URL 기준 중복 제거
    if (seen.has(article.link)) {
      continue;
    }

    // 제목 유사도 기준 중복 제거 (간단한 방식)
    let isDuplicate = false;
    const normalizedTitle = normalizeTitle(article.title);
    
    for (const existingTitle of seen.values()) {
      if (isSimilarTitle(normalizedTitle, existingTitle)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(article.link, normalizedTitle);
      unique.push(article);
    }
  }

  return unique;
}

/**
 * 제목 정규화
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 제목 유사도 검사 (단순 포함 관계)
 */
function isSimilarTitle(title1, title2) {
  // 짧은 쪽이 긴 쪽에 포함되어 있으면 유사하다고 판단
  if (title1.length < 10 || title2.length < 10) {
    return false;
  }

  const shorter = title1.length < title2.length ? title1 : title2;
  const longer = title1.length < title2.length ? title2 : title1;

  // 짧은 제목의 70% 이상이 긴 제목에 포함되면 유사
  const words = shorter.split(' ');
  const matchCount = words.filter(word => longer.includes(word)).length;
  
  return matchCount / words.length >= 0.7;
}

/**
 * 뉴스 데이터를 OpenAI 요약용 포맷으로 변환
 */
export function formatNewsForSummary(newsData) {
  const { categorized } = newsData;
  
  let text = '아래는 오늘의 주요 뉴스 헤드라인입니다:\n\n';

  // 카테고리별로 정리
  for (const [key, config] of Object.entries(NEWS_CATEGORIES)) {
    const articles = categorized[key] || [];
    if (articles.length === 0) continue;

    text += `[${config.name}]\n`;
    articles.forEach((article, idx) => {
      text += `${idx + 1}. ${article.title}\n`;
      text += `   출처: ${article.source}\n`;
      text += `   링크: ${article.link}\n`;
      if (article.contentSnippet) {
        text += `   내용: ${article.contentSnippet.substring(0, 200)}...\n`;
      }
      text += '\n';
    });
    text += '\n';
  }

  return text;
}
