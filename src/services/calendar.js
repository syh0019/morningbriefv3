/**
 * Google Calendar 서비스
 * 오늘/내일 일정 조회 (KST 기준)
 */

import { getCalendarClient } from '../auth/googleOAuth.js';
import { logger } from '../utils/logger.js';
import {
  getTodayStartKST,
  getTodayEndKST,
  getTomorrowStartKST,
  getTomorrowEndKST,
  toKST,
  formatTime,
  toISO
} from '../utils/dateUtils.js';

/**
 * Google Calendar에서 오늘/내일 일정 조회 (모든 캘린더)
 */
export async function getCalendarEvents(auth) {
  try {
    const calendar = getCalendarClient(auth);

    const todayStart = getTodayStartKST();
    const tomorrowEnd = getTomorrowEndKST();

    logger.info('Google Calendar 일정 조회 시작 (모든 캘린더)', {
      timeMin: toISO(todayStart),
      timeMax: toISO(tomorrowEnd)
    });

    // 1. 모든 캘린더 목록 조회
    const calendarListResponse = await calendar.calendarList.list();
    const calendars = calendarListResponse.data.items || [];
    
    logger.info(`총 ${calendars.length}개의 캘린더 발견`);

    // 2. 각 캘린더에서 일정 조회 (병렬 처리)
    const eventPromises = calendars
      .filter(cal => cal.selected !== false) // 선택된 캘린더만
      .map(async (cal) => {
        try {
          const response = await calendar.events.list({
            calendarId: cal.id,
            timeMin: toISO(todayStart),
            timeMax: toISO(tomorrowEnd),
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: 'Asia/Seoul'
          });

          const events = response.data.items || [];
          logger.info(`${cal.summary}: ${events.length}건`);
          
          // 각 이벤트에 캘린더 정보 추가
          return events.map(event => ({
            ...event,
            calendarName: cal.summary,
            calendarColor: cal.backgroundColor
          }));
        } catch (error) {
          logger.warn(`캘린더 조회 실패: ${cal.summary}`, error.message);
          return [];
        }
      });

    const eventArrays = await Promise.all(eventPromises);
    const allEvents = eventArrays.flat();

    // 3. 이벤트 ID 기준 중복 제거 (같은 일정이 여러 캘린더에 표시될 수 있음)
    const uniqueEvents = [];
    const seenIds = new Set();
    
    for (const event of allEvents) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        uniqueEvents.push(event);
      }
    }

    // 4. 시간순으로 정렬
    uniqueEvents.sort((a, b) => {
      const timeA = a.start.dateTime || a.start.date;
      const timeB = b.start.dateTime || b.start.date;
      return new Date(timeA) - new Date(timeB);
    });

    // 5. 오늘/내일로 분류
    const todayEnd = getTodayEndKST();
    const todayEvents = [];
    const tomorrowEvents = [];

    for (const event of uniqueEvents) {
      const startTime = event.start.dateTime || event.start.date;
      const startKST = toKST(startTime);

      if (startKST <= todayEnd) {
        todayEvents.push(formatEvent(event));
      } else {
        tomorrowEvents.push(formatEvent(event));
      }
    }

    logger.info('Google Calendar 일정 조회 완료', {
      calendars: calendars.length,
      today: todayEvents.length,
      tomorrow: tomorrowEvents.length,
      total: uniqueEvents.length
    });

    return {
      today: todayEvents,
      tomorrow: tomorrowEvents
    };

  } catch (error) {
    logger.error('Google Calendar 조회 실패', error);
    return null;
  }
}

/**
 * 이벤트를 브리핑용 포맷으로 변환
 */
function formatEvent(event) {
  const isAllDay = !event.start.dateTime;
  
  let timeDisplay = '';
  if (isAllDay) {
    timeDisplay = '종일';
  } else {
    const startTime = toKST(event.start.dateTime);
    const endTime = toKST(event.end.dateTime);
    timeDisplay = `${formatTime(startTime)} ~ ${formatTime(endTime)}`;
  }

  // Google Meet 링크 추출
  let meetLink = null;
  if (event.hangoutLink) {
    meetLink = event.hangoutLink;
  } else if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      entry => entry.entryPointType === 'video'
    );
    if (videoEntry) {
      meetLink = videoEntry.uri;
    }
  }

  return {
    time: timeDisplay,
    title: event.summary || '(제목 없음)',
    location: event.location || null,
    meetLink: meetLink,
    isAllDay: isAllDay,
    calendarName: event.calendarName || null,
    calendarColor: event.calendarColor || null
  };
}

/**
 * 일정을 HTML 포맷으로 변환
 */
export function formatCalendarSection(calendarData) {
  if (!calendarData) {
    return '<p style="color: #999;">일정 정보를 불러오지 못했습니다.</p>';
  }

  const { today, tomorrow } = calendarData;

  let html = '';

  // 오늘 일정
  html += '<h3 style="color: #1a73e8; margin-top: 0;">📅 오늘</h3>';
  if (today.length === 0) {
    html += '<p style="color: #666;">일정 없음</p>';
  } else {
    html += '<ul style="list-style: none; padding: 0;">';
    for (const event of today) {
      html += '<li style="margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px;">';
      html += `<div style="font-weight: 600; color: #202124;">${event.time}</div>`;
      html += `<div style="margin-top: 4px; font-size: 15px;">${escapeHtml(event.title)}</div>`;
      
      if (event.calendarName) {
        html += `<div style="margin-top: 4px; color: #5f6368; font-size: 12px;">📆 ${escapeHtml(event.calendarName)}</div>`;
      }
      
      if (event.location) {
        html += `<div style="margin-top: 4px; color: #5f6368; font-size: 13px;">📍 ${escapeHtml(event.location)}</div>`;
      }
      
      if (event.meetLink) {
        html += `<div style="margin-top: 4px;"><a href="${event.meetLink}" style="color: #1a73e8; text-decoration: none; font-size: 13px;">🎥 Google Meet 참여</a></div>`;
      }
      
      html += '</li>';
    }
    html += '</ul>';
  }

  // 내일 일정
  html += '<h3 style="color: #1a73e8; margin-top: 20px;">📅 내일</h3>';
  if (tomorrow.length === 0) {
    html += '<p style="color: #666;">일정 없음</p>';
  } else {
    html += '<ul style="list-style: none; padding: 0;">';
    for (const event of tomorrow) {
      html += '<li style="margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px;">';
      html += `<div style="font-weight: 600; color: #202124;">${event.time}</div>`;
      html += `<div style="margin-top: 4px; font-size: 15px;">${escapeHtml(event.title)}</div>`;
      
      if (event.calendarName) {
        html += `<div style="margin-top: 4px; color: #5f6368; font-size: 12px;">📆 ${escapeHtml(event.calendarName)}</div>`;
      }
      
      if (event.location) {
        html += `<div style="margin-top: 4px; color: #5f6368; font-size: 13px;">📍 ${escapeHtml(event.location)}</div>`;
      }
      
      if (event.meetLink) {
        html += `<div style="margin-top: 4px;"><a href="${event.meetLink}" style="color: #1a73e8; text-decoration: none; font-size: 13px;">🎥 Google Meet 참여</a></div>`;
      }
      
      html += '</li>';
    }
    html += '</ul>';
  }

  return html;
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
