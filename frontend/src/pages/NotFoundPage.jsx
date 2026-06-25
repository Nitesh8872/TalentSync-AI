import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <main className="not-found-page">
            <section className="not-found-card">
                <p className="eyebrow">404</p>
                <h1>Page not found</h1>
                <p>The link may be outdated, or the page may have moved.</p>
                <Link className="btn btn-primary" to="/">
                    Go to TalentSync AI
                </Link>
            </section>
        </main>
    );
}
