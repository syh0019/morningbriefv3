/**
 * 날짜/시간 유틸리티
 * Asia/Seoul 기준으로 처리
 */

import { DateTime } from 'luxon';

const TIMEZONE = 'Asia/Seoul';

/**
 * 현재 KST 시간 반환
 */
export function getNowKST() {
  return DateTime.now().setZone(TIMEZONE);
}

/**
 * 오늘 시작 시간 (00:00:00) KST
 */
export function getTodayStartKST() {
  return DateTime.now().setZone(TIMEZONE).startOf('day');
}

/**
 * 오늘 종료 시간 (23:59:59) KST
 */
export function getTodayEndKST() {
  return DateTime.now().setZone(TIMEZONE).endOf('day');
}

/**
 * 내일 시작 시간 (00:00:00) KST
 */
export function getTomorrowStartKST() {
  return DateTime.now().setZone(TIMEZONE).plus({ days: 1 }).startOf('day');
}

/**
 * 내일 종료 시간 (23:59:59) KST
 */
export function getTomorrowEndKST() {
  return DateTime.now().setZone(TIMEZONE).plus({ days: 1 }).endOf('day');
}

/**
 * ISO 문자열을 KST DateTime 객체로 변환
 */
export function toKST(isoString) {
  return DateTime.fromISO(isoString).setZone(TIMEZONE);
}

/**
 * 날짜를 한국어 포맷으로 변환
 * 예: 2026년 2월 12일 (수)
 */
export function formatDateKorean(dt) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${dt.year}년 ${dt.month}월 ${dt.day}일 (${days[dt.weekday % 7]})`;
}

/**
 * 시간을 HH:MM 포맷으로 변환
 */
export function formatTime(dt) {
  return dt.toFormat('HH:mm');
}

/**
 * DateTime 객체를 ISO 문자열로 변환
 */
export function toISO(dt) {
  return dt.toISO();
}
