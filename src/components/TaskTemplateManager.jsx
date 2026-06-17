import { useState } from 'react';

function TaskTemplateManager({ templates, onAddTemplate, onUpdateTemplate, onDeleteTemplate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '行政',
    sortOrder: templates.length + 1,
    estimatedDays: 1
  });

  const openAddModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: '行政',
      sortOrder: templates.length + 1,
      estimatedDays: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      sortOrder: template.sortOrder,
      estimatedDays: template.estimatedDays
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTemplate) {
      onUpdateTemplate({ ...editingTemplate, ...formData });
    } else {
      onAddTemplate({
        id: 't' + Date.now(),
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  const sortedTemplates = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);

  const getCategoryColor = (category) => {
    const colors = {
      '行政': 'bg-blue-50 text-blue-700 border-blue-200',
      'IT': 'bg-purple-50 text-purple-700 border-purple-200',
      'HR': 'bg-green-50 text-green-700 border-green-200',
      '部门': 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[category] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="task-template-manager">
      <div className="page-header">
        <div>
          <h2>入职任务模板管理</h2>
          <p className="page-desc">维护新员工入职流程中的各项任务模板</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + 添加任务
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{templates.length}</div>
          <div className="stat-label">任务总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {templates.reduce((sum, t) => sum + t.estimatedDays, 0)}
          </div>
          <div className="stat-label">预计总天数</div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>序号</th>
              <th>任务名称</th>
              <th>描述</th>
              <th style={{ width: '100px' }}>分类</th>
              <th style={{ width: '100px' }}>预计天数</th>
              <th style={{ width: '140px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedTemplates.map((template, index) => (
              <tr key={template.id}>
                <td>{index + 1}</td>
                <td className="font-medium">{template.name}</td>
                <td className="text-secondary">{template.description}</td>
                <td>
                  <span className={`tag ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </td>
                <td>{template.estimatedDays} 天</td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-sm btn-text" onClick={() => openEditModal(template)}>
                      编辑
                    </button>
                    <button className="btn btn-sm btn-text btn-danger" onClick={() => onDeleteTemplate(template.id)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTemplate ? '编辑任务模板' : '添加任务模板'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>任务名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入任务名称"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>任务描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入任务描述"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>分类</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="行政">行政</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="部门">部门</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>排序</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>预计天数</label>
                    <input
                      type="number"
                      value={formData.estimatedDays}
                      onChange={(e) => setFormData({ ...formData, estimatedDays: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-default" onClick={() => setIsModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTemplate ? '保存修改' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskTemplateManager;
