import { STORAGE_BACKEND, STORAGE_KEYS, DEFAULT_API_CONFIG } from './types.js';
import { LocalStorageRepository } from './LocalStorageRepository.js';
import { RestfulRepository } from './RestfulRepository.js';

const readBackendTypeFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BACKEND);
    if (stored && (stored === STORAGE_BACKEND.LOCAL || stored === STORAGE_BACKEND.RESTFUL)) {
      return stored;
    }
  } catch {
    // ignore
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envBackend = import.meta.env.VITE_STORAGE_BACKEND;
    if (envBackend === STORAGE_BACKEND.RESTFUL || envBackend === STORAGE_BACKEND.LOCAL) {
      return envBackend;
    }
  }
  return STORAGE_BACKEND.LOCAL;
};

const readApiConfigFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_API_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
      return { ...DEFAULT_API_CONFIG, baseUrl: envUrl };
    }
  }
  return { ...DEFAULT_API_CONFIG };
};

export class StorageFactory {
  constructor(onSaveError, onCorrupted, onConflict) {
    this.onSaveError = onSaveError || (() => {});
    this.onCorrupted = onCorrupted || (() => {});
    this.onConflict = onConflict || (() => {});
    this.currentBackend = readBackendTypeFromStorage();
    this.apiConfig = readApiConfigFromStorage();
    this.repository = this._createRepository();
  }

  _createRepository() {
    if (this.currentBackend === STORAGE_BACKEND.RESTFUL) {
      return new RestfulRepository(this.apiConfig, this.onSaveError, this.onConflict);
    }
    return new LocalStorageRepository(this.onSaveError, this.onCorrupted);
  }

  getRepository() {
    return this.repository;
  }

  getBackend() {
    return this.currentBackend;
  }

  getApiConfig() {
    return { ...this.apiConfig };
  }

  async switchBackend(backend, apiConfig = null) {
    if (backend !== STORAGE_BACKEND.LOCAL && backend !== STORAGE_BACKEND.RESTFUL) {
      throw new Error(`Invalid backend type: ${backend}`);
    }

    if (apiConfig) {
      this.apiConfig = { ...this.apiConfig, ...apiConfig };
      try {
        localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(this.apiConfig));
      } catch {
        // ignore
      }
    }

    try {
      localStorage.setItem(STORAGE_KEYS.BACKEND, backend);
    } catch {
      // ignore
    }

    if (this.repository && this.repository.destroy) {
      this.repository.destroy();
    }

    this.currentBackend = backend;
    this.repository = this._createRepository();

    return this.repository;
  }

  updateApiConfig(config) {
    this.apiConfig = { ...this.apiConfig, ...config };
    try {
      localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(this.apiConfig));
    } catch {
      // ignore
    }
    if (this.currentBackend === STORAGE_BACKEND.RESTFUL && this.repository.updateConfig) {
      this.repository.updateConfig(this.apiConfig);
    }
  }

  destroy() {
    if (this.repository && this.repository.destroy) {
      this.repository.destroy();
    }
  }
}
