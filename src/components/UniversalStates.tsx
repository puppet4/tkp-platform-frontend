import { ReactNode } from "react";
import { AlertTriangle, Loader2, Lock, RefreshCw } from "lucide-react";

export function LoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden animate-pulse">
      <div className="border-b border-border bg-secondary/30 px-5 py-3.5 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-secondary rounded-md w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-border flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className={`h-3 bg-secondary/70 rounded-md ${j === 0 ? "w-32" : "w-16"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-xs animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-secondary mb-3" />
          <div className="h-4 bg-secondary rounded-md w-24 mb-2" />
          <div className="h-3 bg-secondary/70 rounded-md w-36" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground/30">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1.5 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm font-semibold text-foreground">加载失败</p>
      <p className="text-[12px] text-muted-foreground mt-1.5">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-all duration-150">
          <RefreshCw className="h-3.5 w-3.5" /> 重试
        </button>
      )}
    </div>
  );
}

export function NoPermissionState({ resource }: { resource: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-warning" />
      </div>
      <p className="text-sm font-semibold text-foreground">权限不足</p>
      <p className="text-[12px] text-muted-foreground mt-1.5">您没有访问「{resource}」的权限，请联系管理员</p>
    </div>
  );
}

export function InlineLoading({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 className="h-4 w-4 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}
