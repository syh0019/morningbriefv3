/**
 * 출력 파일 생성 및 관리
 * - today.html (웹용 고정 파일)
 * - today.mp3 (오디오 고정 파일)
 * - 선택적: 날짜별 아카이브
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';
import { generateWebHTML } from './webTemplate.js';
import { generateAudioFile } from '../services/tts.js';
import { getNowKST } from '../utils/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 프로젝트 루트 디렉토리
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// 출력 디렉토리 (GitHub Pages에서 배포될 디렉토리)
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs');

/**
 * 출력 디렉토리 초기화
 */
function ensureOutputDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    logger.info('출력 디렉토리 생성', { path: OUTPUT_DIR });
  }
}

/**
 * 웹용 HTML 파일 생성 (today.html)
 */
export async function generateWebPage(data, audioUrl = null) {
  try {
    ensureOutputDirectory();

    const htmlContent = generateWebHTML(data, audioUrl);
    const outputPath = path.join(OUTPUT_DIR, 'today.html');

    fs.writeFileSync(outputPath, htmlContent, 'utf8');

    logger.success('✓ 웹 페이지 생성 완료', {
      path: outputPath,
      size: `${(htmlContent.length / 1024).toFixed(2)} KB`
    });

    return outputPath;
  } catch (error) {
    logger.error('웹 페이지 생성 실패', error);
    throw error;
  }
}

/**
 * 오디오 파일 생성 (today.mp3)
 */
export async function generateAudio(data) {
  try {
    ensureOutputDirectory();

    const outputPath = path.join(OUTPUT_DIR, 'today.mp3');
    
    const result = await generateAudioFile(data, outputPath);

    if (!result.success) {
      throw new Error('오디오 생성 실패');
    }

    return { outputPath, script: result.script };
  } catch (error) {
    logger.error('오디오 파일 생성 실패', error);
    throw error;
  }
}

/**
 * 날짜별 아카이브 생성 (선택)
 */
export async function archiveBriefing(data, audioGenerated = false, audioScript = null) {
  try {
    ensureOutputDirectory();

    const now = getNowKST();
    const dateString = now.toFormat('yyyy-MM-dd');
    
    // 아카이브 디렉토리
    const archiveDir = path.join(OUTPUT_DIR, 'archive', now.toFormat('yyyy'), now.toFormat('MM'));
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // HTML 아카이브
    const htmlPath = path.join(OUTPUT_DIR, 'today.html');
    const archiveHtmlPath = path.join(archiveDir, `${dateString}.html`);
    if (fs.existsSync(htmlPath)) {
      fs.copyFileSync(htmlPath, archiveHtmlPath);
      logger.info('HTML 아카이브 생성', { path: archiveHtmlPath });
    }

    // MP3 아카이브
    if (audioGenerated) {
      const mp3Path = path.join(OUTPUT_DIR, 'today.mp3');
      const archiveMp3Path = path.join(archiveDir, `${dateString}.mp3`);
      if (fs.existsSync(mp3Path)) {
        fs.copyFileSync(mp3Path, archiveMp3Path);
        logger.info('MP3 아카이브 생성', { path: archiveMp3Path });
      }
    }

    // 대본(Transcript) 아카이브
    if (audioScript) {
      const archiveTranscriptPath = path.join(archiveDir, `${dateString}.txt`);
      fs.writeFileSync(archiveTranscriptPath, audioScript, 'utf8');
      logger.info('대본 아카이브 생성', { path: archiveTranscriptPath });
    }

    return archiveDir;
  } catch (error) {
    logger.error('아카이브 생성 실패', error);
    // 아카이브 실패는 치명적이지 않으므로 에러를 던지지 않음
    return null;
  }
}

/**
 * 인덱스 페이지 생성 (아카이브 목록)
 */
export async function generateIndexPage() {
  try {
    ensureOutputDirectory();

    const now = getNowKST();
    const dateStr = now.toFormat('yyyy-MM-dd');

    const indexHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Briefing</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    
    h1 {
      font-size: 48px;
      margin-bottom: 20px;
      color: #202124;
    }
    
    p {
      font-size: 18px;
      color: #5f6368;
      margin-bottom: 40px;
    }
    
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .button {
      display: inline-block;
      padding: 16px 32px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .button-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .button-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    .button-secondary {
      background: #f1f3f4;
      color: #202124;
    }
    
    .button-secondary:hover {
      background: #e8eaed;
      transform: translateY(-2px);
    }
    
    .updated {
      margin-top: 30px;
      font-size: 14px;
      color: #9aa0a6;
    }
    
    @media (max-width: 600px) {
      .container {
        padding: 40px 24px;
      }
      
      h1 {
        font-size: 36px;
      }
      
      .button {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>☀️ Morning Briefing</h1>
    <p>매일 아침 07:00 KST에 업데이트되는<br>자동 뉴스 브리핑 시스템</p>
    
    <div class="button-group">
      <a href="today.html" class="button button-primary">
        📰 오늘의 브리핑 보기
      </a>
      <a href="today.mp3" class="button button-secondary">
        🎧 오디오로 듣기
      </a>
    </div>
    
    <p class="updated">
      최근 업데이트: ${dateStr}
    </p>
  </div>
</body>
</html>
    `.trim();

    const indexPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(indexPath, indexHTML, 'utf8');

    logger.success('✓ 인덱스 페이지 생성 완료', { path: indexPath });

    return indexPath;
  } catch (error) {
    logger.error('인덱스 페이지 생성 실패', error);
    throw error;
  }
}

/**
 * 모든 출력 파일 생성 (통합 함수)
 */
export async function generateAllOutputs(data, options = {}) {
  const {
    generateAudioFile: shouldGenerateAudio = true,
    createArchive = false,
    audioUrl = './today.mp3'
  } = options;

  const results = {
    html: null,
    audio: null,
    index: null,
    archive: null,
    errors: []
  };

  try {
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📦 출력 파일 생성 시작');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. 오디오 파일 생성 (선택)
    let audioGenerated = false;
    let audioScript = null;
    if (shouldGenerateAudio) {
      try {
        logger.info('\n[1/4] 오디오 파일 생성...');
        const audioResult = await generateAudio(data);
        results.audio = audioResult.outputPath;
        audioScript = audioResult.script;
        audioGenerated = true;
      } catch (error) {
        logger.error('⚠ 오디오 생성 실패 (계속 진행)', error);
        results.errors.push({ step: 'audio', error: error.message });
      }
    } else {
      logger.info('\n[1/4] 오디오 파일 생성 건너뜀');
    }

    // 2. 웹 페이지 생성
    logger.info('\n[2/4] 웹 페이지 생성...');
    results.html = await generateWebPage(data, audioGenerated ? audioUrl : null);

    // 3. 인덱스 페이지 생성
    logger.info('\n[3/4] 인덱스 페이지 생성...');
    results.index = await generateIndexPage();

    // 4. 아카이브 생성 (선택)
    if (createArchive) {
      logger.info('\n[4/4] 아카이브 생성...');
      results.archive = await archiveBriefing(data, audioGenerated, audioScript);
    } else {
      logger.info('\n[4/4] 아카이브 생성 건너뜀');
    }

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('✅ 출력 파일 생성 완료');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return results;
  } catch (error) {
    logger.error('출력 파일 생성 중 치명적 에러', error);
    throw error;
  }
}
