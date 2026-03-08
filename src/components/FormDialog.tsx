import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function FormDialog({ open, onClose, title, description, children, footer, width = "max-w-md" }: FormDialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-foreground/15 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`relative bg-card rounded-2xl border border-border shadow-elevated ${width} w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                {description && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{description}</p>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/80 transition-all duration-150 shrink-0 ml-2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 sm:px-6 py-5">
              {children}
            </div>
            {footer && (
              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-border bg-secondary/20 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormField({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export function FormInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
    />
  );
}

export function FormTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200 resize-none"
    />
  );
}

export function FormSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function DialogButton({ children, variant = "default", onClick, disabled }: {
  children: ReactNode; variant?: "default" | "primary" | "destructive"; onClick?: () => void; disabled?: boolean;
}) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
    : variant === "destructive"
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
    : "border border-border text-foreground hover:bg-secondary/80";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${cls}`}
    >
      {children}
    </button>
  );
}
