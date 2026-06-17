import { useState } from 'react';
import { TASK_STATUS, TASK_STATUS_LABEL } from '../data/mockData';

function ProgressBoard({ employees, templates, progress, onUpdateProgress }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || null);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ status: TASK_STATUS.NOT_STARTED, note: '' });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const sortedTemplates = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredEmployees = employees.filter((emp) => {
    if (searchKeyword && !emp.name.includes(searchKeyword) && !emp.department.includes(searchKeyword)) {
      return false;
    }
    if (statusFilter !== 'all') {
      const empProgress = progress[emp.id] || {};
      const hasStatus = sortedTemplates.some((t) => {
        const p = empProgress[t.id];
        return p && p.status === statusFilter;
      });
      if (!hasStatus) return false;
    }
    return true;
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedProgress = selectedEmployeeId ? progress[selectedEmployeeId] || {} : {};

  const calculateCompletionRate = (empId) => {
    const empProgress = progress[empId] || {};
    const completed = sortedTemplates.filter(
      (t) => empProgress[t.id]?.status === TASK_STATUS.COMPLETED
    ).length;
    return Math.round((completed / sortedTemplates.length) * 100);
  };

  const getBlockedCount = (empId) => {
    const empProgress = progress[empId] || {};
    return sortedTemplates.filter(
      (t) => empProgress[t.id]?.status === TASK_STATUS.BLOCKED
    ).length;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return 'status-completed';
      case TASK_STATUS.IN_PROGRESS:
        return 'status-in-progress';
      case TASK_STATUS.BLOCKED:
        return 'status-blocked';
      default:
        return 'status-not-started';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return 'badge-completed';
      case TASK_STATUS.IN_PROGRESS:
        return 'badge-in-progress';
      case TASK_STATUS.BLOCKED:
        return 'badge-blocked';
      default:
        return 'badge-not-started';
    }
  };

  const openStatusModal = (templateId) => {
    const current = selectedProgress[templateId] || { status: TASK_STATUS.NOT_STARTED, note: '' };
    setEditingTask(templateId);
    setEditForm({ status: current.status, note: current.note || '' });
  };

  const handleStatusUpdate = (e) => {
    e.preventDefault();
    if (!editingTask || !selectedEmployeeId) return;

    const completedDate =
      editForm.status === TASK_STATUS.COMPLETED
        ? new Date().toISOString().split('T')[0]
        : null;

    onUpdateProgress(selectedEmployeeId, editingTask, {
      status: editForm.status,
      completedDate,
      note: editForm.note
    });
    setEditingTask(null);
  };

  const totalBlocked = employees.reduce((sum, emp) => sum + getBlockedCount(emp.id), 0);
  const avgCompletionRate =
    employees.length > 0
      ? Math.round(
          employees.reduce((sum, emp) => sum + calculateCompletionRate(emp.id), 0) /
            employees.length
        )
      : 0;

  return (
    <div className="progress-board">
      <div className="page-header">
        <div>
          <h2>入职进度看板</h2>
          <p className="page-desc">查看各新员工入职任务完成情况</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{employees.length}</div>
          <div className="stat-label">新员工总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgCompletionRate}%</div>
          <div className="stat-label">平均完成率</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{totalBlocked}</div>
          <div className="stat-label">受阻任务数</div>
        </div>
      </div>

      <div className="board-layout">
        <div className="employee-panel">
          <div className="panel-header">
            <h3>新员工列表</h3>
          </div>
          <div className="filter-bar">
            <input
              type="text"
              placeholder="搜索姓名或部门..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-sm"
            >
              <option value="all">全部状态</option>
              <option value={TASK_STATUS.BLOCKED}>有受阻</option>
              <option value={TASK_STATUS.IN_PROGRESS}>有进行中</option>
              <option value={TASK_STATUS.COMPLETED}>有已完成</option>
            </select>
          </div>
          <div className="employee-list">
            {filteredEmployees.map((emp) => {
              const completionRate = calculateCompletionRate(emp.id);
              const blockedCount = getBlockedCount(emp.id);
              const isSelected = emp.id === selectedEmployeeId;

              return (
                <div
                  key={emp.id}
                  className={`employee-card ${isSelected ? 'selected' : ''} ${
                    blockedCount > 0 ? 'has-blocked' : ''
                  }`}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                >
                  <div className="employee-info">
                    <div className="avatar">{emp.avatar}</div>
                    <div className="employee-meta">
                      <div className="employee-name">
                        {emp.name}
                        {blockedCount > 0 && (
                          <span className="blocked-indicator" title={`${blockedCount}个受阻任务`}>
                            ⚠ {blockedCount}
                          </span>
                        )}
                      </div>
                      <div className="employee-position">{emp.position}</div>
                      <div className="employee-dept">{emp.department}</div>
                    </div>
                  </div>
                  <div className="progress-mini">
                    <div className="progress-bar-mini">
                      <div
                        className="progress-fill-mini"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="progress-text-mini">{completionRate}%</div>
                  </div>
                </div>
              );
            })}
            {filteredEmployees.length === 0 && (
              <div className="empty-state">暂无匹配的员工</div>
            )}
          </div>
        </div>

        <div className="detail-panel">
          {selectedEmployee ? (
            <>
              <div className="panel-header detail-header">
                <div className="detail-title">
                  <div className="avatar avatar-lg">{selectedEmployee.avatar}</div>
                  <div>
                    <h3>{selectedEmployee.name}</h3>
                    <div className="detail-subtitle">
                      {selectedEmployee.position} · {selectedEmployee.department} · 入职日期：
                      {selectedEmployee.hireDate}
                    </div>
                  </div>
                </div>
                <div className="completion-rate">
                  <div className="rate-value">{calculateCompletionRate(selectedEmployee.id)}%</div>
                  <div className="rate-label">完成率</div>
                </div>
              </div>

              <div className="task-list">
                {sortedTemplates.map((template, index) => {
                  const taskProgress = selectedProgress[template.id] || {
                    status: TASK_STATUS.NOT_STARTED,
                    note: ''
                  };
                  const isBlocked = taskProgress.status === TASK_STATUS.BLOCKED;

                  return (
                    <div
                      key={template.id}
                      className={`task-item ${getStatusStyle(taskProgress.status)} ${
                        isBlocked ? 'task-blocked-highlight' : ''
                      }`}
                      onClick={() => openStatusModal(template.id)}
                    >
                      <div className="task-step">{String(index + 1).padStart(2, '0')}</div>
                      <div className="task-content">
                        <div className="task-header-row">
                          <div className="task-name">{template.name}</div>
                          <span className={`badge ${getStatusBadge(taskProgress.status)}`}>
                            {TASK_STATUS_LABEL[taskProgress.status]}
                          </span>
                        </div>
                        <div className="task-desc">{template.description}</div>
                        <div className="task-meta">
                          <span className="task-category">{template.category}</span>
                          <span className="task-days">预计 {template.estimatedDays} 天</span>
                          {taskProgress.completedDate && (
                            <span className="task-date">
                              完成于 {taskProgress.completedDate}
                            </span>
                          )}
                        </div>
                        {isBlocked && taskProgress.note && (
                          <div className="blocked-note">
                            <span className="blocked-icon">⚠</span>
                            <span>{taskProgress.note}</span>
                          </div>
                        )}
                        {!isBlocked && taskProgress.note && taskProgress.status !== TASK_STATUS.NOT_STARTED && (
                          <div className="task-note">备注：{taskProgress.note}</div>
                        )}
                      </div>
                      <div className="task-arrow">›</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state detail-empty">请选择左侧的员工查看详情</div>
          )}
        </div>
      </div>

      {editingTask && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>更新任务状态</h3>
              <button className="btn-close" onClick={() => setEditingTask(null)}>
                ×
              </button>
            </div>
            <form onSubmit={handleStatusUpdate}>
              <div className="modal-body">
                <div className="task-preview">
                  <div className="preview-name">
                    {sortedTemplates.find((t) => t.id === editingTask)?.name}
                  </div>
                  <div className="preview-desc">
                    {sortedTemplates.find((t) => t.id === editingTask)?.description}
                  </div>
                </div>
                <div className="form-group">
                  <label>任务状态</label>
                  <div className="status-options">
                    {Object.entries(TASK_STATUS).map(([, value]) => (
                      <label
                        key={value}
                        className={`status-option ${editForm.status === value ? 'selected' : ''} ${getStatusBadge(value)}`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={value}
                          checked={editForm.status === value}
                          onChange={(e) =>
                            setEditForm({ ...editForm, status: e.target.value })
                          }
                          style={{ display: 'none' }}
                        />
                        {TASK_STATUS_LABEL[value]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>备注说明 {editForm.status === TASK_STATUS.BLOCKED && ' *'}</label>
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder={
                      editForm.status === TASK_STATUS.BLOCKED
                        ? '请说明受阻原因...'
                        : '可选，添加任务备注'
                    }
                    rows="3"
                    required={editForm.status === TASK_STATUS.BLOCKED}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => setEditingTask(null)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressBoard;
