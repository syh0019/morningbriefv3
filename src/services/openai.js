/**
 * OpenAI 요약 서비스
 * 뉴스 요약 (투자/거시 시황 중심) + Gmail 미읽음 메일 요약
 */

import OpenAI from 'openai';
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

    logger.info('OpenAI 클라이언트 초기화 완료');
  }

  return openaiClient;
}

/**
 * 뉴스 요약 (투자/거시 시황 중심)
 */
export async function summarizeNews(newsText) {
  try {
    const client = getOpenAIClient();

    logger.info('뉴스 요약 시작', {
      inputLength: newsText.length
    });

    const prompt = `당신은 전문 금융/투자 애널리스트입니다. 아래 뉴스 헤드라인들을 분석하여 투자자 관점에서 요약해주세요.

${newsText}

아래 구조를 **정확히** 따라 요약해주세요:

━━━━━━━━━━━━━━━━━━━━━━━━━
📊 A) Macro Dashboard (3-5줄)
━━━━━━━━━━━━━━━━━━━━━━━━━
(Risk-on/off 분위기, 금리/달러/유가/주요 지표, 정책 이벤트 요약)

━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 B) Top Drivers (5개)
━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ [헤드라인]
   • 핵심: (2문장 요약)
   • 시장영향: (주식/채권/FX/원자재 중 해당)
   • 링크: (기사 URL)

(2️⃣~5️⃣ 동일 형식)

━━━━━━━━━━━━━━━━━━━━━━━━━
📌 C) 카테고리별 한 줄
━━━━━━━━━━━━━━━━━━━━━━━━━
[KR 정책] (한 줄 핵심)
[KR 경제/시장] (한 줄 핵심)
[Tech] (한 줄 핵심)
[Global] (한 줄 핵심)

━━━━━━━━━━━━━━━━━━━━━━━━━
✅ D) 오늘의 체크포인트 (3개)
━━━━━━━━━━━━━━━━━━━━━━━━━
1. [모니터링 이벤트]
   • 시나리오 A: (짧게)
   • 시나리오 B: (짧게)

(2~3 동일 형식)

주의사항:
- 한국어로 작성
- 중복 이슈는 묶어서 정리
- 투자자 관점에서 실용적으로
- 구조를 정확히 따를 것`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 전문 금융 애널리스트로, 뉴스를 투자자 관점에서 요약합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const summary = completion.choices[0].message.content.trim();

    logger.info('뉴스 요약 완료', {
      outputLength: summary.length,
      tokensUsed: completion.usage.total_tokens
    });

    return summary;

  } catch (error) {
    logger.error('뉴스 요약 실패', error);
    return null;
  }
}

/**
 * Gmail 미읽음 메일 요약
 */
export async function summarizeEmails(emails) {
  try {
    if (!emails || emails.length === 0) {
      return '미읽음 메일이 없습니다.';
    }

    const client = getOpenAIClient();

    logger.info('Gmail 메일 요약 시작', {
      emailCount: emails.length
    });

    // 이메일 데이터를 텍스트로 변환
    let emailText = '아래는 미읽음 메일 목록입니다:\n\n';
    emails.forEach((email, idx) => {
      emailText += `메일 ${idx + 1}:\n`;
      emailText += `From: ${email.from}\n`;
      emailText += `Subject: ${email.subject}\n`;
      emailText += `Date: ${email.date}\n`;
      emailText += `Content: ${email.snippet.substring(0, 500)}\n\n`;
    });

    const prompt = `당신은 개인 비서입니다. 아래 미읽음 메일들을 분석하여 요약해주세요.

${emailText}

아래 형식으로 요약해주세요:

━━━━━━━━━━━━━━━━━━━━━━━━━
📧 미읽음 메일 상세 요약 (총 ${emails.length}건)
━━━━━━━━━━━━━━━━━━━━━━━━━

${emails.slice(0, Math.min(15, emails.length)).map((_, idx) => `
${idx + 1}. From: [보낸 사람]
   Subject: [제목 전체]
   Date: [날짜]
   
   📝 핵심 내용:
   - (이메일의 주요 내용을 3-5줄로 상세히 설명)
   - (중요한 정보, 날짜, 금액, 링크 등 포함)
   - (메일에서 요구하는 사항이나 제공하는 정보 명시)
   
   ⚡ 액션 아이템:
   - [Reply/Review/Track/Ignore/Forward 중 하나]
   - (왜 그런 액션이 필요한지 구체적으로 설명)
   - (우선순위: 높음/중간/낮음)
   
   🔗 관련 링크/첨부파일: (있다면)
   
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 우선순위 높은 메일 (Top 3)
━━━━━━━━━━━━━━━━━━━━━━━━━
(가장 중요한 3개를 번호와 제목으로 다시 강조하고 즉시 조치가 필요한 이유 설명)

━━━━━━━━━━━━━━━━━━━━━━━━━
📊 카테고리별 요약
━━━━━━━━━━━━━━━━━━━━━━━━━
- [업무]: X건 (주요 내용)
- [개인]: X건 (주요 내용)
- [뉴스레터]: X건 (주요 내용)
- [알림]: X건 (주요 내용)

주의사항:
- 한국어로 작성
- 각 메일의 내용을 충분히 상세하게 설명하여 메일을 읽지 않아도 전체 내용을 파악할 수 있도록 함
- 날짜, 금액, 링크 등 구체적인 정보 반드시 포함
- 액션은 구체적이고 실용적으로
- 우선순위를 명확히 표시
- 최대 ${Math.min(15, emails.length)}개까지 상세 표시`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 개인 비서로, 이메일을 분석하여 액션 아이템을 정리합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const summary = completion.choices[0].message.content.trim();

    logger.info('Gmail 메일 요약 완료', {
      outputLength: summary.length,
      tokensUsed: completion.usage.total_tokens
    });

    return summary;

  } catch (error) {
    logger.error('Gmail 메일 요약 실패', error);
    
    // 실패 시 기본 목록이라도 반환
    if (emails && emails.length > 0) {
      let fallback = `미읽음 메일 ${emails.length}건 (요약 실패, 목록만 표시)\n\n`;
      emails.slice(0, 10).forEach((email, idx) => {
        fallback += `${idx + 1}. From: ${email.from}\n`;
        fallback += `   Subject: ${email.subject}\n`;
        fallback += `   Date: ${email.date}\n\n`;
      });
      return fallback;
    }
    
    return null;
  }
}

/**
 * Gmail 미읽음 메일 5줄 요약 (간결 버전)
 */
export async function summarizeEmailsBrief(emails) {
  try {
    if (!emails || emails.length === 0) {
      return '미읽음 메일이 없습니다.';
    }

    const client = getOpenAIClient();

    logger.info('Gmail 메일 5줄 요약 시작', {
      emailCount: emails.length
    });

    // 이메일 데이터를 텍스트로 변환
    let emailText = '아래는 미읽음 메일 목록입니다:\n\n';
    emails.forEach((email, idx) => {
      emailText += `메일 ${idx + 1}:\n`;
      emailText += `From: ${email.from}\n`;
      emailText += `Subject: ${email.subject}\n`;
      emailText += `Date: ${email.date}\n`;
      emailText += `Content: ${email.snippet.substring(0, 500)}\n\n`;
    });

    const prompt = `당신은 개인 비서입니다. 아래 미읽음 메일들을 분석하여 **정확히 5줄로** 요약해주세요.

${emailText}

**요구사항:**
- 정확히 5줄로 요약 (각 줄은 한 문장)
- 각 줄은 가장 중요한 메일이나 핵심 내용을 담을 것
- 간결하고 핵심만 전달
- 한국어로 작성

**형식 예시:**
1. [보낸사람]: [제목] - [한 줄 핵심 내용]
2. [보낸사람]: [제목] - [한 줄 핵심 내용]
3. [보낸사람]: [제목] - [한 줄 핵심 내용]
4. [보낸사람]: [제목] - [한 줄 핵심 내용]
5. [보낸사람]: [제목] - [한 줄 핵심 내용]

주의: 메일이 5개 미만이면 해당 개수만큼만 작성하고, 5개를 초과하면 가장 중요한 5개만 선별하세요.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 개인 비서로, 이메일을 간결하게 요약합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const summary = completion.choices[0].message.content.trim();

    logger.info('Gmail 메일 5줄 요약 완료', {
      outputLength: summary.length,
      tokensUsed: completion.usage.total_tokens
    });

    return summary;

  } catch (error) {
    logger.error('Gmail 메일 5줄 요약 실패', error);
    
    // 실패 시 간단한 목록 반환
    if (emails && emails.length > 0) {
      let fallback = '';
      emails.slice(0, 5).forEach((email, idx) => {
        fallback += `${idx + 1}. ${email.from}: ${email.subject}\n`;
      });
      return fallback;
    }
    
    return null;
  }
}

/**
 * 뉴스 요약을 HTML 포맷으로 변환
 */
export function formatNewsSummary(summary) {
  if (!summary) {
    return '<p style="color: #999;">뉴스 요약을 생성하지 못했습니다.</p>';
  }

  // 마크다운 스타일을 HTML로 변환
  let html = summary
    .replace(/━━━━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border: none; border-top: 2px solid #e0e0e0; margin: 20px 0;">')
    .replace(/^📊 (.*?)$/gm, '<h3 style="color: #1a73e8; margin-top: 20px;">📊 $1</h3>')
    .replace(/^🔥 (.*?)$/gm, '<h3 style="color: #ea4335; margin-top: 20px;">🔥 $1</h3>')
    .replace(/^📌 (.*?)$/gm, '<h3 style="color: #34a853; margin-top: 20px;">📌 $1</h3>')
    .replace(/^✅ (.*?)$/gm, '<h3 style="color: #fbbc04; margin-top: 20px;">✅ $1</h3>')
    .replace(/^\[(.+?)\]/gm, '<strong style="color: #5f6368;">[$1]</strong>')
    .replace(/^([1-5])️⃣ \[(.+?)\]/gm, '<h4 style="color: #202124; margin-top: 15px;">$1️⃣ $2</h4>')
    .replace(/^\s*•\s*(.+?)$/gm, '<div style="margin-left: 20px; margin-top: 5px;">• $1</div>')
    .replace(/\n\n/g, '<br/><br/>');

  return `<div style="white-space: pre-line; line-height: 1.6;">${html}</div>`;
}
