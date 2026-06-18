import { useState, useRef } from 'react';
import { validateTemplates } from '../data/mockData';

function TemplateUploader({ onUpload, currentTemplates }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setErrors([]);
    setPreviewData(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrors(['请选择 .json 格式的文件']);
      return;
    }

    if (file.size > 1024 * 1024) {
      setErrors(['文件大小不能超过 1MB']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const validation = validateTemplates(data);

        if (!validation.valid) {
          setErrors(validation.errors);
          return;
        }

        const normalized = data.map((tpl, index) => ({
          id: tpl.id || `tpl_${Date.now()}_${index}`,
          name: tpl.name,
          description: tpl.description || '',
          category: tpl.category || '行政',
          sortOrder: tpl.sortOrder ?? index + 1,
          estimatedDays: tpl.estimatedDays ?? 1
        }));

        setPreviewData(normalized);
      } catch (parseError) {
        setErrors([`JSON 解析失败：${parseError.message}`]);
      }
    };
    reader.onerror = () => {
      setErrors(['文件读取失败，请重试']);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleConfirmUpload = () => {
    if (!previewData) return;
    onUpload(previewData);
    setIsOpen(false);
    setPreviewData(null);
    setErrors([]);
  };

  const handleExportCurrent = () => {
    const dataStr = JSON.stringify(currentTemplates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreviewData(null);
    setErrors([]);
  };

  return (
    <>
      <div className="template-uploader-actions">
        <button className="btn btn-sm btn-default" onClick={handleExportCurrent}>
          📥 导出当前模板
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => setIsOpen(true)}>
          ⬆️ 上传模板 JSON
        </button>
      </div>

      {isOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>上传自定义任务模板</h3>
              <button className="btn-close" onClick={handleClose}>×</button>
            </div>
            <div className="modal-body">
              <div className="upload-tips">
                <p><strong>文件要求：</strong></p>
                <ul>
                  <li>必须是 .json 格式文件，大小不超过 1MB</li>
                  <li>数据为对象数组，每个对象包含：name（必填）、description、category、sortOrder、estimatedDays</li>
                  <li>category 可选值：行政、IT、HR、部门</li>
                </ul>
                <button className="btn btn-sm btn-text" onClick={handleExportCurrent}>
                  下载示例模板（导出当前配置）
                </button>
              </div>

              <div
                className={`upload-dropzone ${dragOver ? 'dragover' : ''} ${errors.length > 0 ? 'has-error' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="dropzone-icon">📁</div>
                <div className="dropzone-text">
                  点击选择文件或拖拽 JSON 文件到此处
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              </div>

              {errors.length > 0 && (
                <div className="upload-errors">
                  <div className="upload-errors-title">文件校验失败：</div>
                  <ul>
                    {errors.map((err, i) => (
                      <li key={i}>⚠️ {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewData && (
                <div className="upload-preview">
                  <div className="preview-header">
                    <span className="preview-success">✓ 文件校验通过</span>
                    <span className="preview-count">共 {previewData.length} 个任务</span>
                  </div>
                  <div className="preview-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>序号</th>
                          <th>任务名称</th>
                          <th>分类</th>
                          <th>预计天数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData
                          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                          .map((tpl, idx) => (
                            <tr key={tpl.id}>
                              <td>{idx + 1}</td>
                              <td>
                                <div className="font-medium">{tpl.name}</div>
                                {tpl.description && (
                                  <div className="text-secondary" style={{ fontSize: '12px' }}>
                                    {tpl.description}
                                  </div>
                                )}
                              </td>
                              <td>{tpl.category}</td>
                              <td>{tpl.estimatedDays} 天</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="preview-warning">
                    ⚠️ 上传后将覆盖当前所有任务模板，已关联的员工进度数据不会被自动调整，请谨慎操作。
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={handleClose}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmUpload}
                disabled={!previewData}
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TemplateUploader;
