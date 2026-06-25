import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, onClose, children, actions }) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
            if (event.key !== "Tab" || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        setTimeout(() => panelRef.current?.querySelector("button, [href], input, select, textarea")?.focus(), 0);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className="job-dialog modal-panel"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                ref={panelRef}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="job-dialog-head">
                    <h2>{title}</h2>
                    <button className="icon-action" type="button" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                {children}
                {actions && <div className="job-dialog-actions">{actions}</div>}
            </section>
        </div>
    );
}
