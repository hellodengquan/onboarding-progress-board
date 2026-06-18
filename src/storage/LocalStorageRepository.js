import { STORAGE_KEYS } from './types.js';

const getStorageErrorInfo = (error) => {
  if (error.name === 'QuotaExceededError' || error.code === 22) {
    return {
      type: 'quota',
      message: '浏览器存储空间已满，无法保存您的修改。请清理浏览器缓存或使用「重置数据」功能减少数据量后再试。'
    };
  }
  if (error.name === 'SecurityError' || error.name === 'NotAllowedError') {
    return {
      type: 'disabled',
      message: '浏览器已禁用本地存储功能，数据无法保存。请在浏览器设置中启用 Cookie 和网站数据权限后刷新页面。'
    };
  }
  return {
    type: 'unknown',
    message: `保存数据时发生错误：${error.message || '未知错误'}。请尝试刷新页面后重新操作。`
  };
};

const STORAGE_LABELS = {
  [STORAGE_KEYS.TEMPLATES]: '任务模板',
  [STORAGE_KEYS.PROGRESS]: '员工进度',
  [STORAGE_KEYS.ACTIVE_TAB]: '页面状态',
  [STORAGE_KEYS.BACKEND]: '存储配置',
  [STORAGE_KEYS.API_CONFIG]: 'API 配置'
};

export class LocalStorageRepository {
  constructor(onSaveError, onCorrupted) {
    this.onSaveError = onSaveError || (() => {});
    this.onCorrupted = onCorrupted || (() => {});
    this._storageListeners = new Set();
    this._handleStorageEvent = this._handleStorageEvent.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this._handleStorageEvent);
    }
  }

  _handleStorageEvent(e) {
    if (!Object.values(STORAGE_KEYS).includes(e.key)) return;
    if (e.storageArea !== localStorage) return;

    this._storageListeners.forEach((listener) => {
      try {
        listener(e.key, e.newValue, e.oldValue);
      } catch (err) {
        console.error('[LocalStorage] Storage listener error:', err);
      }
    });
  }

  subscribe(listener) {
    this._storageListeners.add(listener);
    return () => this._storageListeners.delete(listener);
  }

  async load(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        return { value: defaultValue, fromStorage: false, corrupted: false };
      }
      try {
        const parsed = JSON.parse(stored);
        return { value: parsed, fromStorage: true, corrupted: false };
      } catch (parseError) {
        console.warn(`[LocalStorage] ${key} 数据损坏，已自动清理并恢复默认值:`, parseError);
        localStorage.removeItem(key);
        this.onCorrupted(key, STORAGE_LABELS[key] || key, parseError);
        return { value: defaultValue, fromStorage: false, corrupted: true };
      }
    } catch (readError) {
      console.error(`[LocalStorage] 读取 ${key} 失败:`, readError);
      return { value: defaultValue, fromStorage: false, corrupted: false, error: readError };
    }
  }

  async save(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      console.error(`[LocalStorage] 保存 ${key} 失败:`, error);
      const errorInfo = getStorageErrorInfo(error);
      errorInfo.dataLabel = STORAGE_LABELS[key] || key;
      this.onSaveError(key, errorInfo);
      return { success: false, error: errorInfo };
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error(`[LocalStorage] 删除 ${key} 失败:`, error);
      return { success: false, error };
    }
  }

  async clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this._handleStorageEvent);
    }
    this._storageListeners.clear();
  }
}
