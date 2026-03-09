import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi, type DeletionRequestData, type DeletionProofData } from "@/lib/api";
import { Trash2, CheckCircle, XCircle, FileCheck, Loader2, AlertTriangle } from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Deletion = () => {
  const qc = useQueryClient();
  const { hasPermission } = useRoleAccess();

  const [showDeleteReq, setShowDeleteReq] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ type: "approve" | "reject" | "execute" | "cancel"; id: string } | null>(null);
  const [showProof, setShowProof] = useState<string | null>(null);
  const [proofData, setProofData] = useState<DeletionProofData | null>(null);

  const [formTarget, setFormTarget] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formTargetType, setFormTargetType] = useState("document");
  const [rejectReason, setRejectReason] = useState("");

  const canCreateDeletionRequest = hasPermission("api.governance.deletion.request.create");
  const canReviewDeletion = hasPermission("api.governance.deletion.request.review");
  const canExecuteDeletion = hasPermission("api.governance.deletion.execute");

  const { data: deletionRequests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["deletion-requests"],
    queryFn: () => governanceApi.listDeletionRequests(),
  });

  const createReqMut = useMutation({
    mutationFn: (data: { resource_type: string; resource_id: string; reason: string }) =>
      governanceApi.createDeletionRequest(data.resource_type, data.resource_id, data.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("删除请求已创建");
      setShowDeleteReq(false);
      setFormTarget("");
      setFormReason("");
      setFormTargetType("document");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const approveReqMut = useMutation({
    mutationFn: (id: string) => governanceApi.approveDeletion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("删除请求已批准");
      setShowConfirm(null);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const rejectReqMut = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      governanceApi.rejectDeletion(data.id, data.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("删除请求已拒绝");
      setShowConfirm(null);
      setRejectReason("");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const cancelReqMut = useMutation({
    mutationFn: (id: string) => governanceApi.cancelDeletion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("删除请求已取消");
      setShowConfirm(null);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const executeReqMut = useMutation({
    mutationFn: (id: string) => governanceApi.executeDeletion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("删除已执行");
      setShowConfirm(null);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const getProofMut = useMutation({
    mutationFn: (id: string) => governanceApi.getDeletionProof(id),
    onSuccess: (data: DeletionProofData) => {
      setProofData(data);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleCreateRequest = () => {
    if (!formTarget.trim() || !formReason.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createReqMut.mutate({
      resource_type: formTargetType,
      resource_id: formTarget,
      reason: formReason,
    });
  };

  const handleApprove = () => {
    if (showConfirm?.type === "approve") {
      approveReqMut.mutate(showConfirm.id);
    }
  };

  const handleReject = () => {
    if (showConfirm?.type === "reject" && rejectReason.trim()) {
      rejectReqMut.mutate({ id: showConfirm.id, reason: rejectReason });
    } else {
      toast.error("请填写拒绝原因");
    }
  };

  const handleExecute = () => {
    if (showConfirm?.type === "execute") {
      executeReqMut.mutate(showConfirm.id);
    }
  };

  const handleCancel = () => {
    if (showConfirm?.type === "cancel") {
      cancelReqMut.mutate(showConfirm.id);
    }
  };

  const handleViewProof = (proofId: string) => {
    setShowProof(proofId);
    getProofMut.mutate(proofId);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              删除治理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理数据删除请求和删除证明
            </p>
          </div>
          {canCreateDeletionRequest && (
            <button
              onClick={() => setShowDeleteReq(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              创建删除请求
            </button>
          )}
        </div>

        {/* Deletion Requests List */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">删除请求列表</h2>
          </div>
          <div className="p-4">
            {reqLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : deletionRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无删除请求
              </div>
            ) : (
              <div className="space-y-2">
                {deletionRequests.map((req: DeletionRequestData) => (
                  <div
                    key={req.request_id}
                    className="flex items-center justify-between p-4 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{req.resource_type}</span>
                        <span className="text-sm text-muted-foreground">
                          {req.resource_id}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        原因：{req.reason}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        请求时间：{new Date(req.requested_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          req.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : req.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : req.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : req.status === "cancelled"
                            ? "bg-gray-100 text-gray-800"
                            : req.status === "expired"
                            ? "bg-orange-100 text-orange-800"
                            : req.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {req.status === "pending"
                          ? "待审批"
                          : req.status === "approved"
                          ? "已批准"
                          : req.status === "rejected"
                          ? "已拒绝"
                          : req.status === "cancelled"
                          ? "已取消"
                          : req.status === "expired"
                          ? "已过期"
                          : req.status === "failed"
                          ? "执行失败"
                          : req.status === "completed"
                          ? "已完成"
                          : req.status}
                      </span>
                      {canReviewDeletion && req.status === "pending" && (
                        <>
                          <button
                            onClick={() => setShowConfirm({ type: "approve", id: req.request_id })}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="批准"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowConfirm({ type: "reject", id: req.request_id })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="拒绝"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {canExecuteDeletion && req.status === "approved" && (
                        <button
                          onClick={() => setShowConfirm({ type: "execute", id: req.request_id })}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          执行删除
                        </button>
                      )}
                      {canCreateDeletionRequest && req.status === "pending" && (
                        <button
                          onClick={() => setShowConfirm({ type: "cancel", id: req.request_id })}
                          className="px-3 py-1 text-sm border rounded hover:bg-muted"
                        >
                          取消请求
                        </button>
                      )}
                      {req.status === "completed" && req.proof_id && (
                        <button
                          onClick={() => handleViewProof(req.proof_id!)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="查看证明"
                        >
                          <FileCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Deletion Request Dialog */}
        <FormDialog
          open={showDeleteReq}
          onOpenChange={setShowDeleteReq}
          title="创建删除请求"
          description="提交数据删除请求，需要管理员审批后执行"
        >
          <FormField label="资源类型">
            <FormSelect
              value={formTargetType}
              onChange={(e) => setFormTargetType(e.target.value)}
            >
              <option value="document">文档</option>
              <option value="conversation">对话</option>
              <option value="user">用户</option>
            </FormSelect>
          </FormField>
          <FormField label="资源 ID">
            <FormInput
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              placeholder="输入资源 ID"
            />
          </FormField>
          <FormField label="删除原因">
            <FormTextarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="说明删除原因..."
              rows={3}
            />
          </FormField>
          <DialogButton
            onClick={handleCreateRequest}
            disabled={createReqMut.isPending}
          >
            {createReqMut.isPending ? "提交中..." : "提交请求"}
          </DialogButton>
        </FormDialog>

        {/* Confirm Dialogs */}
        {showConfirm?.type === "approve" && (
          <ConfirmDialog
            open={true}
            onOpenChange={() => setShowConfirm(null)}
            title="批准删除请求"
            description="确认批准此删除请求？批准后可执行删除操作。"
            onConfirm={handleApprove}
            confirmText="批准"
            loading={approveReqMut.isPending}
          />
        )}

        {showConfirm?.type === "reject" && (
          <FormDialog
            open={true}
            onOpenChange={() => {
              setShowConfirm(null);
              setRejectReason("");
            }}
            title="拒绝删除请求"
            description="请说明拒绝原因"
          >
            <FormField label="拒绝原因">
              <FormTextarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="说明拒绝原因..."
                rows={3}
              />
            </FormField>
            <DialogButton
              onClick={handleReject}
              disabled={rejectReqMut.isPending}
              variant="destructive"
            >
              {rejectReqMut.isPending ? "处理中..." : "确认拒绝"}
            </DialogButton>
          </FormDialog>
        )}

        {showConfirm?.type === "execute" && (
          <ConfirmDialog
            open={true}
            onOpenChange={() => setShowConfirm(null)}
            title="执行删除"
            description="确认执行删除操作？此操作不可撤销！"
            onConfirm={handleExecute}
            confirmText="执行删除"
            variant="destructive"
            loading={executeReqMut.isPending}
          />
        )}

        {showConfirm?.type === "cancel" && (
          <ConfirmDialog
            open={true}
            onOpenChange={() => setShowConfirm(null)}
            title="取消删除请求"
            description="确认取消此删除请求？取消后不能自动恢复。"
            onConfirm={handleCancel}
            confirmText="取消请求"
            loading={cancelReqMut.isPending}
          />
        )}

        {/* Deletion Proof Dialog */}
        {showProof && proofData && (
          <FormDialog
            open={true}
            onOpenChange={() => {
              setShowProof(null);
              setProofData(null);
            }}
            title="删除证明"
            description="数据删除的加密证明"
          >
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">证明 ID：</span>
                <span className="font-mono">{proofData.proof_id}</span>
              </div>
              <div>
                <span className="font-medium">资源类型：</span>
                {proofData.resource_type}
              </div>
              <div>
                <span className="font-medium">资源 ID：</span>
                <span className="font-mono">{proofData.resource_id}</span>
              </div>
              <div>
                <span className="font-medium">删除时间：</span>
                {new Date(proofData.deleted_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">数据哈希：</span>
                <div className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                  {proofData.data_hash}
                </div>
              </div>
              <div>
                <span className="font-medium">证明哈希：</span>
                <div className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                  {proofData.proof_hash}
                </div>
              </div>
            </div>
          </FormDialog>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">重要提示</h3>
              <p className="text-sm text-amber-800">
                删除操作不可撤销，请谨慎操作。所有删除操作都会生成加密证明，用于审计和合规性验证。
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Deletion;
