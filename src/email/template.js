/**
 * HTML 이메일 템플릿
 * 모바일 반응형 디자인
 */

import { getNowKST, formatDateKorean } from '../utils/dateUtils.js';
import { formatWeatherSection } from '../services/weather.js';
import { formatCalendarSection } from '../services/calendar.js';
import { formatGmailSection } from '../services/gmail.js';
import { formatNewsSummary } from '../services/openai.js';

/**
 * 브리핑 이메일 HTML 생성
 */
export function generateBriefingHTML(data, options = {}) {
  const { weather, calendar, gmail, newsSummary } = data;
  const { webUrl = null, audioUrl = null } = options;
  const now = getNowKST();
  const dateStr = formatDateKorean(now);

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Briefing ${now.toFormat('yyyy-MM-dd')}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .button-group {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .button-audio {
      background-color: #34a853;
      color: white;
    }
    .button-web {
      background-color: #4285f4;
      color: white;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .section {
      padding: 30px 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #202124;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 3px solid #1a73e8;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #5f6368;
      font-size: 13px;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .header h1 {
        font-size: 24px;
      }
      .section {
        padding: 20px 15px;
      }
      .section-title {
        font-size: 20px;
      }
      .button-group {
        flex-direction: column;
        align-items: center;
      }
      .button {
        width: 200px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>☀️ Morning Briefing</h1>
      <p>${dateStr}</p>
      
      ${(webUrl || audioUrl) ? `
      <div class="button-group">
        ${audioUrl ? `<a href="${audioUrl}" class="button button-audio">🎧 오디오로 듣기</a>` : ''}
        ${webUrl ? `<a href="${webUrl}" class="button button-web">🌐 웹에서 보기</a>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Weather Section -->
    <div class="section">
      <div class="section-title">🌤️ 오늘의 날씨</div>
      ${formatWeatherSection(weather)}
    </div>

    <!-- Calendar Section -->
    <div class="section">
      <div class="section-title">📅 일정</div>
      ${formatCalendarSection(calendar)}
    </div>

    <!-- Gmail Section -->
    <div class="section">
      <div class="section-title">📧 미읽음 메일</div>
      ${formatGmailSection(gmail)}
    </div>

    <!-- News Summary Section -->
    <div class="section">
      <div class="section-title">📰 뉴스 브리핑</div>
      ${formatNewsSummary(newsSummary)}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>자동 생성된 Morning Briefing입니다.</p>
      <p>GitHub Actions에서 매일 아침 전송됩니다.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 이메일 제목 생성
 */
export function generateSubject() {
  const now = getNowKST();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = days[now.weekday % 7];
  
  return `Morning Briefing ${now.toFormat('yyyy-MM-dd')} (${dayName})`;
}
