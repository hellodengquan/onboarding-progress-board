import { STORAGE_KEYS, DEFAULT_API_CONFIG } from './types.js';

const API_PATHS = {
  [STORAGE_KEYS.TEMPLATES]: '/templates',
  [STORAGE_KEYS.PROGRESS]: '/progress',
  [STORAGE_KEYS.ACTIVE_TAB]: '/ui-state/tab'
};

export const CONFLICT_TYPES = {
  ETAG: 'etag',
  LAST_UPDATED: 'last_updated',
  VERSION: 'version'
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
    409: '数据已被其他人修改，请选择如何处理。',
    412: '数据版本不匹配，服务器上的版本已更新。',
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
  constructor(config = {}, onSaveError, onConflict) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.onSaveError = onSaveError || (() => {});
    this.onConflict = onConflict || (() => {});
    this._abortControllers = new Map();
    this._versions = {};
    this._lastUpdatedAts = {};
  }

  _buildUrl(key) {
    const path = API_PATHS[key] || `/data/${key}`;
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}${path}`;
  }

  _getHeaders(key) {
    const headers = {
      ...this.config.headers,
      'X-Requested-With': 'XMLHttpRequest'
    };

    const version = this._versions[key];
    if (version) {
      headers['If-Match'] = `"${version}"`;
    }

    const lastUpdatedAt = this._lastUpdatedAts[key];
    if (lastUpdatedAt) {
      headers['X-Last-Updated-At'] = lastUpdatedAt;
    }

    return headers;
  }

  _cancelPending(key) {
    const existing = this._abortControllers.get(key);
    if (existing) {
      existing.abort();
      this._abortControllers.delete(key);
    }
  }

  _extractVersionInfo(response, key) {
    const etag = response.headers.get('ETag');
    const lastUpdated = response.headers.get('Last-Modified') || response.headers.get('X-Last-Updated-At');
    const versionHeader = response.headers.get('X-Version');

    if (etag) {
      this._versions[key] = etag.replace(/^"|"$/g, '');
    }
    if (lastUpdated) {
      this._lastUpdatedAts[key] = lastUpdated;
    }
    if (versionHeader) {
      this._versions[key] = versionHeader;
    }
  }

  async load(key, defaultValue) {
    const url = this._buildUrl(key);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this._getHeaders(key),
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        this._versions[key] = null;
        this._lastUpdatedAts[key] = null;
        return { value: defaultValue, fromStorage: false, notFound: true };
      }

      if (!response.ok) {
        const errorInfo = getApiErrorInfo(null, response);
        errorInfo.dataLabel = STORAGE_LABELS[key] || key;
        console.error(`[REST] 读取 ${key} 失败 (${response.status}):`, errorInfo.message);
        return { value: defaultValue, fromStorage: false, error: errorInfo };
      }

      this._extractVersionInfo(response, key);

      const data = await response.json();
      let value = data.data !== undefined ? data.data : data;
      const lastUpdatedAt = data.lastUpdatedAt || this._lastUpdatedAts[key];
      const version = data.version || this._versions[key];

      if (lastUpdatedAt) {
        this._lastUpdatedAts[key] = lastUpdatedAt;
      }
      if (version) {
        this._versions[key] = version;
      }

      if (typeof value === 'object' && value !== null) {
        if (value.data !== undefined) {
          value = value.data;
        }
      }

      return {
        value,
        fromStorage: true,
        version: this._versions[key],
        lastUpdatedAt: this._lastUpdatedAts[key]
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const errorInfo = getApiErrorInfo(error, null);
      errorInfo.dataLabel = STORAGE_LABELS[key] || key;
      console.error(`[REST] 读取 ${key} 失败:`, error);
      return { value: defaultValue, fromStorage: false, error: errorInfo };
    }
  }

  async save(key, value, options = {}) {
    if (options.force) {
      this._versions[key] = null;
      this._lastUpdatedAts[key] = null;
    }

    this._cancelPending(key);

    const url = this._buildUrl(key);
    const controller = new AbortController();
    this._abortControllers.set(key, controller);
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const now = new Date().toISOString();
    const requestBody = {
      data: value,
      lastUpdatedAt: this._lastUpdatedAts[key] || now,
      version: this._versions[key] || Date.now().toString()
    };

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this._getHeaders(key),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);
      this._abortControllers.delete(key);

      if (response.status === 409 || response.status === 412) {
        let serverData = null;
        let serverVersion = null;
        let serverLastUpdated = null;

        try {
          const conflictData = await response.json();
          serverData = conflictData.data !== undefined ? conflictData.data : conflictData;
          serverVersion = conflictData.version || response.headers.get('X-Version') || response.headers.get('ETag');
          serverLastUpdated = conflictData.lastUpdatedAt || response.headers.get('X-Last-Updated-At') || response.headers.get('Last-Modified');
        } catch {
          // ignore
        }

        const conflictInfo = {
          type: response.status === 409 ? 'version' : 'etag',
          key,
          dataLabel: STORAGE_LABELS[key] || key,
          localData: value,
          serverData,
          localVersion: this._versions[key],
          serverVersion: serverVersion ? serverVersion.replace(/^"|"$/g, '') : null,
          localLastUpdated: this._lastUpdatedAts[key],
          serverLastUpdated,
          message: response.status === 409
            ? '数据已被其他人修改，版本不匹配'
            : '服务器上的版本已更新，您的修改基于旧版本'
        };

        return {
          success: false,
          conflict: true,
          conflictInfo,
          resolve: async (resolution, mergedData) => {
            if (resolution === 'force') {
              return this.save(key, value, { force: true });
            } else if (resolution === 'merge' && mergedData) {
              return this.save(key, mergedData, { force: true });
            } else {
              this._versions[key] = conflictInfo.serverVersion;
              this._lastUpdatedAts[key] = conflictInfo.serverLastUpdated;
              return { success: false, cancelled: true, serverData };
            }
          }
        };
      }

      if (!response.ok) {
        const errorInfo = getApiErrorInfo(null, response);
        errorInfo.dataLabel = STORAGE_LABELS[key] || key;
        this.onSaveError(key, errorInfo);
        return { success: false, error: errorInfo };
      }

      this._extractVersionInfo(response, key);

      try {
        const responseData = await response.json();
        if (responseData && responseData.version) {
          this._versions[key] = responseData.version;
        }
        if (responseData && responseData.lastUpdatedAt) {
          this._lastUpdatedAts[key] = responseData.lastUpdatedAt;
        }
      } catch {
        // ignore parse error
      }

      if (!this._lastUpdatedAts[key]) {
        this._lastUpdatedAts[key] = now;
      }

      return {
        success: true,
        version: this._versions[key],
        lastUpdatedAt: this._lastUpdatedAts[key]
      };
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
        headers: this._getHeaders(key),
        credentials: 'include'
      });
      if (response.ok || response.status === 404) {
        this._versions[key] = null;
        this._lastUpdatedAts[key] = null;
        return { success: true };
      }
      return { success: false };
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

  getVersion(key) {
    return this._versions[key] || null;
  }

  getLastUpdatedAt(key) {
    return this._lastUpdatedAts[key] || null;
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
