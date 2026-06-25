import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function ProfileModal({
    open,
    onClose,
    avatar,
    title,
    subtitle,
    fields = [],
    stats = [],
    error = "",
}) {
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
        setTimeout(() => panelRef.current?.querySelector("button")?.focus(), 0);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className="profile-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                ref={panelRef}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="profile-modal-head">
                    <div className="profile-modal-identity">
                        <span className="profile-modal-avatar">{avatar}</span>
                        <div>
                            <p className="eyebrow">Profile</p>
                            <h2>{title}</h2>
                            <span>{subtitle}</span>
                        </div>
                    </div>
                    <button className="icon-action" type="button" onClick={onClose} aria-label="Close profile">
                        <X size={18} />
                    </button>
                </div>

                {error && <p className="profile-modal-error">{error}</p>}

                <div className="profile-stat-grid">
                    {stats.map(({ label, value }) => (
                        <div className="profile-stat" key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>

                <dl className="profile-detail-grid">
                    {fields.map(({ label, value }) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value || "Not available"}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </div>
    );
}
