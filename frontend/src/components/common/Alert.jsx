export default function Alert({ type = "info", children }) {
    if (!children) return null;
    return <div className={`form-alert ${type}`}>{children}</div>;
}
