/**
 * 前端错误监控和性能追踪
 */
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

interface MonitoringConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

export function initMonitoring(config: MonitoringConfig) {
  if (!config.dsn) {
    console.warn("Sentry DSN not configured, monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
    beforeSend(event, hint) {
      // 过滤敏感信息
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      return event;
    },
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error("Error captured:", error, context);
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

export function setUser(user: { id: string; email: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

export function clearUser() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

// 性能监控
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  try {
    fn();
  } finally {
    const duration = performance.now() - start;
    addBreadcrumb(`Performance: ${name}`, "performance", { duration });

    // 如果操作超过 1 秒，记录为慢操作
    if (duration > 1000) {
      captureMessage(`Slow operation: ${name} took ${duration}ms`, "warning");
    }
  }
}

// 自动追踪 API 调用
export function trackApiCall(method: string, path: string, duration: number, status: number) {
  addBreadcrumb(`API ${method} ${path}`, "http", {
    method,
    path,
    duration,
    status,
  });

  // 追踪慢 API 调用
  if (duration > 3000) {
    captureMessage(`Slow API call: ${method} ${path} took ${duration}ms`, "warning");
  }

  // 追踪 API 错误
  if (status >= 400) {
    captureMessage(`API error: ${method} ${path} returned ${status}`, "error");
  }
}

// Web Vitals 监控
export function reportWebVitals() {
  if ('web-vital' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        Sentry.setMeasurement('CLS', metric.value, 'none');
      });
      getFID((metric) => {
        Sentry.setMeasurement('FID', metric.value, 'millisecond');
      });
      getFCP((metric) => {
        Sentry.setMeasurement('FCP', metric.value, 'millisecond');
      });
      getLCP((metric) => {
        Sentry.setMeasurement('LCP', metric.value, 'millisecond');
      });
      getTTFB((metric) => {
        Sentry.setMeasurement('TTFB', metric.value, 'millisecond');
      });
    });
  }
}

// 自定义性能指标
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(name: string) {
    this.marks.set(name, performance.now());
  }

  end(name: string) {
    const start = this.marks.get(name);
    if (!start) {
      console.warn(`Performance mark "${name}" not found`);
      return;
    }

    const duration = performance.now() - start;
    this.marks.delete(name);

    addBreadcrumb(`Performance: ${name}`, "performance", { duration });
    Sentry.setMeasurement(name, duration, 'millisecond');

    return duration;
  }
}

export const performanceMonitor = new PerformanceMonitor();
