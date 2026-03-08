// ==================== Types (only those still used by Index.tsx) ====================

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  workspace_name: string;
  doc_count: number;
  chunk_count: number;
  status: "active" | "indexing" | "error";
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  kb_id: string;
  kb_name: string;
  version: number;
  status: "ready" | "processing" | "error";
  chunk_count: number;
  file_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackItem {
  id: string;
  conversation_id: string;
  message_id: string;
  type: "thumbs_up" | "thumbs_down" | "correction" | "flag";
  comment: string;
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
  user_name: string;
}

export interface OpsMetric {
  label: string;
  value: string;
  change: number;
  unit: string;
}

// ==================== Mock Data (dashboard only) ====================

export const knowledgeBases: KnowledgeBase[] = [
  { id: "kb-001", name: "API 接口文档", description: "所有服务的 API 接口规范", workspace_id: "ws-002", workspace_name: "工程技术", doc_count: 34, chunk_count: 1280, status: "active", updated_at: "2 小时前" },
  { id: "kb-002", name: "产品需求库", description: "产品需求文档与PRD", workspace_id: "ws-001", workspace_name: "产品研发", doc_count: 22, chunk_count: 890, status: "active", updated_at: "5 小时前" },
  { id: "kb-003", name: "运维手册", description: "系统运维与故障排查", workspace_id: "ws-002", workspace_name: "工程技术", doc_count: 15, chunk_count: 620, status: "indexing", updated_at: "昨天" },
  { id: "kb-004", name: "客户FAQ", description: "常见客户问题与解答", workspace_id: "ws-003", workspace_name: "运营支持", doc_count: 48, chunk_count: 1560, status: "active", updated_at: "3 天前" },
  { id: "kb-005", name: "设计规范", description: "UI/UX 设计规范与组件库文档", workspace_id: "ws-001", workspace_name: "产品研发", doc_count: 12, chunk_count: 430, status: "active", updated_at: "1 周前" },
  { id: "kb-006", name: "新员工入职", description: "入职培训与公司制度", workspace_id: "ws-004", workspace_name: "人力行政", doc_count: 8, chunk_count: 240, status: "error", updated_at: "2 周前" },
];

export const documents: Document[] = [
  { id: "d-001", title: "RESTful API 设计规范 v3.2", kb_id: "kb-001", kb_name: "API 接口文档", version: 3, status: "ready", chunk_count: 42, file_type: "markdown", size_bytes: 128000, created_at: "2024-08-10", updated_at: "2 小时前" },
  { id: "d-002", title: "用户认证接口文档", kb_id: "kb-001", kb_name: "API 接口文档", version: 2, status: "ready", chunk_count: 28, file_type: "markdown", size_bytes: 85000, created_at: "2024-07-15", updated_at: "5 小时前" },
  { id: "d-003", title: "Q4 产品路线图", kb_id: "kb-002", kb_name: "产品需求库", version: 1, status: "ready", chunk_count: 18, file_type: "pdf", size_bytes: 2400000, created_at: "2024-09-01", updated_at: "昨天" },
  { id: "d-004", title: "微服务架构迁移方案", kb_id: "kb-001", kb_name: "API 接口文档", version: 5, status: "processing", chunk_count: 0, file_type: "docx", size_bytes: 560000, created_at: "2024-06-20", updated_at: "昨天" },
  { id: "d-005", title: "故障排查 Runbook", kb_id: "kb-003", kb_name: "运维手册", version: 2, status: "ready", chunk_count: 35, file_type: "markdown", size_bytes: 96000, created_at: "2024-05-10", updated_at: "3 天前" },
  { id: "d-006", title: "Kubernetes 部署指南", kb_id: "kb-003", kb_name: "运维手册", version: 1, status: "error", chunk_count: 0, file_type: "pdf", size_bytes: 1800000, created_at: "2024-08-25", updated_at: "4 天前" },
  { id: "d-007", title: "支付集成 FAQ", kb_id: "kb-004", kb_name: "客户FAQ", version: 1, status: "ready", chunk_count: 22, file_type: "markdown", size_bytes: 45000, created_at: "2024-07-30", updated_at: "1 周前" },
  { id: "d-008", title: "组件设计规范 2.0", kb_id: "kb-005", kb_name: "设计规范", version: 2, status: "ready", chunk_count: 30, file_type: "pdf", size_bytes: 3200000, created_at: "2024-04-15", updated_at: "2 周前" },
];

export const feedbackItems: FeedbackItem[] = [
  { id: "fb-001", conversation_id: "conv-001", message_id: "msg-002", type: "thumbs_up", comment: "回答准确，引用也很精确", status: "reviewed", created_at: "2024-10-15", user_name: "张敏" },
  { id: "fb-002", conversation_id: "conv-002", message_id: "msg-004", type: "correction", comment: "Token 过期时间应该是 1 小时而非 2 小时", status: "pending", created_at: "2024-10-14", user_name: "王浩" },
  { id: "fb-003", conversation_id: "conv-003", message_id: "msg-006", type: "thumbs_down", comment: "排查步骤缺少日志分析环节", status: "pending", created_at: "2024-10-13", user_name: "陈雪" },
  { id: "fb-004", conversation_id: "conv-004", message_id: "msg-010", type: "flag", comment: "引用的文档已过期，需要更新", status: "resolved", created_at: "2024-10-10", user_name: "赵磊" },
];

export const opsMetrics: OpsMetric[] = [
  { label: "文档总数", value: "139", change: 12, unit: "篇" },
  { label: "知识库数", value: "6", change: 1, unit: "个" },
  { label: "日均查询量", value: "1,284", change: 8.5, unit: "次" },
  { label: "平均响应时间", value: "320", change: -5.2, unit: "ms" },
  { label: "检索准确率", value: "94.2", change: 2.1, unit: "%" },
  { label: "活跃用户", value: "18", change: -2, unit: "人" },
];

// Helper
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
