/**
 * 统一错误处理工具
 * 将后端错误码转换为用户友好的中文提示
 */

export interface ApiErrorResponse {
  request_id?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// 错误码到中文消息的映射
const ERROR_MESSAGES: Record<string, string> = {
  // E1xxx: 权限与认证
  E1000: "未登录或登录状态已失效",
  E1001: "权限不足",
  E1002: "用户名或密码错误",
  E1003: "访问令牌已过期",
  E1004: "缺少租户上下文",

  // E2xxx: 配额与限流
  E2001: "配额已超限",
  E2002: "请求过于频繁，请稍后重试",
  E2003: "存储空间已满",
  E2004: "文档数量已达上限",

  // E3xxx: 参数校验
  E3001: "请求参数校验失败",
  E3002: "输入参数不合法",
  E3003: "缺少必填字段",
  E3004: "文件格式不支持",
  E3005: "文件大小超过限制",

  // E4xxx: 资源状态
  E4001: "资源不存在",
  E4002: "资源状态冲突",
  E4003: "资源已归档",
  E4004: "资源已锁定",
  E4005: "资源已存在",

  // E5xxx: 外部服务
  E5001: "存储服务异常",
  E5002: "向量化服务异常",
  E5003: "检索服务异常",
  E5004: "大模型服务异常",
  E5999: "系统内部错误",

  // 兼容旧错误码
  PERMISSION_DENIED: "权限不足",
  RESOURCE_NOT_FOUND: "资源不存在",
  QUOTA_EXCEEDED: "配额已超限",
  VALIDATION_ERROR: "请求参数校验失败",
  UNAUTHORIZED: "未登录或登录状态已失效",
  FORBIDDEN: "权限不足",
  NOT_FOUND: "资源不存在",
  CONFLICT: "资源状态冲突",
};

/**
 * 处理 API 错误，返回用户友好的中文消息
 */
export function handleApiError(error: unknown): string {
  // 如果是 ApiError 对象
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body: unknown }).body;

    // 检查是否是标准错误响应格式
    if (body && typeof body === "object" && "error" in body) {
      const apiError = body as ApiErrorResponse;
      const errorCode = apiError.error?.code;
      const errorMessage = apiError.error?.message;

      // 优先使用错误码映射
      if (errorCode && ERROR_MESSAGES[errorCode]) {
        return ERROR_MESSAGES[errorCode];
      }

      // 其次使用后端返回的消息（已经是中文）
      if (errorMessage) {
        return errorMessage;
      }
    }

    // 兼容旧格式：直接在 body 中有 message
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }
  }

  // 如果是 Error 对象
  if (error instanceof Error) {
    return error.message;
  }

  // 默认错误消息
  return "操作失败，请稍后重试";
}

/**
 * 获取错误详情（用于调试）
 */
export function getErrorDetails(error: unknown): Record<string, unknown> | null {
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body: unknown }).body;
    if (body && typeof body === "object" && "error" in body) {
      const apiError = body as ApiErrorResponse;
      return apiError.error?.details || null;
    }
  }
  return null;
}

/**
 * 判断是否是权限错误
 */
export function isPermissionError(error: unknown): boolean {
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body: unknown }).body;
    if (body && typeof body === "object" && "error" in body) {
      const apiError = body as ApiErrorResponse;
      const code = apiError.error?.code;
      return code === "E1001" || code === "PERMISSION_DENIED" || code === "FORBIDDEN";
    }
  }
  return false;
}

/**
 * 判断是否是认证错误
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body: unknown }).body;
    if (body && typeof body === "object" && "error" in body) {
      const apiError = body as ApiErrorResponse;
      const code = apiError.error?.code;
      return code === "E1000" || code === "E1003" || code === "UNAUTHORIZED";
    }
  }
  return false;
}
