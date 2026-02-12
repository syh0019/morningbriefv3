/**
 * 날씨 서비스 (OpenWeatherMap)
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

const DEFAULT_LAT = '37.5665'; // 서울
const DEFAULT_LON = '126.9780';

/**
 * OpenWeatherMap API로 날씨 정보 조회
 */
export async function getWeather() {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
      logger.warn('WEATHER_API_KEY가 설정되지 않았습니다.');
      return null;
    }

    const lat = process.env.WEATHER_LAT || DEFAULT_LAT;
    const lon = process.env.WEATHER_LON || DEFAULT_LON;

    logger.info('날씨 정보 조회 시작', { lat, lon });

    // Current Weather + Forecast 조회
    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'metric',
          lang: 'kr'
        }
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'metric',
          lang: 'kr'
        }
      })
    ]);

    const current = currentResponse.data;
    const forecast = forecastResponse.data;

    // 오늘의 최고/최저 기온 계산 (forecast 데이터에서)
    const today = new Date().toISOString().split('T')[0];
    const todayForecasts = forecast.list.filter(item => 
      item.dt_txt.startsWith(today)
    );

    let maxTemp = current.main.temp_max;
    let minTemp = current.main.temp_min;

    if (todayForecasts.length > 0) {
      const temps = todayForecasts.map(f => f.main.temp);
      maxTemp = Math.max(...temps, maxTemp);
      minTemp = Math.min(...temps, minTemp);
    }

    // 강수확률 계산 (오늘 예보에서)
    let rainProbability = 0;
    if (todayForecasts.length > 0) {
      const probabilities = todayForecasts
        .filter(f => f.pop !== undefined)
        .map(f => f.pop);
      
      if (probabilities.length > 0) {
        rainProbability = Math.max(...probabilities) * 100;
      }
    }

    const weatherData = {
      location: current.name || '서울',
      current: Math.round(current.main.temp),
      max: Math.round(maxTemp),
      min: Math.round(minTemp),
      description: current.weather[0]?.description || '',
      icon: current.weather[0]?.icon || '',
      rainProbability: Math.round(rainProbability),
      humidity: current.main.humidity,
      windSpeed: current.wind.speed
    };

    logger.info('날씨 정보 조회 완료', {
      location: weatherData.location,
      temp: weatherData.current
    });

    return weatherData;

  } catch (error) {
    logger.error('날씨 정보 조회 실패', error);
    return null;
  }
}

/**
 * 날씨 아이콘을 이모지로 변환
 */
function getWeatherEmoji(icon) {
  const iconMap = {
    '01d': '☀️',  // clear sky day
    '01n': '🌙',  // clear sky night
    '02d': '⛅',  // few clouds day
    '02n': '☁️',  // few clouds night
    '03d': '☁️',  // scattered clouds
    '03n': '☁️',
    '04d': '☁️',  // broken clouds
    '04n': '☁️',
    '09d': '🌧️',  // shower rain
    '09n': '🌧️',
    '10d': '🌦️',  // rain day
    '10n': '🌧️',  // rain night
    '11d': '⛈️',  // thunderstorm
    '11n': '⛈️',
    '13d': '🌨️',  // snow
    '13n': '🌨️',
    '50d': '🌫️',  // mist
    '50n': '🌫️'
  };
  
  return iconMap[icon] || '🌤️';
}

/**
 * 날씨를 HTML 포맷으로 변환
 */
export function formatWeatherSection(weather) {
  if (!weather) {
    return '<p style="color: #999;">날씨 정보를 불러오지 못했습니다.</p>';
  }

  const emoji = getWeatherEmoji(weather.icon);

  let html = '';
  html += '<div style="display: flex; align-items: center; gap: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">';
  
  // 아이콘 및 현재 온도
  html += '<div style="font-size: 48px;">' + emoji + '</div>';
  html += '<div style="flex: 1;">';
  html += `<div style="font-size: 32px; font-weight: bold;">${weather.current}°C</div>`;
  html += `<div style="font-size: 14px; opacity: 0.9;">${weather.description}</div>`;
  html += `<div style="font-size: 14px; margin-top: 4px; opacity: 0.9;">`;
  html += `최고 ${weather.max}°C / 최저 ${weather.min}°C`;
  html += '</div>';
  html += '</div>';
  
  // 추가 정보
  html += '<div style="text-align: right; font-size: 13px;">';
  html += `<div>💧 강수 ${weather.rainProbability}%</div>`;
  html += `<div style="margin-top: 4px;">💨 ${weather.windSpeed}m/s</div>`;
  html += `<div style="margin-top: 4px;">💦 습도 ${weather.humidity}%</div>`;
  html += '</div>';
  
  html += '</div>';

  return html;
}
