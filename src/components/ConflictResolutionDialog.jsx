import { useState, useMemo } from 'react';

function ConflictResolutionDialog({ conflictInfo, onResolve, onClose }) {
  const [resolution, setResolution] = useState('review');

  const formatDate = (dateStr) => {
    if (!dateStr) return '未知';
    try {
      return new Date(dateStr).toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const compareData = useMemo(() => {
    const { localData, serverData, dataLabel } = conflictInfo;

    if (dataLabel === '任务模板' && Array.isArray(localData) && Array.isArray(serverData)) {
      const localMap = new Map(localData.map((t) => [t.id, t]));
      const serverMap = new Map(serverData.map((t) => [t.id, t]));
      const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

      const diffs = [];
      allIds.forEach((id) => {
        const local = localMap.get(id);
        const server = serverMap.get(id);

        if (local && !server) {
          diffs.push({ type: 'added', id, name: local.name, side: 'local' });
        } else if (!local && server) {
          diffs.push({ type: 'deleted', id, name: server.name, side: 'server' });
        } else if (JSON.stringify(local) !== JSON.stringify(server)) {
          const fieldDiffs = [];
          ['name', 'description', 'category', 'sortOrder', 'estimatedDays'].forEach((field) => {
            if (JSON.stringify(local[field]) !== JSON.stringify(server[field])) {
              fieldDiffs.push({
                field,
                local: local[field],
                server: server[field]
              });
            }
          });
          diffs.push({ type: 'modified', id, name: local.name, fieldDiffs });
        }
      });
      return diffs;
    }

    return null;
  }, [conflictInfo]);

  const handleMerge = () => {
    if (!compareData) {
      onResolve('force');
      return;
    }

    const { localData, serverData } = conflictInfo;
    const localMap = new Map(localData.map((t) => [t.id, t]));
    const serverMap = new Map(serverData.map((t) => [t.id, t]));
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

    const merged = [];
    allIds.forEach((id) => {
      const local = localMap.get(id);
      const server = serverMap.get(id);
      if (local && server) {
        merged.push({ ...server, ...local });
      } else if (local) {
        merged.push(local);
      } else {
        merged.push(server);
      }
    });

    const normalized = merged.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    onResolve('merge', normalized);
  };

  const handleForceOverwrite = () => {
    onResolve('force');
  };

  const handleAcceptServer = () => {
    onResolve('accept_server');
  };

  if (!conflictInfo) return null;

  const isTemplateConflict = conflictInfo.dataLabel === '任务模板';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ 数据冲突</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="conflict-warning">
            <div className="conflict-icon">⚠️</div>
            <div>
              <div className="conflict-title">{conflictInfo.message}</div>
              <div className="conflict-subtitle">
                正在修改：<strong>{conflictInfo.dataLabel}</strong>
              </div>
            </div>
          </div>

          <div className="conflict-versions">
            <div className="version-card">
              <div className="version-label local">您的版本</div>
              <div className="version-time">
                本地更新于：{formatDate(conflictInfo.localLastUpdated)}
              </div>
              {conflictInfo.localVersion && (
                <div className="version-hash">版本：{conflictInfo.localVersion.slice(0, 8)}...</div>
              )}
            </div>
            <div className="version-conflict-icon">⚔️</div>
            <div className="version-card">
              <div className="version-label server">服务器版本</div>
              <div className="version-time">
                服务器更新于：{formatDate(conflictInfo.serverLastUpdated)}
              </div>
              {conflictInfo.serverVersion && (
                <div className="version-hash">版本：{conflictInfo.serverVersion.slice(0, 8)}...</div>
              )}
            </div>
          </div>

          {isTemplateConflict && compareData && compareData.length > 0 && (
            <div className="conflict-diff">
              <div className="diff-title">差异对比（任务模板）</div>
              <div className="diff-list">
                {compareData.map((diff, idx) => (
                  <div key={idx} className={`diff-item diff-${diff.type}`}>
                    <div className="diff-type">
                      {diff.type === 'added' && <span className="diff-added">+ 新增</span>}
                      {diff.type === 'deleted' && <span className="diff-deleted">- 删除</span>}
                      {diff.type === 'modified' && <span className="diff-modified">~ 修改</span>}
                    </div>
                    <div className="diff-name">{diff.name}</div>
                    {diff.fieldDiffs && (
                      <div className="diff-fields">
                        {diff.fieldDiffs.map((fd, fidx) => (
                          <div key={fidx} className="diff-field">
                            <span className="diff-field-name">{fd.field}:</span>
                            <span className="diff-local">本地: {JSON.stringify(fd.local)}</span>
                            <span className="diff-arrow">→</span>
                            <span className="diff-server">服务器: {JSON.stringify(fd.server)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {diff.side === 'local' && <div className="diff-side">仅在您的版本中</div>}
                    {diff.side === 'server' && <div className="diff-side">仅在服务器版本中</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="conflict-options">
            <div className="conflict-option-title">请选择处理方式：</div>

            <label className={`conflict-option ${resolution === 'merge' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={resolution === 'merge'}
                onChange={(e) => setResolution(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="option-header">
                <span className="option-icon">🔀</span>
                <span className="option-title">智能合并（推荐）</span>
              </div>
              <div className="option-desc">
                合并两个版本，保留双方的新增内容，冲突字段以您的修改为准
              </div>
            </label>

            <label className={`conflict-option ${resolution === 'force' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="resolution"
                value="force"
                checked={resolution === 'force'}
                onChange={(e) => setResolution(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="option-header">
                <span className="option-icon">🔒</span>
                <span className="option-title">强制覆盖</span>
              </div>
              <div className="option-desc">
                用您的版本覆盖服务器上的数据，其他人的修改将丢失
              </div>
            </label>

            <label className={`conflict-option ${resolution === 'accept_server' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="resolution"
                value="accept_server"
                checked={resolution === 'accept_server'}
                onChange={(e) => setResolution(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="option-header">
                <span className="option-icon">✅</span>
                <span className="option-title">接受服务器版本</span>
              </div>
              <div className="option-desc">
                放弃您的修改，使用服务器上的最新版本
              </div>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          {resolution === 'merge' && (
            <button type="button" className="btn btn-primary" onClick={handleMerge}>
              🔀 确认合并
            </button>
          )}
          {resolution === 'force' && (
            <button type="button" className="btn btn-danger-solid" onClick={handleForceOverwrite}>
              🔒 确认覆盖
            </button>
          )}
          {resolution === 'accept_server' && (
            <button type="button" className="btn btn-primary" onClick={handleAcceptServer}>
              ✅ 接受服务器版本
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;
