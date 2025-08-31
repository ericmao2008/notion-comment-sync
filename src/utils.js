import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 日志级别枚举
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * 获取当前日志级别
 */
function getLogLevel() {
  const level = process.env.LOG_LEVEL || 'info';
  return LOG_LEVELS[level] || LOG_LEVELS.info;
}

/**
 * 日志记录函数
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {*} data - 附加数据
 */
export function log(level, message, data = null) {
  const currentLevel = getLogLevel();
  const messageLevel = LOG_LEVELS[level] || 0;
  
  if (messageLevel <= currentLevel) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化时间
 * @param {string} timeString - ISO时间字符串
 * @returns {string} 格式化的时间字符串
 */
export function formatTime(timeString) {
  try {
    const date = new Date(timeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return timeString;
  }
}

/**
 * 检查字符串是否以指定前缀开头
 * @param {string} text - 要检查的文本
 * @param {string} prefix - 前缀
 * @returns {boolean} 是否以前缀开头
 */
export function startsWithPrefix(text, prefix) {
  return text.trim().startsWith(prefix);
}

/**
 * 移除前缀
 * @param {string} text - 原始文本
 * @param {string} prefix - 要移除的前缀
 * @returns {string} 移除前缀后的文本
 */
export function removePrefix(text, prefix) {
  return text.trim().replace(new RegExp(`^${prefix}\\s*`), '').trim();
}
