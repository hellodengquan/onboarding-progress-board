import { useState, useEffect, useCallback, useRef } from 'react';
import TaskTemplateManager from './components/TaskTemplateManager';
import ProgressBoard from './components/ProgressBoard';
import TemplateUploader from './components/TemplateUploader';
import SettingsPanel from './components/SettingsPanel';
import ConflictResolutionDialog from './components/ConflictResolutionDialog';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import { StorageFactory, STORAGE_BACKEND, STORAGE_LABEL } from './storage';
import { saveSnapshot, clearHistory } from './utils/versionHistory.js';
import {
  initialEmployees,
  initialProgress,
  initialTaskTemplates,
  loadDefaultTemplates,
  TASK_STATUS
} from './data/mockData';
import './App.css';

function App() {
  const storageFactoryRef = useRef(null);
  const pendingConflictRef = useRef(null);
  const saveInProgressRef = useRef({ templates: false, progress: false });

  const [notification, setNotification] = useState(null);
  const [corruptedAlert, setCorruptedAlert] = useState(null);
  const [syncNotification, setSyncNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLocalChange = useRef({
    templates: false,
    progress: false,
    tab: false
  });

  const [activeTab, setActiveTab] = useState('board');
  const [taskTemplates, setTaskTemplates] = useState(initialTaskTemplates);
  const [employees] = useState(initialEmployees);
  const [progress, setProgress] = useState(initialProgress);
  const [currentBackend, setCurrentBackend] = useState(STORAGE_BACKEND.LOCAL);
  const [apiConfig, setApiConfig] = useState({ baseUrl: '/api', timeout: 10000 });

  const dismissNotification = useCallback((id) => {
    setNotification((prev) => (prev?.id === id ? null : prev));
  }, []);

  const dismissCorruptedAlert = useCallback(() => {
    setCorruptedAlert(null);
  }, []);

  const dismissSyncNotification = useCallback(() => {
    setSyncNotification(null);
  }, []);

  const handleSaveError = useCallback((key, errorInfo) => {
    setNotification({
      id: Date.now(),
      type: 'error',
      title: '数据保存失败',
      message: errorInfo.message,
      detail: errorInfo.dataLabel ? `失败数据：${errorInfo.dataLabel}` : null,
      persistent: errorInfo.type === 'quota' || errorInfo.type === 'disabled' ||
                  errorInfo.type === 'network' || errorInfo.type === 'timeout'
    });
  }, []);

  const handleCorrupted = useCallback((key, label) => {
    setCorruptedAlert({
      key,
      label,
      message: `检测到「${label}」数据已损坏，已自动恢复为默认值。`
    });
  }, []);

  const handleConflict = useCallback(async (key, result) => {
    if (result.conflict && result.conflictInfo && result.resolve) {
      pendingConflictRef.current = { ...result.conflictInfo, resolve: result.resolve };
      setConflictInfo(result.conflictInfo);
    }
  }, []);

  const handleConflictResolve = useCallback(async (resolution, mergedData) => {
    const pending = pendingConflictRef.current;
    if (!pending || !pending.resolve) {
      setConflictInfo(null);
      return;
    }

    try {
      if (resolution === 'accept_server' && pending.serverData) {
        const key = pending.key;
        if (key === 'onboarding_templates') {
          isLocalChange.current.templates = false;
          setTaskTemplates(pending.serverData);
        } else if (key === 'onboarding_progress') {
          isLocalChange.current.progress = false;
          setProgress(pending.serverData);
        }
        setNotification({
          id: Date.now(),
          type: 'info',
          title: '已接受服务器版本',
          message: '已放弃您的修改，数据已更新为服务器最新版本',
          persistent: false
        });
      } else {
        const result = await pending.resolve(resolution, mergedData);
        if (result.success) {
          setNotification({
            id: Date.now(),
            type: 'info',
            title: resolution === 'merge' ? '合并成功' : '保存成功',
            message: resolution === 'merge'
              ? '已智能合并两个版本的内容'
              : '已用您的版本覆盖服务器数据',
            persistent: false
          });
        } else if (!result.cancelled) {
          setNotification({
            id: Date.now(),
            type: 'error',
            title: '保存失败',
            message: result.error?.message || '处理冲突时发生错误',
            persistent: false
          });
        }
      }
    } catch (error) {
      console.error('[Conflict] 处理冲突失败:', error);
      setNotification({
        id: Date.now(),
        type: 'error',
        title: '处理冲突失败',
        message: error.message || '请尝试刷新页面后重新操作',
        persistent: false
      });
    } finally {
      pendingConflictRef.current = null;
      setConflictInfo(null);
    }
  }, []);

  const handleConflictCancel = useCallback(() => {
    pendingConflictRef.current = null;
    setConflictInfo(null);
  }, []);

  useEffect(() => {
    const factory = new StorageFactory(handleSaveError, handleCorrupted, handleConflict);
    storageFactoryRef.current = factory;
    const initialBackend = factory.getBackend();
    const initialApiConfig = factory.getApiConfig();

    const initData = async () => {
      try {
        setCurrentBackend(initialBackend);
        setApiConfig(initialApiConfig);
        const repo = factory.getRepository();

        const tabResult = await repo.load('onboarding_active_tab', 'board');
        if (!tabResult.error) {
          setActiveTab(tabResult.value);
        }

        const templatesResult = await repo.load('onboarding_templates', null);
        if (templatesResult.fromStorage && templatesResult.value) {
          setTaskTemplates(templatesResult.value);
        } else if (!templatesResult.fromStorage) {
          const defaultTemplates = await loadDefaultTemplates();
          setTaskTemplates(defaultTemplates);
          isLocalChange.current.templates = true;
        } else {
          setTaskTemplates(templatesResult.value);
        }

        const progressResult = await repo.load('onboarding_progress', initialProgress);
        setProgress(progressResult.value);

        if (repo.subscribe) {
          repo.subscribe((key, newValue) => {
            try {
              if (key === 'onboarding_templates') {
                const parsed = newValue ? JSON.parse(newValue) : initialTaskTemplates;
                isLocalChange.current.templates = false;
                setTaskTemplates(parsed);
                setSyncNotification({
                  id: Date.now(),
                  message: '任务模板已在其他标签页更新，当前页面已自动同步'
                });
              } else if (key === 'onboarding_progress') {
                const parsed = newValue ? JSON.parse(newValue) : initialProgress;
                isLocalChange.current.progress = false;
                setProgress(parsed);
                setSyncNotification({
                  id: Date.now(),
                  message: '员工进度已在其他标签页更新，当前页面已自动同步'
                });
              } else if (key === 'onboarding_active_tab') {
                isLocalChange.current.tab = false;
                setActiveTab(newValue || 'board');
              }
            } catch (e) {
              console.error('[Sync] 同步解析失败:', e);
            }
          });
        }
      } catch (error) {
        console.error('[Init] 初始化数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initData();

    return () => {
      if (storageFactoryRef.current) {
        storageFactoryRef.current.destroy();
      }
    };
  }, [handleSaveError, handleCorrupted, handleConflict]);

  const saveWithSnapshot = useCallback(async (key, value, description) => {
    const repo = storageFactoryRef.current?.getRepository();
    if (!repo) return { success: false };

    const result = await repo.save(key, value);

    if (result.success) {
      if (key === 'onboarding_templates' || key === 'onboarding_progress') {
        const templates = key === 'onboarding_templates' ? value : taskTemplates;
        const progressData = key === 'onboarding_progress' ? value : progress;
        saveSnapshot(templates, progressData, description);
      }
    } else if (result.conflict) {
      handleConflict(key, result);
    }

    return result;
  }, [taskTemplates, progress, handleConflict]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLocalChange.current.templates) return;
    if (saveInProgressRef.current.templates) return;

    saveInProgressRef.current.templates = true;
    isLocalChange.current.templates = false;

    saveWithSnapshot('onboarding_templates', taskTemplates, '修改了任务模板')
      .finally(() => {
        saveInProgressRef.current.templates = false;
      });
  }, [taskTemplates, isLoading, saveWithSnapshot]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLocalChange.current.progress) return;
    if (saveInProgressRef.current.progress) return;

    saveInProgressRef.current.progress = true;
    isLocalChange.current.progress = false;

    saveWithSnapshot('onboarding_progress', progress, '更新了员工进度')
      .finally(() => {
        saveInProgressRef.current.progress = false;
      });
  }, [progress, isLoading, saveWithSnapshot]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLocalChange.current.tab) return;
    isLocalChange.current.tab = false;
    const repo = storageFactoryRef.current?.getRepository();
    if (repo) {
      repo.save('onboarding_active_tab', activeTab);
    }
  }, [activeTab, isLoading]);

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

  const handleUploadTemplates = useCallback((newTemplates) => {
    isLocalChange.current.templates = true;
    setTaskTemplates(newTemplates);
    setNotification({
      id: Date.now(),
      type: 'info',
      title: '模板导入成功',
      message: `已成功导入 ${newTemplates.length} 个任务模板`,
      persistent: false
    });
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

  const handleRestoreFromSnapshot = useCallback((templates, prog, description) => {
    isLocalChange.current.templates = true;
    isLocalChange.current.progress = true;
    setTaskTemplates(templates);
    setProgress(prog);
    saveSnapshot(templates, prog, `回滚到：${description}`);
    setNotification({
      id: Date.now(),
      type: 'info',
      title: '回滚成功',
      message: `已恢复到历史版本：${description}`,
      persistent: false
    });
  }, []);

  const handleSwitchBackend = useCallback(async (backend, newApiConfig) => {
    const factory = storageFactoryRef.current;
    if (!factory) return;

    try {
      const oldRepo = factory.getRepository();
      const [templatesSnapshot, progressSnapshot, tabSnapshot] = await Promise.all([
        oldRepo.load('onboarding_templates', taskTemplates),
        oldRepo.load('onboarding_progress', progress),
        oldRepo.load('onboarding_active_tab', activeTab)
      ]);

      await factory.switchBackend(backend, newApiConfig);
      setCurrentBackend(backend);
      if (newApiConfig) {
        setApiConfig(factory.getApiConfig());
      }

      const newRepo = factory.getRepository();
      isLocalChange.current.templates = true;
      isLocalChange.current.progress = true;
      isLocalChange.current.tab = true;

      await Promise.all([
        newRepo.save('onboarding_templates', templatesSnapshot.value),
        newRepo.save('onboarding_progress', progressSnapshot.value),
        newRepo.save('onboarding_active_tab', tabSnapshot.value)
      ]);

      setNotification({
        id: Date.now(),
        type: 'info',
        title: '存储切换成功',
        message: `已切换到${STORAGE_LABEL[backend]}，数据已自动同步`,
        persistent: false
      });
    } catch (error) {
      console.error('[SwitchBackend] 切换存储后端失败:', error);
      setNotification({
        id: Date.now(),
        type: 'error',
        title: '存储切换失败',
        message: error.message || '切换存储后端时发生错误，请稍后重试',
        persistent: false
      });
    }
  }, [taskTemplates, progress, activeTab]);

  const handleClearData = useCallback(async () => {
    const factory = storageFactoryRef.current;
    isLocalChange.current.templates = true;
    isLocalChange.current.progress = true;
    isLocalChange.current.tab = true;

    if (factory) {
      const repo = factory.getRepository();
      await repo.clearAll();
    }

    clearHistory();

    const defaultTemplates = await loadDefaultTemplates();
    setTaskTemplates(defaultTemplates);
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

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <div className="loading-text">正在加载数据...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'error' ? '⚠️' : notification.type === 'info' ? 'ℹ️' : '✅'}
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
            <div className="storage-indicator" title={`当前存储方式：${STORAGE_LABEL[currentBackend]}`}>
              <span className="storage-icon">{currentBackend === STORAGE_BACKEND.LOCAL ? '💻' : '☁️'}</span>
              <span className="storage-label">{STORAGE_LABEL[currentBackend]}</span>
            </div>
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
              className="btn btn-sm btn-default"
              onClick={() => setShowVersionHistory(true)}
              title="查看版本历史"
            >
              📜 历史版本
            </button>
            <button
              className="btn btn-sm btn-default"
              onClick={() => setShowSettings(true)}
              title="系统设置"
            >
              ⚙️ 设置
            </button>
            <button
              className={`btn btn-sm ${hasCustomData ? 'btn-danger-outline' : 'btn-default'}`}
              onClick={() => setShowClearConfirm(true)}
              title="重置所有数据到初始状态"
            >
              🔄 重置数据
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
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <TemplateUploader
                onUpload={handleUploadTemplates}
                currentTemplates={taskTemplates}
              />
            </div>
            <TaskTemplateManager
              templates={taskTemplates}
              onAddTemplate={handleAddTemplate}
              onUpdateTemplate={handleUpdateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 HR 入职管理系统 · 为新员工提供更好的入职体验</p>
      </footer>

      {showSettings && (
        <SettingsPanel
          currentBackend={currentBackend}
          apiConfig={apiConfig}
          onSwitchBackend={handleSwitchBackend}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryPanel
          currentTemplates={taskTemplates}
          currentProgress={progress}
          onRestore={handleRestoreFromSnapshot}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {conflictInfo && (
        <ConflictResolutionDialog
          conflictInfo={conflictInfo}
          onResolve={handleConflictResolve}
          onClose={handleConflictCancel}
        />
      )}

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
                    此操作将清空所有自定义的任务模板、员工进度数据和版本历史，恢复到系统初始状态。此操作不可撤销。
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
