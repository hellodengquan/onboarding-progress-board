const VERSION_HISTORY_KEY = 'onboarding_version_history';
const MAX_HISTORY = 5;

const loadHistory = () => {
  try {
    const stored = localStorage.getItem(VERSION_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[VersionHistory] 读取历史失败:', e);
  }
  return [];
};

const saveHistory = (history) => {
  try {
    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('[VersionHistory] 保存历史失败:', e);
  }
};

export const saveSnapshot = (templates, progress, description = '') => {
  const history = loadHistory();
  const snapshot = {
    id: `snap_${Date.now()}`,
    timestamp: Date.now(),
    templates: JSON.parse(JSON.stringify(templates)),
    progress: JSON.parse(JSON.stringify(progress)),
    description: description || `保存于 ${new Date().toLocaleString('zh-CN')}`
  };
  history.unshift(snapshot);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  saveHistory(history);
  return snapshot;
};

export const getHistory = () => {
  return loadHistory();
};

export const getSnapshotById = (snapshotId) => {
  const history = loadHistory();
  return history.find((s) => s.id === snapshotId) || null;
};

export const restoreSnapshot = (snapshotId) => {
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) {
    return null;
  }
  return {
    templates: JSON.parse(JSON.stringify(snapshot.templates)),
    progress: JSON.parse(JSON.stringify(snapshot.progress))
  };
};

export const clearHistory = () => {
  localStorage.removeItem(VERSION_HISTORY_KEY);
};

export const deleteSnapshot = (snapshotId) => {
  const history = loadHistory();
  const filtered = history.filter((s) => s.id !== snapshotId);
  saveHistory(filtered);
  return filtered;
};
