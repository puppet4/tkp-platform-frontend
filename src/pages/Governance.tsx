import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi, permissionsApi, type DeletionProofData, type PermissionUIManifestData } from "@/lib/api";
import {
  Shield, Trash2, Key, CheckCircle, XCircle, Play,
  FileCheck, Lock, Unlock, AlertTriangle, Camera, History,
  EyeOff, Sparkles, RefreshCw, Loader2
} from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { PageTabs } from "@/components/PageTabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "permissions" | "deletion";

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "待审批", cls: "bg-warning/10 text-warning" },
  approved: { label: "已批准", cls: "bg-info/10 text-info" },
  rejected: { label: "已拒绝", cls: "bg-destructive/10 text-destructive" },
  executed: { label: "已执行", cls: "bg-success/10 text-success" },
};

const Governance = () => {
  const qc = useQueryClient();
  const { uiManifest } = useAuth();
  const [tab, setTab] = useState<Tab>("permissions");
  const [showDeleteReq, setShowDeleteReq] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ type: "approve" | "reject" | "execute"; id: string } | null>(null);
  const [showProof, setShowProof] = useState<string | null>(null);
  const [proofData, setProofData] = useState<DeletionProofData | null>(null);
  const [formTarget, setFormTarget] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formTargetType, setFormTargetType] = useState("document");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // We don't have a "list deletion requests" endpoint in the API spec,
  // so the deletion tab will show create + action buttons.
  // The permissions tab uses the uiManifest from auth context.

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "permissions", label: "权限中心", icon: Key },
    { id: "deletion", label: "删除治理", icon: Trash2 },
  ];

  const createDeletionMutation = useMutation({
    mutationFn: () => governanceApi.createDeletionRequest(formTargetType, formTarget, formReason),
    onSuccess: () => {
      toast.success("删除请求已提交");
      setShowDeleteReq(false);
      setFormTarget("");
      setFormReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => governanceApi.approveDeletion(id),
    onSuccess: () => { toast.success("审批通过"); setShowConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => governanceApi.rejectDeletion(id, reason),
    onSuccess: () => { toast.success("审批拒绝"); setShowConfirm(null); setRejectReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => governanceApi.executeDeletion(id),
    onSuccess: () => { toast.success("删除已执行"); setShowConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchProof = async (proofId: string) => {
    try {
      const data = await governanceApi.getDeletionProof(proofId);
      setProofData(data);
      setShowProof(proofId);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-foreground mb-1">权限与治理</h1>
        <p className="text-sm text-muted-foreground mb-5">管理角色权限、删除审批与合规</p>

        <PageTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} />

        {/* Permissions - based on real uiManifest */}
        {tab === "permissions" && (
          <div className="space-y-4">
            {uiManifest ? (
              <>
                <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground mb-1">当前角色</h3>
                  <p className="text-lg font-bold text-primary">{uiManifest.tenant_role}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">版本: {uiManifest.version}</p>
                </div>

                <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground mb-3">允许的操作 ({uiManifest.allowed_actions.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {uiManifest.allowed_actions.map(action => (
                      <span key={action} className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success font-mono">{action}</span>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: "菜单", items: uiManifest.menus },
                    { title: "按钮", items: uiManifest.buttons },
                    { title: "功能", items: uiManifest.features },
                  ].map(section => (
                    <div key={section.title} className="bg-card rounded-lg border border-border p-5 shadow-xs">
                      <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-2">{section.title}</h4>
                      <div className="space-y-1.5">
                        {section.items.map(item => (
                          <div key={item.code} className="flex items-center justify-between px-3 py-1.5 rounded-md border border-border">
                            <div>
                              <span className="text-sm text-foreground">{item.name}</span>
                              <div className="text-[10px] text-muted-foreground font-mono">{item.code}</div>
                            </div>
                            {item.allowed ? (
                              <Unlock className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-16 gap-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">加载权限信息...</span>
              </div>
            )}
          </div>
        )}

        {/* Deletion Governance */}
        {tab === "deletion" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">删除请求</h2>
              <button onClick={() => setShowDeleteReq(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> 新建删除请求
              </button>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 shadow-xs text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">提交删除请求后，需经管理员审批方可执行</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">审批完成后可通过 API 获取删除证明，确保合规可审计</p>

              <div className="mt-6 max-w-sm mx-auto space-y-2">
                <FormField label="按请求 ID 操作">
                  <div className="flex gap-2">
                    <FormInput value={formTarget} onChange={setFormTarget} placeholder="输入请求 ID (UUID)" />
                  </div>
                </FormField>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    onClick={() => formTarget && setShowConfirm({ type: "approve", id: formTarget })}
                    disabled={!formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 disabled:opacity-30 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3 inline mr-1" />批准
                  </button>
                  <button
                    onClick={() => formTarget && setShowConfirm({ type: "reject", id: formTarget })}
                    disabled={!formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-30 transition-colors"
                  >
                    <XCircle className="h-3 w-3 inline mr-1" />拒绝
                  </button>
                  <button
                    onClick={() => formTarget && setShowConfirm({ type: "execute", id: formTarget })}
                    disabled={!formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 disabled:opacity-30 transition-colors"
                  >
                    <Play className="h-3 w-3 inline mr-1" />执行
                  </button>
                  <button
                    onClick={() => formTarget && fetchProof(formTarget)}
                    disabled={!formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-info/10 text-info hover:bg-info/20 disabled:opacity-30 transition-colors"
                  >
                    <FileCheck className="h-3 w-3 inline mr-1" />查看证明
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Deletion Request */}
      <FormDialog open={showDeleteReq} onClose={() => { setShowDeleteReq(false); setFormTarget(""); setFormReason(""); }} title="新建删除请求" description="提交数据删除申请，需经管理员审批"
        footer={<>
          <DialogButton onClick={() => { setShowDeleteReq(false); setFormTarget(""); setFormReason(""); }}>取消</DialogButton>
          <DialogButton variant="destructive" disabled={!formTarget || !formReason || createDeletionMutation.isPending}
            onClick={() => createDeletionMutation.mutate()}>
            {createDeletionMutation.isPending ? "提交中..." : "提交申请"}
          </DialogButton>
        </>}>
        <FormField label="目标类型" required>
          <FormSelect value={formTargetType} onChange={setFormTargetType} options={[
            { value: "document", label: "文档" }, { value: "knowledge_base", label: "知识库" }, { value: "conversation", label: "对话记录" },
          ]} />
        </FormField>
        <FormField label="资源 ID" required><FormInput value={formTarget} onChange={setFormTarget} placeholder="输入资源 UUID" /></FormField>
        <FormField label="删除原因" required hint="请详细说明删除原因，便于审批人判断">
          <FormTextarea value={formReason} onChange={setFormReason} placeholder="如：文档内容过期且包含敏感信息..." rows={4} />
        </FormField>
      </FormDialog>

      {/* Confirm Dialog */}
      <FormDialog open={!!showConfirm} onClose={() => { setShowConfirm(null); setRejectReason(""); }}
        title={showConfirm?.type === "approve" ? "确认批准" : showConfirm?.type === "reject" ? "确认拒绝" : "确认执行删除"}
        width="max-w-sm"
        footer={<>
          <DialogButton onClick={() => { setShowConfirm(null); setRejectReason(""); }}>取消</DialogButton>
          <DialogButton variant={showConfirm?.type === "reject" ? "destructive" : "primary"}
            disabled={approveMutation.isPending || rejectMutation.isPending || executeMutation.isPending || (showConfirm?.type === "reject" && !rejectReason)}
            onClick={() => {
              if (!showConfirm) return;
              if (showConfirm.type === "approve") approveMutation.mutate(showConfirm.id);
              else if (showConfirm.type === "reject") rejectMutation.mutate({ id: showConfirm.id, reason: rejectReason });
              else executeMutation.mutate(showConfirm.id);
            }}>
            确认
          </DialogButton>
        </>}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${showConfirm?.type === "execute" ? "bg-destructive/10" : "bg-warning/10"}`}>
            <AlertTriangle className={`h-5 w-5 ${showConfirm?.type === "execute" ? "text-destructive" : "text-warning"}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {showConfirm?.type === "approve" && "确定批准此删除请求？批准后可由执行人进行实际删除。"}
              {showConfirm?.type === "reject" && "确定拒绝此删除请求？"}
              {showConfirm?.type === "execute" && "确定执行删除操作？此操作不可撤销。"}
            </p>
            {showConfirm?.type === "reject" && (
              <div className="mt-3">
                <FormTextarea value={rejectReason} onChange={setRejectReason} placeholder="拒绝原因（必填）" rows={2} />
              </div>
            )}
            {showConfirm?.type === "execute" && <p className="text-[11px] text-destructive mt-2 font-medium">⚠ 此操作不可恢复</p>}
          </div>
        </div>
      </FormDialog>

      {/* Proof Viewer */}
      <FormDialog open={!!showProof} onClose={() => { setShowProof(null); setProofData(null); }} title="删除证明" width="max-w-md"
        footer={<DialogButton onClick={() => { setShowProof(null); setProofData(null); }}>关闭</DialogButton>}>
        {proofData ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">证明 ID</div>
              <div className="text-sm font-mono text-foreground mt-0.5">{proofData.proof_id}</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">删除时间</div>
              <div className="text-sm text-foreground mt-0.5">{proofData.deleted_at}</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">执行人</div>
              <div className="text-sm text-foreground mt-0.5">{proofData.executed_by}</div>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">数据已完全删除</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                资源类型: {proofData.resource_type} | 资源 ID: {proofData.resource_id}
              </div>
            </div>
            {proofData.details && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground mb-1">详细信息</div>
                <pre className="text-[11px] text-foreground overflow-auto max-h-40">{JSON.stringify(proofData.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        )}
      </FormDialog>
    </AppLayout>
  );
};

export default Governance;
