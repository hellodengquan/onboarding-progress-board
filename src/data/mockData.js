export const TASK_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'
};

export const TASK_STATUS_LABEL = {
  [TASK_STATUS.NOT_STARTED]: '未开始',
  [TASK_STATUS.IN_PROGRESS]: '进行中',
  [TASK_STATUS.COMPLETED]: '已完成',
  [TASK_STATUS.BLOCKED]: '受阻'
};

export const initialTaskTemplates = [
  {
    id: 't1',
    name: '文档签署',
    description: '完成劳动合同、保密协议等文件签署',
    category: '行政',
    sortOrder: 1,
    estimatedDays: 1
  },
  {
    id: 't2',
    name: '账号开通',
    description: '开通邮箱、OA、Git 等系统账号',
    category: 'IT',
    sortOrder: 2,
    estimatedDays: 1
  },
  {
    id: 't3',
    name: '设备领取',
    description: '领取笔记本电脑、工牌、办公用品',
    category: '行政',
    sortOrder: 3,
    estimatedDays: 1
  },
  {
    id: 't4',
    name: '入职培训',
    description: '公司文化、规章制度、安全培训',
    category: 'HR',
    sortOrder: 4,
    estimatedDays: 2
  },
  {
    id: 't5',
    name: '部门介绍',
    description: '认识团队成员、了解部门架构',
    category: '部门',
    sortOrder: 5,
    estimatedDays: 1
  },
  {
    id: 't6',
    name: '导师对接',
    description: '确认入职导师、制定第一周计划',
    category: '部门',
    sortOrder: 6,
    estimatedDays: 1
  },
  {
    id: 't7',
    name: '开发环境搭建',
    description: '安装开发工具、配置开发环境',
    category: 'IT',
    sortOrder: 7,
    estimatedDays: 2
  },
  {
    id: 't8',
    name: '项目上手',
    description: '阅读项目文档、参与第一个任务',
    category: '部门',
    sortOrder: 8,
    estimatedDays: 5
  }
];

export const initialEmployees = [
  {
    id: 'e1',
    name: '张三',
    position: '前端开发工程师',
    department: '研发部',
    hireDate: '2026-06-01',
    avatar: '张'
  },
  {
    id: 'e2',
    name: '李四',
    position: '后端开发工程师',
    department: '研发部',
    hireDate: '2026-06-10',
    avatar: '李'
  },
  {
    id: 'e3',
    name: '王五',
    position: '产品经理',
    department: '产品部',
    hireDate: '2026-06-15',
    avatar: '王'
  },
  {
    id: 'e4',
    name: '赵六',
    position: 'UI 设计师',
    department: '设计部',
    hireDate: '2026-06-17',
    avatar: '赵'
  }
];

export const initialProgress = {
  e1: {
    t1: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-01', note: '' },
    t2: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-01', note: '' },
    t3: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-02', note: '' },
    t4: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-03', note: '' },
    t5: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-04', note: '' },
    t6: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-04', note: '' },
    t7: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-06', note: '' },
    t8: { status: TASK_STATUS.IN_PROGRESS, completedDate: null, note: '正在熟悉代码库' }
  },
  e2: {
    t1: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-10', note: '' },
    t2: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-10', note: '' },
    t3: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-11', note: '' },
    t4: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-12', note: '' },
    t5: { status: TASK_STATUS.IN_PROGRESS, completedDate: null, note: '' },
    t6: { status: TASK_STATUS.BLOCKED, completedDate: null, note: '导师出差中，预计6月20日返回' },
    t7: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t8: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' }
  },
  e3: {
    t1: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-15', note: '' },
    t2: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-15', note: '' },
    t3: { status: TASK_STATUS.IN_PROGRESS, completedDate: null, note: '' },
    t4: { status: TASK_STATUS.BLOCKED, completedDate: null, note: '培训讲师临时请假，等待重新安排' },
    t5: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t6: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t7: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t8: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' }
  },
  e4: {
    t1: { status: TASK_STATUS.COMPLETED, completedDate: '2026-06-17', note: '' },
    t2: { status: TASK_STATUS.IN_PROGRESS, completedDate: null, note: '设计软件许可证待审批' },
    t3: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t4: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t5: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t6: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t7: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' },
    t8: { status: TASK_STATUS.NOT_STARTED, completedDate: null, note: '' }
  }
};
