import { useState, useCallback, useRef, ReactNode, createContext, useContext } from "react";
import { FormDialog, DialogButton } from "@/components/FormDialog";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "warning";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const handleClose = useCallback(() => {
    setState(null);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    setState(null);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const variant = state?.variant === "primary" ? "primary" : state?.variant === "warning" ? "primary" : "destructive";
  const iconBg = variant === "destructive" ? "bg-destructive/10" : "bg-primary/10";
  const iconColor = variant === "destructive" ? "text-destructive" : "text-primary";
  const Icon = variant === "destructive" ? AlertTriangle : Info;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <FormDialog
        open={!!state?.open}
        onClose={handleClose}
        title={state?.title || "确认操作"}
        width="max-w-sm"
        footer={<>
          <DialogButton onClick={handleClose}>{state?.cancelLabel || "取消"}</DialogButton>
          <DialogButton variant={variant} onClick={handleConfirm}>
            {state?.confirmLabel || "确认"}
          </DialogButton>
        </>}
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="pt-0.5">
            <p className="text-sm text-foreground leading-relaxed">{state?.message}</p>
            {state?.warning && (
              <p className={`text-[11px] mt-2 font-medium ${variant === "destructive" ? "text-destructive" : "text-warning"}`}>
                ⚠ {state.warning}
              </p>
            )}
          </div>
        </div>
      </FormDialog>
    </ConfirmContext.Provider>
  );
}
