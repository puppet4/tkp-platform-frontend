# Progress

- 2026-03-08: 开始处理“完善 1/2/3/4”任务，已创建本轮计划文件。
- 2026-03-08: 完成现状梳理，确认 1/2/3 为前端漏接，4 需要后端新增 TOTP/MFA 登录能力。
- 2026-03-08: 复核当前代码后确认 Chat/Feedback 相关接口已接入，本轮主目标聚焦 tenant 页面、Ops 扩展、Governance retention+PII、Settings 真 MFA。
- 2026-03-08: 回归 `services/api/tests/test_auth_mfa_totp.py`，发现启用 TOTP 后立即二次登录会触发 `MFA_CODE_INVALID`（同一时间片重放被拒），需调整 `enable` 阶段计数器写入策略。
- 2026-03-08: 已修复后端 MFA 计数器逻辑并通过 `services/api/tests/test_auth_mfa_totp.py`（2/2）。
- 2026-03-08: 新增前端 `TenantAdmin` 页面并接入路由 `/tenant`、侧边栏入口与权限映射。
- 2026-03-08: 扩展 `OpsCenter`，接入 `ingestionMetrics / quotas / retrieval evaluate runs+compare / dispatch / securityBaseline / publicSLA / runbook`。
- 2026-03-08: 扩展 `Governance` 页，新增“数据保留”和“PII 脱敏”能力，调用 `retentionCleanup` 与 `piiMask`。
- 2026-03-08: 重写 `Settings` 安全页为真实 TOTP 流程（status/setup/enable/disable + backup codes）。
- 2026-03-08: 前端测试与构建通过：`npm test`、`npm run build`。
