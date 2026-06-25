import { ArrowLeft, BriefcaseBusiness, FileSearch } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthLayout({ eyebrow, title, description, children }) {
    const isRecruiter = /recruiter/i.test(`${eyebrow} ${title}`);
    const RoleIcon = isRecruiter ? BriefcaseBusiness : FileSearch;
    const roleCopy = isRecruiter
        ? "Publish roles, review applicants, and prioritize candidates with structured match intelligence."
        : "Upload resumes, parse strengths, discover jobs, and get practical AI feedback from one workspace.";

    return (
        <main className="auth-page">
            <section className="auth-card">
                <div className="auth-aside">
                    <span className="brand-mark"><RoleIcon size={22} /></span>
                    <h1>TalentSync AI</h1>
                    <p>{roleCopy}</p>
                    <Link className="auth-home-link" to="/">
                        <ArrowLeft size={16} /> Back to home
                    </Link>
                </div>
                <div className="auth-form-column">
                    <div>
                        <p className="eyebrow">{eyebrow}</p>
                        <h2>{title}</h2>
                        {description && <p className="auth-description">{description}</p>}
                    </div>
                    {children}
                </div>
            </section>
        </main>
    );
}
