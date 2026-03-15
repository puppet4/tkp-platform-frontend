/**
 * Query parameter validation utilities
 */

export function validateLimit(limit?: number): number {
  if (limit === undefined) return 50;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('limit must be a positive integer');
  }
  if (limit > 1000) {
    throw new Error('limit cannot exceed 1000');
  }
  return limit;
}

export function validateOffset(offset?: number): number {
  if (offset === undefined) return 0;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('offset must be a non-negative integer');
  }
  return offset;
}

export function validateTimeRange(hours?: number): number {
  if (hours === undefined) return 24;
  if (!Number.isInteger(hours) || hours < 1) {
    throw new Error('time range must be a positive integer');
  }
  if (hours > 8760) { // 365 days
    throw new Error('time range cannot exceed 8760 hours (1 year)');
  }
  return hours;
}

export function validateResourceType(resourceType?: string): string | undefined {
  if (!resourceType) return undefined;

  const validTypes = [
    'retrieval_logs',
    'chat_messages',
    'conversations',
    'feedback',
    'documents',
    'audit_logs',
  ];

  if (!validTypes.includes(resourceType)) {
    throw new Error(`Invalid resource type: ${resourceType}. Must be one of: ${validTypes.join(', ')}`);
  }

  return resourceType;
}

export function sanitizeString(value?: string): string | undefined {
  if (!value) return undefined;
  // Remove potential XSS characters
  return value.replace(/[<>'"&]/g, '');
}

/**
 * Sanitize user-generated content for display
 */
export function sanitizeDisplayText(value?: string): string {
  if (!value) return '';
  // Escape HTML special characters
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Form validation utilities
 */

export function validateRequired(value: string | undefined | null, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName}不能为空`);
  }
  return value.trim();
}

export function validateStringLength(
  value: string,
  fieldName: string,
  options: { min?: number; max?: number }
): string {
  const trimmed = value.trim();

  if (options.min !== undefined && trimmed.length < options.min) {
    throw new Error(`${fieldName}长度不能少于${options.min}个字符`);
  }

  if (options.max !== undefined && trimmed.length > options.max) {
    throw new Error(`${fieldName}长度不能超过${options.max}个字符`);
  }

  return trimmed;
}

export function validateEmail(email: string): string {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new Error('邮箱格式不正确');
  }

  return trimmed;
}

export function validateSlug(slug: string): string {
  const trimmed = slug.trim();
  const slugRegex = /^[\w\u4e00-\u9fff\u3400-\u4dbf-]+$/u;

  if (!slugRegex.test(trimmed)) {
    throw new Error('标识符只能包含中文、字母、数字、下划线和连字符');
  }

  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    throw new Error('标识符不能以连字符开头或结尾');
  }

  return trimmed;
}

export function validatePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName}必须是正整数`);
  }
  return value;
}

export function validateNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName}必须是非负整数`);
  }
  return value;
}
