import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  level?: number;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  level = 0,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className={`fixed inset-0 `} style={{ zIndex: 50 + level * 10 }}>
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop: Uses background color with opacity + blur for modern feel */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          style={{ zIndex: 50 + level * 10 }}
        />
        {/* Modal Content: Uses card variables */}
        <div
          className={`relative bg-card text-card-foreground border border-border rounded-xl shadow-lg w-full ${sizeClasses[size]} transform transition-all max-h-[90vh] flex flex-col`}
          style={{ zIndex: 51 + level * 10 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
