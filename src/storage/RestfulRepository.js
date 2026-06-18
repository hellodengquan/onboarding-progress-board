import { STORAGE_KEYS, DEFAULT_API_CONFIG } from './types.js';

const API_PATHS = {
  [STORAGE_KEYS.TEMPLATES]: '/templates',
  [STORAGE_KEYS.PROGRESS]: '/progress',
  [STORAGE_KEYS.ACTIVE_TAB]: '/ui-state/tab'
};

const getApiErrorInfo = (error, response) => {
  if (error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: '请求服务器超时，请检查网络连接后重试。'
    };
  }
  if (!response) {
    return {
      type: 'network',
      message: '无法连接到服务器，请检查网络连接或 API 地址配置。'
    };
  }

  const statusMessages = {
    400: '请求参数错误，请稍后重试。',
    401: '登录已过期，请重新登录后再操作。',
    403: '没有权限执行此操作，请联系管理员。',
    404: '请求的资源不存在。',
    409: '数据已被其他人修改，请刷新页面后重试。',
    413: '数据量过大，请减少数据量后重试。',
    422: '数据验证失败，请检查输入内容。',
    429: '请求过于频繁，请稍后再试。',
    500: '服务器内部错误，请稍后重试或联系技术支持。',
    502: '网关错误，请稍后重试。',
    503: '服务暂时不可用，请稍后重试。',
    504: '网关超时，请稍后重试。'
  };

  const message = statusMessages[response.status] || `服务器返回错误（${response.status}），请稍后重试。`;

  return {
    type: String(response.status),
    message,
    status: response.status
  };
};

const STORAGE_LABELS = {
  [STORAGE_KEYS.TEMPLATES]: '任务模板',
  [STORAGE_KEYS.PROGRESS]: '员工进度',
  [STORAGE_KEYS.ACTIVE_TAB]: '页面状态',
  [STORAGE_KEYS.BACKEND]: '存储配置',
  [STORAGE_KEYS.API_CONFIG]: 'API 配置'
};

export class RestfulRepository {
  constructor(config = {}, onSaveError) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.onSaveError = onSaveError || (() => {});
    this._abortControllers = new Map();
  }

  _buildUrl(key) {
    const path = API_PATHS[key] || `/data/${key}`;
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}${path}`;
  }

  _getHeaders() {
    return {
      ...this.config.headers,
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  _cancelPending(key) {
    const existing = this._abortControllers.get(key);
    if (existing) {
      existing.abort();
      this._abortControllers.delete(key);
    }
  }

  async load(key, defaultValue) {
    const url = this._buildUrl(key);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this._getHeaders(),
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return { value: defaultValue, fromStorage: false, notFound: true };
      }

      if (!response.ok) {
        const errorInfo = getApiErrorInfo(null, response);
        errorInfo.dataLabel = STORAGE_LABELS[key] || key;
        console.error(`[REST] 读取 ${key} 失败 (${response.status}):`, errorInfo.message);
        return { value: defaultValue, fromStorage: false, error: errorInfo };
      }

      const data = await response.json();
      const value = data.data !== undefined ? data.data : data;
      return { value, fromStorage: true };
    } catch (error) {
      clearTimeout(timeoutId);
      const errorInfo = getApiErrorInfo(error, null);
      errorInfo.dataLabel = STORAGE_LABELS[key] || key;
      console.error(`[REST] 读取 ${key} 失败:`, error);
      return { value: defaultValue, fromStorage: false, error: errorInfo };
    }
  }

  async save(key, value) {
    this._cancelPending(key);

    const url = this._buildUrl(key);
    const controller = new AbortController();
    this._abortControllers.set(key, controller);
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify({ data: value }),
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);
      this._abortControllers.delete(key);

      if (!response.ok) {
        const errorInfo = getApiErrorInfo(null, response);
        errorInfo.dataLabel = STORAGE_LABELS[key] || key;
        this.onSaveError(key, errorInfo);
        return { success: false, error: errorInfo };
      }

      return { success: true };
    } catch (error) {
      clearTimeout(timeoutId);
      this._abortControllers.delete(key);

      if (error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }

      const errorInfo = getApiErrorInfo(error, null);
      errorInfo.dataLabel = STORAGE_LABELS[key] || key;
      this.onSaveError(key, errorInfo);
      return { success: false, error: errorInfo };
    }
  }

  async remove(key) {
    const url = this._buildUrl(key);
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this._getHeaders(),
        credentials: 'include'
      });
      return { success: response.ok || response.status === 404 };
    } catch (error) {
      console.error(`[REST] 删除 ${key} 失败:`, error);
      return { success: false, error };
    }
  }

  async clearAll() {
    try {
      await Promise.all([
        this.remove(STORAGE_KEYS.TEMPLATES),
        this.remove(STORAGE_KEYS.PROGRESS),
        this.remove(STORAGE_KEYS.ACTIVE_TAB)
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  destroy() {
    this._abortControllers.forEach((ctrl) => ctrl.abort());
    this._abortControllers.clear();
  }

  subscribe() {
    return () => {};
  }
}
