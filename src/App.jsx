import { useState, useEffect, useCallback, useRef } from 'react';
import TaskTemplateManager from './components/TaskTemplateManager';
import ProgressBoard from './components/ProgressBoard';
import {
  initialTaskTemplates,
  initialEmployees,
  initialProgress,
  TASK_STATUS
} from './data/mockData';
import './App.css';

const STORAGE_KEYS = {
  TEMPLATES: 'onboarding_templates',
  PROGRESS: 'onboarding_progress',
  ACTIVE_TAB: 'onboarding_active_tab'
};



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

const loadFromStorage = (key, defaultValue, onCorrupted) => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return { value: defaultValue, fromStorage: false };
    }
    try {
      const parsed = JSON.parse(stored);
      return { value: parsed, fromStorage: true };
    } catch (parseError) {
      console.warn(`[Storage] ${key} 数据损坏，已自动清理并恢复默认值:`, parseError);
      localStorage.removeItem(key);
      if (onCorrupted) {
        onCorrupted(key, parseError);
      }
      return { value: defaultValue, fromStorage: false, corrupted: true };
    }
  } catch (readError) {
    console.error(`[Storage] 读取 ${key} 失败:`, readError);
    return { value: defaultValue, fromStorage: false, error: readError };
  }
};

const saveToStorage = (key, value, onError) => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return { success: true };
  } catch (error) {
    console.error(`[Storage] 保存 ${key} 失败:`, error);
    const errorInfo = getStorageErrorInfo(error);
    if (onError) {
      onError(key, errorInfo);
    }
    return { success: false, error: errorInfo };
  }
};

const clearStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

const STORAGE_LABELS = {
  [STORAGE_KEYS.TEMPLATES]: '任务模板',
  [STORAGE_KEYS.PROGRESS]: '员工进度',
  [STORAGE_KEYS.ACTIVE_TAB]: '页面状态'
};

function App() {
  const [notification, setNotification] = useState(null);
  const [corruptedAlert, setCorruptedAlert] = useState(null);
  const [syncNotification, setSyncNotification] = useState(null);

  const isLocalChange = useRef({
    templates: false,
    progress: false,
    tab: false
  });

  const handleCorrupted = useCallback((key) => {
    setCorruptedAlert({
      key,
      label: STORAGE_LABELS[key] || key,
      message: `检测到「${STORAGE_LABELS[key] || key}」数据已损坏，已自动恢复为默认值。`
    });
  }, []);

  const handleSaveError = useCallback((key, errorInfo) => {
    setNotification({
      id: Date.now(),
      type: 'error',
      title: '数据保存失败',
      message: errorInfo.message,
      detail: `失败数据：${STORAGE_LABELS[key] || key}`,
      persistent: errorInfo.type === 'quota' || errorInfo.type === 'disabled'
    });
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotification((prev) => (prev?.id === id ? null : prev));
  }, []);

  const dismissCorruptedAlert = useCallback(() => {
    setCorruptedAlert(null);
  }, []);

  const dismissSyncNotification = useCallback(() => {
    setSyncNotification(null);
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const result = loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, 'board', handleCorrupted);
    return result.value;
  });

  const [taskTemplates, setTaskTemplates] = useState(() => {
    const result = loadFromStorage(STORAGE_KEYS.TEMPLATES, initialTaskTemplates, handleCorrupted);
    return result.value;
  });

  const [employees] = useState(initialEmployees);

  const [progress, setProgress] = useState(() => {
    const result = loadFromStorage(STORAGE_KEYS.PROGRESS, initialProgress, handleCorrupted);
    return result.value;
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!isLocalChange.current.templates) return;
    isLocalChange.current.templates = false;
    saveToStorage(STORAGE_KEYS.TEMPLATES, taskTemplates, handleSaveError);
  }, [taskTemplates, handleSaveError]);

  useEffect(() => {
    if (!isLocalChange.current.progress) return;
    isLocalChange.current.progress = false;
    saveToStorage(STORAGE_KEYS.PROGRESS, progress, handleSaveError);
  }, [progress, handleSaveError]);

  useEffect(() => {
    if (!isLocalChange.current.tab) return;
    isLocalChange.current.tab = false;
    saveToStorage(STORAGE_KEYS.ACTIVE_TAB, activeTab, handleSaveError);
  }, [activeTab, handleSaveError]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!Object.values(STORAGE_KEYS).includes(e.key)) return;
      if (e.storageArea !== localStorage) return;

      try {
        if (e.key === STORAGE_KEYS.TEMPLATES) {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialTaskTemplates;
          isLocalChange.current.templates = false;
          setTaskTemplates(newValue);
          setSyncNotification({
            id: Date.now(),
            message: '任务模板已在其他标签页更新，当前页面已自动同步'
          });
        } else if (e.key === STORAGE_KEYS.PROGRESS) {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialProgress;
          isLocalChange.current.progress = false;
          setProgress(newValue);
          setSyncNotification({
            id: Date.now(),
            message: '员工进度已在其他标签页更新，当前页面已自动同步'
          });
        } else if (e.key === STORAGE_KEYS.ACTIVE_TAB) {
          const newValue = e.newValue || 'board';
          isLocalChange.current.tab = false;
          setActiveTab(newValue);
        }
      } catch (error) {
        console.error('[Sync] 解析同步数据失败:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleTabChange = useCallback((tab) => {
    isLocalChange.current.tab = true;
    setActiveTab(tab);
  }, []);

  const handleAddTemplate = useCallback((template) => {
    isLocalChange.current.templates = true;
    setTaskTemplates((prev) => [...prev, template]);
  }, []);

  const handleUpdateTemplate = useCallback((updatedTemplate) => {
    isLocalChange.current.templates = true;
    setTaskTemplates((prev) =>
      prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
    );
  }, []);

  const handleDeleteTemplate = useCallback((templateId) => {
    if (window.confirm('确定要删除该任务模板吗？')) {
      isLocalChange.current.templates = true;
      isLocalChange.current.progress = true;
      setTaskTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setProgress((prev) => {
        const newProgress = { ...prev };
        Object.keys(newProgress).forEach((empId) => {
          delete newProgress[empId][templateId];
        });
        return newProgress;
      });
    }
  }, []);

  const handleUpdateProgress = useCallback((employeeId, taskId, progressData) => {
    isLocalChange.current.progress = true;
    setProgress((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [taskId]: progressData
      }
    }));
  }, []);

  const handleClearData = useCallback(() => {
    isLocalChange.current.templates = true;
    isLocalChange.current.progress = true;
    isLocalChange.current.tab = true;
    clearStorage();
    setTaskTemplates(initialTaskTemplates);
    setProgress(initialProgress);
    setActiveTab('board');
    setShowClearConfirm(false);
    setNotification(null);
    setCorruptedAlert(null);
    setSyncNotification(null);
  }, []);

  const blockedCount = employees.reduce((sum, emp) => {
    const empProgress = progress[emp.id] || {};
    return (
      sum +
      taskTemplates.filter(
        (t) => empProgress[t.id]?.status === TASK_STATUS.BLOCKED
      ).length
    );
  }, 0);

  const hasCustomData =
    JSON.stringify(taskTemplates) !== JSON.stringify(initialTaskTemplates) ||
    JSON.stringify(progress) !== JSON.stringify(initialProgress);

  return (
    <div className="app">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'error' ? '⚠️' : 'ℹ️'}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
            {notification.detail && (
              <div className="notification-detail">{notification.detail}</div>
            )}
          </div>
          {!notification.persistent && (
            <button
              className="notification-close"
              onClick={() => dismissNotification(notification.id)}
            >
              ×
            </button>
          )}
          {notification.persistent && (
            <div className="notification-persistent">
              <button
                className="btn btn-sm btn-default"
                onClick={() => dismissNotification(notification.id)}
              >
                知道了
              </button>
            </div>
          )}
        </div>
      )}

      {corruptedAlert && (
        <div className="notification notification-warning">
          <div className="notification-icon">⚠️</div>
          <div className="notification-content">
            <div className="notification-title">数据已自动修复</div>
            <div className="notification-message">{corruptedAlert.message}</div>
            <div className="notification-detail">
              若频繁出现此问题，请联系技术支持检查数据完整性。
            </div>
          </div>
          <div className="notification-persistent">
            <button
              className="btn btn-sm btn-primary"
              onClick={dismissCorruptedAlert}
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {syncNotification && (
        <div className="notification notification-info sync-notification">
          <div className="notification-icon">🔄</div>
          <div className="notification-content">
            <div className="notification-message">{syncNotification.message}</div>
          </div>
          <button
            className="notification-close"
            onClick={dismissSyncNotification}
          >
            ×
          </button>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="logo-area">
            <div className="logo-icon">📋</div>
            <div>
              <h1>新员工入职进度看板</h1>
              <p className="header-subtitle">Onboarding Progress Dashboard</p>
            </div>
          </div>
          <div className="header-actions">
            <nav className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'board' ? 'active' : ''}`}
                onClick={() => handleTabChange('board')}
              >
                <span className="tab-icon">📊</span>
                进度看板
                {blockedCount > 0 && (
                  <span className="tab-badge">{blockedCount}</span>
                )}
              </button>
              <button
                className={`nav-tab ${activeTab === 'templates' ? 'active' : ''}`}
                onClick={() => handleTabChange('templates')}
              >
                <span className="tab-icon">📝</span>
                任务模板
              </button>
            </nav>
            <button
              className={`btn btn-sm ${hasCustomData ? 'btn-danger-outline' : 'btn-default'}`}
              onClick={() => setShowClearConfirm(true)}
              title="重置所有数据到初始状态"
            >
              <span>🔄</span>
              重置数据
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'board' && (
          <ProgressBoard
            employees={employees}
            templates={taskTemplates}
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
          />
        )}
        {activeTab === 'templates' && (
          <TaskTemplateManager
            templates={taskTemplates}
            onAddTemplate={handleAddTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 HR 入职管理系统 · 为新员工提供更好的入职体验</p>
      </footer>

      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认重置数据</h3>
              <button className="btn-close" onClick={() => setShowClearConfirm(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-warning">
                <span className="warning-icon">⚠️</span>
                <div>
                  <p className="confirm-title">确定要重置所有数据吗？</p>
                  <p className="confirm-desc">
                    此操作将清空所有自定义的任务模板和员工进度数据，恢复到系统初始状态。此操作不可撤销。
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-default"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </button>
              <button type="button" className="btn btn-danger-solid" onClick={handleClearData}>
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
