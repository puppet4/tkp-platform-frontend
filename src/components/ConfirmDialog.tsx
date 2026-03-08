import { FormDialog, DialogButton } from "@/components/FormDialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  variant?: "destructive" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, warning, confirmLabel = "确认", variant = "destructive", loading }: ConfirmDialogProps) {
  return (
    <FormDialog open={open} onClose={onClose} title={title} width="max-w-sm"
      footer={<>
        <DialogButton onClick={onClose}>取消</DialogButton>
        <DialogButton variant={variant} disabled={loading} onClick={onConfirm}>
          {loading ? "处理中..." : confirmLabel}
        </DialogButton>
      </>}>
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-xl ${variant === "destructive" ? "bg-destructive/10" : "bg-warning/10"}`}>
          <AlertTriangle className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : "text-warning"}`} />
        </div>
        <div className="pt-0.5">
          <p className="text-sm text-foreground leading-relaxed">{message}</p>
          {warning && <p className={`text-[11px] mt-2 font-medium ${variant === "destructive" ? "text-destructive" : "text-warning"}`}>⚠ {warning}</p>}
        </div>
      </div>
    </FormDialog>
  );
}
