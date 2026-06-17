import { useState } from 'react';
import TaskTemplateManager from './components/TaskTemplateManager';
import ProgressBoard from './components/ProgressBoard';
import {
  initialTaskTemplates,
  initialEmployees,
  initialProgress,
  TASK_STATUS
} from './data/mockData';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [taskTemplates, setTaskTemplates] = useState(initialTaskTemplates);
  const [employees] = useState(initialEmployees);
  const [progress, setProgress] = useState(initialProgress);

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

  const blockedCount = employees.reduce((sum, emp) => {
    const empProgress = progress[emp.id] || {};
    return (
      sum +
      taskTemplates.filter(
        (t) => empProgress[t.id]?.status === TASK_STATUS.BLOCKED
      ).length
    );
  }, 0);

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
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'board' ? 'active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              <span className="tab-icon">📊</span>
              进度看板
              {blockedCount > 0 && (
                <span className="tab-badge">{blockedCount}</span>
              )}
            </button>
            <button
              className={`nav-tab ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <span className="tab-icon">📝</span>
              任务模板
            </button>
          </nav>
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
    </div>
  );
}

export default App;
