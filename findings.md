# Findings

## 初始发现
- 待补充

## 接口与缺口对齐（2026-03-08）
- 后端租户管理接口已完整：`/api/tenants`、`/api/tenants/{tenant_id}/members`、邀请/直加/改角色/移除/join，前端尚无独立租户管理页。
- 后端 Ops 还有大量接口前端未接：`ingestion/metrics`、`quotas`、`quotas/alerts`、`retrieval/evaluate*`、`alerts/dispatch`、`compliance/security-baseline`、`sla/public`、`runbook`。
- 后端治理接口中 `retention/cleanup`、`pii/mask` 已存在，前端未接。
- 后端当前不存在真实 MFA/TOTP 流程，仅用户偏好 `security.two_factor_enabled` 字段；登录链路未要求 OTP。
- 现有前端页面路由已齐（9 个业务页），但不是“后端全接口覆盖”。

## 进一步核对（2026-03-08 晚）
- `Chat` 已接 `chatApi.getConversation/updateConversation`，会话重命名与详情接口已有页面调用。
- `Feedback` 已接 `feedbackApi.getReplay` 轮询，回放状态跟踪已落地。
- `OpsCenter` 目前仍未用到 `ingestionMetrics / evaluateRetrieval / createEvalRun / listEvalRuns / getEvalRun / compareEvalRuns / upsertQuotaPolicy / listQuotaPolicies / listQuotaAlerts / dispatchAlert / securityBaseline / publicSLA / runbook`。
- `Governance` 仍仅有“权限中心 + 删除治理”，`retentionCleanup / piiMask` 尚未落页。
- `Settings` 仍是“2FA 偏好开关 + 登录重认证”方案，尚未使用真实 TOTP setup/enable/disable/status 接口。

## 实施后状态（2026-03-08）
- 已新增 `/tenant` 页面，覆盖租户信息编辑、成员邀请、成员直加、角色调整、成员移除与邀请加入。
- `OpsCenter` 已覆盖此前未落地接口：`ingestionMetrics`、`quotas/alerts`、`retrieval evaluate/runs/detail/compare`、`alerts/dispatch`、`securityBaseline`、`publicSLA`、`runbook`。
- `Governance` 已新增“数据保留”和“PII 脱敏”页签，完成 `retentionCleanup`、`piiMask` 页面闭环。
- `Settings` 已升级为真实 TOTP 流程，配合后端 `login -> challenge -> login/mfa` 链路可闭环。
