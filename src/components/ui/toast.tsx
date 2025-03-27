import React from 'react';
import { X } from 'lucide-react';
import { useToast } from './use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            rounded-lg p-4 shadow-md flex justify-between items-start gap-2 animate-in fade-in slide-in-from-top-5
            ${toast.variant === 'destructive' 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-foreground/90 text-background dark:bg-background dark:text-foreground border border-border'
            }
          `}
          style={{ minWidth: '300px', maxWidth: '500px' }}
        >
          <div className="flex-1">
            {toast.title && <div className="font-semibold">{toast.title}</div>}
            {toast.description && <div className="text-sm mt-1">{toast.description}</div>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
} 