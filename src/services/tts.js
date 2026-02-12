/**
 * OpenAI TTS (Text-to-Speech) 서비스
 * 브리핑 내용을 한국어 음성으로 변환하여 MP3 파일 생성
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

let openaiClient = null;

/**
 * OpenAI 클라이언트 초기화
 */
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    openaiClient = new OpenAI({
      apiKey: apiKey
    });
  }

  return openaiClient;
}

/**
 * 브리핑 내용을 오디오 스크립트로 변환
 * 너무 길어지지 않도록 3~5분 분량으로 제한
 */
function generateAudioScript(data) {
  const { date, weather, calendar, newsSummary } = data;
  
  let script = `안녕하세요. ${date} 모닝 브리핑을 시작하겠습니다.\n\n`;

  // 1. 날씨 (간략하게)
  if (weather) {
    script += `먼저 오늘의 날씨입니다. `;
    script += `${weather.city} 현재 ${weather.temperature}도, ${weather.description}입니다. `;
    if (weather.fineDust) {
      script += `미세먼지는 ${weather.fineDust}입니다. `;
    }
    script += `\n\n`;
  }

  // 2. 일정 (제목만, 상세 메모 제외 - 보안)
  if (calendar && (calendar.today.length > 0 || calendar.tomorrow.length > 0)) {
    script += `오늘의 일정입니다. `;
    
    if (calendar.today.length > 0) {
      script += `오늘 ${calendar.today.length}건의 일정이 있습니다. `;
      calendar.today.slice(0, 3).forEach((event, idx) => {
        const time = event.start ? new Date(event.start.dateTime || event.start.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }) : '';
        script += `${time ? time + '에 ' : ''}${event.summary}. `;
      });
    }
    
    if (calendar.tomorrow.length > 0) {
      script += `내일은 ${calendar.tomorrow.length}건의 일정이 예정되어 있습니다. `;
    }
    script += `\n\n`;
  }

  // 3. 뉴스 브리핑 (핵심만 추출)
  if (newsSummary) {
    script += `이제 주요 뉴스 브리핑입니다.\n\n`;
    
    // Macro Dashboard 추출 (더 유연한 패턴)
    const macroMatch = newsSummary.match(/📊\s*A\)\s*Macro Dashboard[\s\S]*?━+\s*\n([\s\S]*?)(?=\n\s*━+\s*\n)/);
    if (macroMatch) {
      const macroText = macroMatch[1].trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 300); // 너무 길면 자르기
      script += `먼저 매크로 대시보드입니다. ${macroText}\n\n`;
    }

    // Top Drivers 추출 (상위 3개만)
    const driversMatch = newsSummary.match(/🔥\s*B\)\s*Top Drivers[\s\S]*?\n\n([\s\S]*?)(?=\n\s*━+\s*\n📌)/);
    if (driversMatch) {
      const driversText = driversMatch[1];
      // 각 드라이버 항목 추출 (1️⃣부터 5️⃣까지)
      const drivers = driversText.match(/[1-5]️⃣[\s\S]*?(?=\n\n[1-5]️⃣|\n\n$|$)/g);
      
      if (drivers && drivers.length > 0) {
        script += `주요 이슈입니다. `;
        drivers.slice(0, 3).forEach((driver) => {
          // 제목 추출: [제목] 형식
          const titleMatch = driver.match(/\[([^\]]+)\]/);
          // 핵심 추출: • 핵심: 내용
          const coreMatch = driver.match(/•\s*핵심:\s*([^\n]+)/);
          
          if (titleMatch && coreMatch) {
            const title = titleMatch[1].trim();
            const core = coreMatch[1].trim()
              .replace(/\([^)]*\)/g, '') // 괄호 내용 제거
              .replace(/\s+/g, ' ')
              .substring(0, 150);
            script += `${title}. ${core}. `;
          }
        });
        script += `\n\n`;
      }
    }

    // 카테고리별 한 줄
    const categoryMatch = newsSummary.match(/📌\s*C\)\s*카테고리별 한 줄[\s\S]*?━+\s*\n([\s\S]*?)(?=\n\s*━+\s*\n)/);
    if (categoryMatch) {
      const categories = categoryMatch[1].trim()
        .split('\n')
        .filter(line => line.trim().startsWith('['))
        .slice(0, 4); // 최대 4개
      
      if (categories.length > 0) {
        script += `카테고리별 주요 소식입니다. `;
        categories.forEach(cat => {
          const cleaned = cat.trim()
            .replace(/\s+/g, ' ')
            .substring(0, 100);
          script += `${cleaned}. `;
        });
        script += `\n\n`;
      }
    }
  }

  script += `이상 모닝 브리핑을 마치겠습니다. 좋은 하루 되세요.`;

  // 스크립트 길이 제한 (약 3~5분 = 1500~2500자)
  if (script.length > 2500) {
    script = script.substring(0, 2500) + '... 이상 모닝 브리핑을 마치겠습니다. 좋은 하루 되세요.';
  }

  logger.info('오디오 스크립트 생성 완료', {
    scriptLength: script.length,
    estimatedDuration: `${Math.round(script.length / 10)}초`
  });

  return script;
}

/**
 * OpenAI TTS를 사용하여 MP3 파일 생성
 * @param {Object} data - 브리핑 데이터
 * @param {string} outputPath - 출력 파일 경로
 * @returns {Promise<boolean>} - 성공 여부
 */
export async function generateAudioFile(data, outputPath) {
  try {
    const client = getOpenAIClient();

    logger.info('TTS 오디오 생성 시작...', {
      outputPath
    });

    // 1. 오디오 스크립트 생성
    const script = generateAudioScript(data);

    // 2. OpenAI TTS API 호출
    const mp3Response = await client.audio.speech.create({
      model: 'tts-1', // tts-1 또는 tts-1-hd (더 고품질)
      voice: 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      input: script,
      speed: 1.0 // 0.25 ~ 4.0
    });

    // 3. 출력 디렉토리 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 4. MP3 파일 저장
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    
    logger.success('✓ TTS 오디오 생성 완료', {
      filePath: outputPath,
      fileSize: `${fileSizeMB} MB`,
      scriptLength: script.length
    });

    return true;

  } catch (error) {
    logger.error('TTS 오디오 생성 실패', error);
    return false;
  }
}

/**
 * 오디오 스크립트 미리보기 (디버깅용)
 */
export function previewAudioScript(data) {
  return generateAudioScript(data);
}
