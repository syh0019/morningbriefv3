/**
 * 웹용 HTML 페이지 템플릿 (today.html)
 * 독립 실행형 정적 페이지, 모바일 최적화
 */

import { getNowKST, formatDateKorean } from '../utils/dateUtils.js';
import { formatWeatherSection } from '../services/weather.js';
import { formatCalendarSection } from '../services/calendar.js';
import { formatGmailSection } from '../services/gmail.js';
import { formatNewsSummary } from '../services/openai.js';

/**
 * 웹용 브리핑 페이지 HTML 생성
 * @param {Object} data - 브리핑 데이터
 * @param {string} audioUrl - 오디오 파일 URL (선택)
 * @returns {string} HTML 문자열
 */
export function generateWebHTML(data, audioUrl = null) {
  const { weather, calendar, gmail, newsSummary } = data;
  const now = getNowKST();
  const dateStr = formatDateKorean(now);

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Morning Briefing ${now.toFormat('yyyy-MM-dd')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #202124;
      line-height: 1.6;
      min-height: 100vh;
      padding: 0;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: #ffffff;
      min-height: 100vh;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .header h1 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .header p {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 500;
    }
    
    .audio-player {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      margin: 20px auto 0;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .audio-player h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #ffffff;
      text-align: center;
    }
    
    .audio-player audio {
      width: 100%;
      height: 40px;
      border-radius: 20px;
      outline: none;
    }
    
    .section {
      padding: 40px 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-size: 28px;
      font-weight: 700;
      color: #202124;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid #1a73e8;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-content {
      font-size: 16px;
      color: #5f6368;
      line-height: 1.8;
    }
    
    .footer {
      background-color: #f8f9fa;
      padding: 30px 20px;
      text-align: center;
      color: #5f6368;
      font-size: 14px;
    }
    
    .footer p {
      margin: 8px 0;
    }
    
    .footer a {
      color: #1a73e8;
      text-decoration: none;
      font-weight: 500;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    /* 반응형 디자인 */
    @media only screen and (max-width: 600px) {
      .header h1 {
        font-size: 28px;
      }
      
      .header p {
        font-size: 16px;
      }
      
      .section {
        padding: 30px 16px;
      }
      
      .section-title {
        font-size: 24px;
      }
      
      .section-content {
        font-size: 15px;
      }
      
      .audio-player {
        padding: 16px;
        margin: 16px auto 0;
      }
    }
    
    /* 다크모드 대응 */
    @media (prefers-color-scheme: dark) {
      body {
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
      }
      
      .container {
        background-color: #1a202c;
      }
      
      .section-title {
        color: #e2e8f0;
        border-bottom-color: #4299e1;
      }
      
      .section-content {
        color: #a0aec0;
      }
      
      .footer {
        background-color: #2d3748;
        color: #a0aec0;
      }
    }
    
    /* 프린트 최적화 */
    @media print {
      body {
        background: white;
      }
      
      .container {
        box-shadow: none;
      }
      
      .header {
        position: static;
        background: #667eea;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .audio-player {
        display: none;
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
      
      ${audioUrl ? `
      <!-- Audio Player -->
      <div class="audio-player">
        <h3>🎧 오디오로 듣기</h3>
        <audio controls preload="metadata">
          <source src="${audioUrl}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      </div>
      ` : ''}
    </div>

    <!-- Weather Section -->
    <div class="section">
      <div class="section-title">🌤️ 오늘의 날씨</div>
      <div class="section-content">
        ${formatWeatherSection(weather)}
      </div>
    </div>

    <!-- Calendar Section -->
    <div class="section">
      <div class="section-title">📅 일정</div>
      <div class="section-content">
        ${formatCalendarSection(calendar)}
      </div>
    </div>

    <!-- Gmail Section -->
    <div class="section">
      <div class="section-title">📧 미읽음 메일</div>
      <div class="section-content">
        ${formatGmailSection(gmail)}
      </div>
    </div>

    <!-- News Summary Section -->
    <div class="section">
      <div class="section-title">📰 뉴스 브리핑</div>
      <div class="section-content">
        ${formatNewsSummary(newsSummary)}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Morning Briefing v3</strong></p>
      <p>자동 생성된 브리핑입니다.</p>
      <p>GitHub Actions에서 매일 아침 07:00 KST에 업데이트됩니다.</p>
      <p style="margin-top: 16px;">
        <a href="https://github.com/your-username/morningbriefv3" target="_blank">GitHub Repository</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
