import { FormDialog, DialogButton } from "@/components/FormDialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  confirmText?: string;
  variant?: "destructive" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onOpenChange, onConfirm, title, message, description, warning, confirmLabel, confirmText, variant = "destructive", loading }: ConfirmDialogProps) {
  const displayMessage = message || description || "";
  const displayLabel = confirmLabel || confirmText || "确认";
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  return (
    <FormDialog open={open} onClose={handleClose} title={title} width="max-w-sm"
      footer={<>
        <DialogButton onClick={handleClose}>取消</DialogButton>
        <DialogButton variant={variant} disabled={loading} onClick={onConfirm}>
          {loading ? "处理中..." : displayLabel}
        </DialogButton>
      </>}>
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-xl ${variant === "destructive" ? "bg-destructive/10" : "bg-warning/10"}`}>
          <AlertTriangle className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : "text-warning"}`} />
        </div>
        <div className="pt-0.5">
          <p className="text-sm text-foreground leading-relaxed">{displayMessage}</p>
          {warning && <p className={`text-[11px] mt-2 font-medium ${variant === "destructive" ? "text-destructive" : "text-warning"}`}>⚠ {warning}</p>}
        </div>
      </div>
    </FormDialog>
  );
}
