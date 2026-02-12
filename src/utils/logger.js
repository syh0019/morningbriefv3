/**
 * 로깅 유틸리티
 * 민감한 정보는 로그에 출력하지 않도록 주의
 */

export const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] ${timestamp} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} - ${message}`);
    if (error) {
      console.error(error.message || error);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  },

  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] ${timestamp} - ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  },

  success: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[SUCCESS] ${timestamp} - ${message}`);
  }
};
