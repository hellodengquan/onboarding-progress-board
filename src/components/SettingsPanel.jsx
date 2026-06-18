import { useState } from 'react';
import { STORAGE_BACKEND, STORAGE_LABEL } from '../storage/types.js';

function SettingsPanel({ currentBackend, apiConfig, onSwitchBackend, onClose }) {
  const [selectedBackend, setSelectedBackend] = useState(currentBackend);
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [timeout, setTimeoutValue] = useState(apiConfig.timeout);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestConnection = async () => {
    if (selectedBackend !== STORAGE_BACKEND.RESTFUL) return;

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Number(timeout));

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/templates`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 401 || response.status === 403) {
        setTestResult({ success: true, message: `连接成功（HTTP ${response.status}）` });
      } else {
        setTestResult({ success: false, message: `连接失败（HTTP ${response.status}）` });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setTestResult({ success: false, message: '连接超时' });
      } else {
        setTestResult({ success: false, message: `无法连接：${error.message}` });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleConfirm = () => {
    const newConfig = selectedBackend === STORAGE_BACKEND.RESTFUL
      ? { baseUrl, timeout: Number(timeout) }
      : null;
    onSwitchBackend(selectedBackend, newConfig);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>系统设置</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>数据存储方式</label>
            <div className="backend-options">
              {Object.entries(STORAGE_LABEL).map(([key]) => (
                <label
                  key={key}
                  className={`backend-option ${selectedBackend === key ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="backend"
                    value={key}
                    checked={selectedBackend === key}
                    onChange={(e) => setSelectedBackend(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div className="backend-option-icon">
                    {key === STORAGE_BACKEND.LOCAL ? '💻' : '☁️'}
                  </div>
                  <div>
                    <div className="backend-option-title">
                      {key === STORAGE_BACKEND.LOCAL ? '本地存储' : '远程服务器'}
                    </div>
                    <div className="backend-option-desc">
                      {key === STORAGE_BACKEND.LOCAL
                        ? '数据保存在浏览器本地，仅当前设备可见，适合个人使用'
                        : '数据保存在远程服务器，支持跨设备、跨部门协作'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedBackend === STORAGE_BACKEND.RESTFUL && (
            <>
              <div className="form-group">
                <label>API 基础地址</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/onboarding"
                />
                <div className="form-hint">
                  后端需提供以下 REST 接口：GET/PUT /templates、GET/PUT /progress、GET/PUT /ui-state/tab
                </div>
              </div>
              <div className="form-group">
                <label>请求超时时间（毫秒）</label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutValue(e.target.value)}
                  min="1000"
                  step="1000"
                />
              </div>
              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? '测试中...' : '测试连接'}
                </button>
                {testResult && (
                  <span className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.success ? '✓' : '✗'} {testResult.message}
                  </span>
                )}
              </div>
            </>
          )}

          <div className="settings-tip">
            💡 提示：切换存储方式后，当前内存中的数据会同步保存到新的存储后端。
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
