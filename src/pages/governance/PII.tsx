import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi } from "@/lib/api";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { handleApiError } from "@/lib/error-handler";

const PII = () => {
  const [piiText, setPiiText] = useState("");
  const [piiTypes, setPiiTypes] = useState("email,phone_cn,id_card_cn");
  const [piiMaskedText, setPiiMaskedText] = useState("");

  const maskPiiMut = useMutation({
    mutationFn: (data: { text: string; pii_types?: string[] }) =>
      governanceApi.piiMask(data.text, data.pii_types),
    onSuccess: (data: any) => {
      setPiiMaskedText(data.masked_text || "");
      toast.success("PII 脱敏完成");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleMaskPii = () => {
    if (!piiText.trim()) {
      toast.error("请输入待脱敏文本");
      return;
    }
    const typeAliasMap: Record<string, string> = {
      phone: "phone_cn",
      id_card: "id_card_cn",
    };
    const types = piiTypes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => typeAliasMap[t] || t);
    maskPiiMut.mutate({ text: piiText, pii_types: types.length > 0 ? types : undefined });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            PII 脱敏
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            对文本中的个人身份信息（PII）进行脱敏处理
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">PII 类型（逗号分隔）</label>
            <input
              type="text"
              value={piiTypes}
              onChange={(e) => setPiiTypes(e.target.value)}
              placeholder="email,phone_cn,id_card_cn"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              支持的类型：email（邮箱）、phone_cn（手机号）、id_card_cn（身份证号）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">待脱敏文本</label>
            <textarea
              value={piiText}
              onChange={(e) => setPiiText(e.target.value)}
              placeholder="输入包含 PII 的文本..."
              rows={6}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
            />
          </div>

          <button
            onClick={handleMaskPii}
            disabled={maskPiiMut.isPending}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {maskPiiMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                脱敏中...
              </>
            ) : (
              "执行脱敏"
            )}
          </button>

          {piiMaskedText && (
            <div>
              <label className="block text-sm font-medium mb-2">脱敏结果</label>
              <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                {piiMaskedText}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>邮箱脱敏：保留前2位和域名，中间用 *** 替代</li>
            <li>手机号脱敏：保留前3位和后4位，中间用 **** 替代</li>
            <li>身份证号脱敏：保留前6位和后4位，中间用 ******** 替代</li>
            <li>可以同时指定多种 PII 类型进行脱敏</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default PII;
