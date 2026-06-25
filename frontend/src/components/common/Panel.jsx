export default function Panel({ title, description, action, children, className = "" }) {
    return (
        <section className={`panel ${className}`.trim()}>
            {(title || description || action) && (
                <div className="panel-head">
                    <div>
                        {title && <h2>{title}</h2>}
                        {description && <p>{description}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
