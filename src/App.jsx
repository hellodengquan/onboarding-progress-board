import { useState, useEffect, useCallback } from 'react';
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

const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const clearStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

function App() {
  const [activeTab, setActiveTab] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, 'board')
  );
  const [taskTemplates, setTaskTemplates] = useState(() =>
    loadFromStorage(STORAGE_KEYS.TEMPLATES, initialTaskTemplates)
  );
  const [employees] = useState(initialEmployees);
  const [progress, setProgress] = useState(() =>
    loadFromStorage(STORAGE_KEYS.PROGRESS, initialProgress)
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TEMPLATES, taskTemplates);
  }, [taskTemplates]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROGRESS, progress);
  }, [progress]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleAddTemplate = (template) => {
    setTaskTemplates([...taskTemplates, template]);
  };

  const handleUpdateTemplate = (updatedTemplate) => {
    setTaskTemplates(
      taskTemplates.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
    );
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('确定要删除该任务模板吗？')) {
      setTaskTemplates(taskTemplates.filter((t) => t.id !== templateId));
      const newProgress = { ...progress };
      Object.keys(newProgress).forEach((empId) => {
        delete newProgress[empId][templateId];
      });
      setProgress(newProgress);
    }
  };

  const handleUpdateProgress = (employeeId, taskId, progressData) => {
    setProgress((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [taskId]: progressData
      }
    }));
  };

  const handleClearData = () => {
    clearStorage();
    setTaskTemplates(initialTaskTemplates);
    setProgress(initialProgress);
    setActiveTab('board');
    setShowClearConfirm(false);
  };

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
