import { useState } from 'react';
import { getHistory, restoreSnapshot } from '../utils/versionHistory.js';

function VersionHistoryPanel({ currentTemplates, onRestore, onClose }) {
  const [history, setHistory] = useState(() => getHistory());
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getTemplateCount = (snapshot) => {
    return snapshot.templates?.length || 0;
  };

  const getProgressCount = (snapshot) => {
    if (!snapshot.progress) return 0;
    return Object.keys(snapshot.progress).length;
  };

  const compareWithCurrent = (snapshot) => {
    const currentIds = new Set(currentTemplates.map((t) => t.id));
    const snapshotIds = new Set(snapshot.templates.map((t) => t.id));

    const added = [];
    const removed = [];
    const modified = [];

    snapshot.templates.forEach((t) => {
      if (!currentIds.has(t.id)) {
        added.push(t.name);
      } else {
        const current = currentTemplates.find((ct) => ct.id === t.id);
        if (JSON.stringify(t) !== JSON.stringify(current)) {
          modified.push(t.name);
        }
      }
    });

    currentTemplates.forEach((t) => {
      if (!snapshotIds.has(t.id)) {
        removed.push(t.name);
      }
    });

    return { added, removed, modified };
  };

  const handleRestore = (snapshot) => {
    const restored = restoreSnapshot(snapshot.id);
    if (restored) {
      onRestore(restored.templates, restored.progress, snapshot.description);
      setRestoreConfirm(null);
      onClose();
    }
  };

  const handleRefresh = () => {
    setHistory(getHistory());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📜 版本历史</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="version-history-header">
            <p className="version-history-desc">
              本地保留最近 5 次保存的快照，点击可查看详情并一键回滚。
            </p>
            <button className="btn btn-sm btn-default" onClick={handleRefresh}>
              🔄 刷新
            </button>
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">📭</div>
              <div className="empty-text">暂无历史快照</div>
              <div className="empty-desc">保存数据后会自动生成快照，最多保留 5 份</div>
            </div>
          ) : (
            <div className="history-list">
              {history.map((snapshot, index) => {
                const isSelected = selectedSnapshot?.id === snapshot.id;
                const diff = isSelected ? compareWithCurrent(snapshot) : null;

                return (
                  <div
                    key={snapshot.id}
                    className={`history-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSnapshot(isSelected ? null : snapshot)}
                  >
                    <div className="history-main">
                      <div className="history-version">
                        <span className="version-badge">V{history.length - index}</span>
                        <span className="history-desc">{snapshot.description}</span>
                      </div>
                      <div className="history-meta">
                        <span className="history-date">
                          🕐 {formatDate(snapshot.timestamp)}
                        </span>
                        <span className="history-stats">
                          📋 {getTemplateCount(snapshot)} 个任务 ·
                          👤 {getProgressCount(snapshot)} 名员工
                        </span>
                      </div>
                    </div>
                    {isSelected && diff && (
                      <div className="history-diff">
                        <div className="diff-section">
                          <div className="diff-label">与当前版本对比：</div>
                          {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 ? (
                            <div className="diff-none">✓ 与当前版本完全一致</div>
                          ) : (
                            <div className="diff-summary">
                              {diff.added.length > 0 && (
                                <span className="diff-added">
                                  + 新增 {diff.added.length} 项：{diff.added.join('、')}
                                </span>
                              )}
                              {diff.removed.length > 0 && (
                                <span className="diff-deleted">
                                  - 删除 {diff.removed.length} 项：{diff.removed.join('、')}
                                </span>
                              )}
                              {diff.modified.length > 0 && (
                                <span className="diff-modified">
                                  ~ 修改 {diff.modified.length} 项：{diff.modified.join('、')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {restoreConfirm === snapshot.id ? (
                          <div className="restore-confirm">
                            <span>确定要回滚到此版本吗？当前数据将被覆盖。</span>
                            <div className="restore-actions">
                              <button
                                className="btn btn-sm btn-default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRestoreConfirm(null);
                                }}
                              >
                                取消
                              </button>
                              <button
                                className="btn btn-sm btn-danger-solid"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(snapshot);
                                }}
                              >
                                确认回滚
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-primary history-restore-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRestoreConfirm(snapshot.id);
                            }}
                          >
                            ↩️ 回滚到此版本
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-default" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryPanel;
