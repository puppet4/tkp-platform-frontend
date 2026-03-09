import { ReactNode } from "react";
import { Lock, AlertCircle } from "lucide-react";

interface PermissionGateProps {
  /**
   * 是否有权限
   */
  hasPermission: boolean;
  /**
   * 有权限时显示的内容
   */
  children: ReactNode;
  /**
   * 无权限时的回退内容（可选）
   */
  fallback?: ReactNode;
  /**
   * 权限提示消息
   */
  message?: string;
  /**
   * 显示模式：inline（内联提示）或 disabled（禁用状态）
   */
  mode?: "inline" | "disabled" | "hidden";
}

/**
 * 权限门控组件
 * 用于优雅地处理权限不足的情况，而不是直接隐藏功能
 */
export function PermissionGate({
  hasPermission,
  children,
  fallback,
  message = "权限不足",
  mode = "inline",
}: PermissionGateProps) {
  // 有权限，直接显示内容
  if (hasPermission) {
    return <>{children}</>;
  }

  // 无权限，根据模式处理
  if (mode === "hidden") {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (mode === "disabled") {
    // 禁用模式：显示禁用状态的元素
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-3 py-1 bg-muted border rounded-md text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {message}
          </div>
        </div>
      </div>
    );
  }

  // 默认内联模式：显示权限提示
  return (
    <div className="p-4 bg-muted/50 border border-dashed rounded-lg flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-sm">{message}</div>
        <div className="text-xs text-muted-foreground mt-1">
          请联系管理员获取相应权限
        </div>
      </div>
    </div>
  );
}

/**
 * 权限提示组件（用于替代隐藏的按钮）
 */
export function PermissionHint({ message = "权限不足" }: { message?: string }) {
  return (
    <button
      disabled
      className="px-4 py-2 bg-muted text-muted-foreground rounded-md cursor-not-allowed flex items-center gap-2"
      title={message}
    >
      <Lock className="w-4 h-4" />
      {message}
    </button>
  );
}

/**
 * 权限包装器（用于包装整个页面或区域）
 */
export function PermissionWrapper({
  hasPermission,
  children,
  message = "您没有访问此页面的权限",
}: {
  hasPermission: boolean;
  children: ReactNode;
  message?: string;
}) {
  if (hasPermission) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{message}</h3>
          <p className="text-sm text-muted-foreground">
            如需访问此功能，请联系管理员为您分配相应权限
          </p>
        </div>
      </div>
    </div>
  );
}
