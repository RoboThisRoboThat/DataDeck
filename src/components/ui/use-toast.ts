// Simplified toast hook
import { useState } from "react";

type ToastVariant = "default" | "destructive";

interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = ({
        title,
        description,
        variant = "default",
    }: {
        title?: string;
        description?: string;
        variant?: ToastVariant;
    }) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, title, description, variant };

        setToasts((prev) => [...prev, newToast]);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);

        return id;
    };

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return {
        toast,
        dismiss,
        toasts,
    };
} 