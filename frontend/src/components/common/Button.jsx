import { LoaderCircle } from "lucide-react";

export default function Button({
    children,
    variant = "primary",
    size,
    loading = false,
    className = "",
    disabled = false,
    ...props
}) {
    const classes = [
        "btn",
        `btn-${variant}`,
        size ? `btn-${size}` : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button {...props} className={classes} disabled={loading || disabled}>
            {loading && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
            {children}
        </button>
    );
}
