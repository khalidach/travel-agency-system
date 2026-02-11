// frontend/src/components/modals/ConfirmationModal.tsx
import { AlertTriangle } from "lucide-react";
import Modal from "../Modal";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" level={2}>
      <div className="sm:flex sm:items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 sm:mx-0 sm:h-10 sm:w-10">
          <AlertTriangle
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          />
        </div>
        <div
          className={`mt-3 text-center sm:mt-0 ${
            document.documentElement.dir === "rtl"
              ? "sm:text-right sm:mr-4"
              : "sm:text-left sm:ml-4"
          }`}
        >
          <h3
            className="text-lg leading-6 font-medium text-foreground"
            id="modal-title"
          >
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        <button
          type="button"
          className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-destructive text-destructive-foreground text-base font-medium hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive sm:w-auto sm:text-sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
        <button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-lg border border-border shadow-sm px-4 py-2 bg-card text-base font-medium text-card-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:mt-0 sm:w-auto sm:text-sm"
          onClick={onClose}
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
}
