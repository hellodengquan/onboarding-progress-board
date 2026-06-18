export const TEMPLATE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['name'],
    properties: {
      id: {
        type: 'string',
        description: '任务唯一标识'
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: '任务名称（必填）'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: '任务描述'
      },
      category: {
        type: 'string',
        enum: ['行政', 'IT', 'HR', '部门'],
        description: '任务分类'
      },
      sortOrder: {
        type: 'integer',
        minimum: 1,
        description: '排序号'
      },
      estimatedDays: {
        type: 'integer',
        minimum: 1,
        maximum: 365,
        description: '预计天数（1-365）'
      }
    },
    additionalProperties: false
  }
};

const VALIDATION_MESSAGES = {
  type: (expected, actual) => `类型错误：期望 ${expected}，实际 ${actual}`,
  required: (field) => `缺少必填字段：${field}`,
  minLength: (field, min) => `${field} 长度不能少于 ${min} 个字符`,
  maxLength: (field, max) => `${field} 长度不能超过 ${max} 个字符`,
  minimum: (field, min) => `${field} 不能小于 ${min}`,
  maximum: (field, max) => `${field} 不能大于 ${max}`,
  enum: (field, allowed) => `${field} 必须是以下值之一：${allowed.join('、')}`,
  integer: (field) => `${field} 必须是整数`,
  array: '数据必须是数组格式',
  additionalProperties: (field) => `包含未定义的字段：${field}`,
  duplicateId: (id) => `存在重复的任务 ID：${id}`,
  emptyArray: '模板数组不能为空，至少需要一个任务'
};

const getType = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const validateValue = (value, schema, path = '') => {
  const errors = [];
  const actualType = getType(value);

  if (schema.type && actualType !== schema.type) {
    if (schema.type === 'integer' && actualType === 'number' && Number.isInteger(value)) {
      // integer 类型允许 number 且是整数
    } else {
      errors.push({
        path,
        message: VALIDATION_MESSAGES.type(schema.type, actualType)
      });
      return errors;
    }
  }

  if (schema.type === 'integer' && !Number.isInteger(value)) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.integer(path || '值')
    });
  }

  if (schema.minLength !== undefined && actualType === 'string' && value.length < schema.minLength) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.minLength(path || '值', schema.minLength)
    });
  }

  if (schema.maxLength !== undefined && actualType === 'string' && value.length > schema.maxLength) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.maxLength(path || '值', schema.maxLength)
    });
  }

  if (schema.minimum !== undefined && (actualType === 'number' || actualType === 'integer') && value < schema.minimum) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.minimum(path || '值', schema.minimum)
    });
  }

  if (schema.maximum !== undefined && (actualType === 'number' || actualType === 'integer') && value > schema.maximum) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.maximum(path || '值', schema.maximum)
    });
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: VALIDATION_MESSAGES.enum(path || '值', schema.enum)
    });
  }

  if (schema.type === 'object' && actualType === 'object') {
    if (schema.required) {
      schema.required.forEach((field) => {
        if (value[field] === undefined) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: VALIDATION_MESSAGES.required(field)
          });
        }
      });
    }

    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        if (value[key] !== undefined) {
          const childErrors = validateValue(
            value[key],
            schema.properties[key],
            path ? `${path}.${key}` : key
          );
          errors.push(...childErrors);
        }
      });
    }

    if (schema.additionalProperties === false) {
      const allowedKeys = schema.properties ? Object.keys(schema.properties) : [];
      Object.keys(value).forEach((key) => {
        if (!allowedKeys.includes(key)) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: VALIDATION_MESSAGES.additionalProperties(key)
          });
        }
      });
    }
  }

  if (schema.type === 'array' && actualType === 'array') {
    if (schema.items) {
      value.forEach((item, index) => {
        const childErrors = validateValue(item, schema.items, `${path}[${index}]`);
        errors.push(...childErrors);
      });
    }
  }

  return errors;
};

export const validateBySchema = (data, schema) => {
  const errors = validateValue(data, schema);

  if (schema.type === 'array' && Array.isArray(data) && data.length === 0) {
    errors.unshift({
      path: '',
      message: VALIDATION_MESSAGES.emptyArray
    });
  }

  if (schema.type === 'array' && Array.isArray(data) && data.length > 0) {
    const ids = data.map((item) => item.id).filter(Boolean);
    const uniqueIds = new Set();
    ids.forEach((id) => {
      if (uniqueIds.has(id)) {
        errors.push({
          path: '',
          message: VALIDATION_MESSAGES.duplicateId(id)
        });
      }
      uniqueIds.add(id);
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.map((e) => ({
      path: e.path,
      message: e.message
    }))
  };
};

export const validateTemplatesBySchema = (templates) => {
  return validateBySchema(templates, TEMPLATE_SCHEMA);
};

export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) return [];
  return errors.map((e) => (e.path ? `[${e.path}] ${e.message}` : e.message));
};
