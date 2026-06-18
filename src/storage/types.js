export const STORAGE_BACKEND = {
  LOCAL: 'local',
  RESTFUL: 'restful'
};

export const STORAGE_LABEL = {
  [STORAGE_BACKEND.LOCAL]: '本地存储 (localStorage)',
  [STORAGE_BACKEND.RESTFUL]: '远程服务器 (REST API)'
};

export const STORAGE_KEYS = {
  TEMPLATES: 'onboarding_templates',
  PROGRESS: 'onboarding_progress',
  ACTIVE_TAB: 'onboarding_active_tab',
  BACKEND: 'onboarding_backend_type',
  API_CONFIG: 'onboarding_api_config'
};

export const DEFAULT_API_CONFIG = {
  baseUrl: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};
