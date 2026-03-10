import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiError, validators } from '@/lib/error-handler';
import { ApiError } from '@/lib/api';

describe('Error Handler', () => {
  describe('handleApiError', () => {
    it('handles ApiError with code', () => {
      const error = new ApiError(403, {
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
      expect(handleApiError(error)).toBe('权限不足，无法执行此操作');
    });

    it('handles ApiError with UNAUTHORIZED', () => {
      const error = new ApiError(401, {
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
      expect(handleApiError(error)).toBe('登录已过期，请重新登录');
    });

    it('handles ApiError with 500 status', () => {
      const error = new ApiError(500, {
        error: { message: 'Internal error' }
      });
      expect(handleApiError(error)).toBe('服务器内部错误，请稍后重试');
    });

    it('handles generic Error', () => {
      const error = new Error('Network error');
      expect(handleApiError(error)).toBe('Network error');
    });

    it('handles unknown error', () => {
      expect(handleApiError('unknown')).toBe('未知错误，请重试');
    });
  });

  describe('validators', () => {
    describe('email', () => {
      it('validates correct email', () => {
        expect(validators.email('test@example.com')).toBeNull();
      });

      it('rejects invalid email', () => {
        expect(validators.email('invalid-email')).toBe('邮箱格式不正确');
      });

      it('rejects empty email', () => {
        expect(validators.email('')).toBe('邮箱不能为空');
      });
    });

    describe('required', () => {
      it('accepts non-empty value', () => {
        expect(validators.required('value')).toBeNull();
      });

      it('rejects empty value', () => {
        expect(validators.required('')).toBe('此字段不能为空');
      });

      it('rejects whitespace-only value', () => {
        expect(validators.required('   ')).toBe('此字段不能为空');
      });

      it('uses custom field name', () => {
        expect(validators.required('', '用户名')).toBe('用户名不能为空');
      });
    });

    describe('minLength', () => {
      it('accepts value meeting minimum', () => {
        expect(validators.minLength('12345', 5)).toBeNull();
      });

      it('rejects value below minimum', () => {
        expect(validators.minLength('123', 5)).toBe('此字段至少需要 5 个字符');
      });
    });

    describe('maxLength', () => {
      it('accepts value within maximum', () => {
        expect(validators.maxLength('123', 5)).toBeNull();
      });

      it('rejects value exceeding maximum', () => {
        expect(validators.maxLength('123456', 5)).toBe('此字段不能超过 5 个字符');
      });
    });

    describe('slug', () => {
      it('validates correct slug', () => {
        expect(validators.slug('my-slug-123')).toBeNull();
      });

      it('rejects slug with uppercase', () => {
        expect(validators.slug('My-Slug')).toBe('标识符只能包含小写字母、数字和连字符');
      });

      it('rejects slug with spaces', () => {
        expect(validators.slug('my slug')).toBe('标识符只能包含小写字母、数字和连字符');
      });

      it('rejects empty slug', () => {
        expect(validators.slug('')).toBe('标识符不能为空');
      });
    });
  });
});
