import {
    ArrowRight,
    BrainCircuit,
    BriefcaseBusiness,
    Check,
    FileSearch,
    Menu,
    Sparkles,
    Upload,
    UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const roleContent = [
    {
        id: "candidate",
        label: "Candidate workspace",
        title: "Turn your experience into opportunity",
        description:
            "Build a structured career profile from your resume and move from discovery to application with confidence.",
        features: [
            "Upload Resume",
            "Resume Parsing",
            "Job Matching",
            "Recommended Jobs",
            "Apply to Jobs",
        ],
        route: "/candidate/register",
        action: "Candidate Portal",
        icon: FileSearch,
    },
    {
        id: "recruiter",
        label: "Recruiter workspace",
        title: "Move from applicants to best-fit talent",
        description:
            "Create roles, review applicants, and prioritize candidates with consistent resume-to-job scoring.",
        features: [
            "Post Jobs",
            "View Applications",
            "Match Candidates",
            "Rank Talent",
            "Shortlist Faster",
        ],
        route: "/recruiter/register",
        action: "Recruiter Portal",
        icon: UsersRound,
    },
];

const flows = [
    {
        label: "Candidate flow",
        steps: ["Register", "Upload Resume", "Parse Resume", "Match Jobs", "Apply"],
    },
    {
        label: "Recruiter flow",
        steps: ["Register", "Post Job", "View Candidates", "Match Profiles", "Shortlist"],
    },
];

export default function LandingPage() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const closeMobileNav = () => setMobileNavOpen(false);

    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="landing-container landing-header-inner">
                    <Link className="landing-brand" to="/">
                        <span className="brand-mark">TS</span>
                        <span>
                            <strong>TalentSync AI</strong>
                            <small>Intelligent hiring workspace</small>
                        </span>
                    </Link>
                    <nav className="landing-nav" aria-label="Main navigation">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#candidate">Candidate</a>
                        <a href="#recruiter">Recruiter</a>
                    </nav>
                    <div className="landing-header-actions">
                        <Link className="landing-login-link" to="/candidate/login">
                            Candidate Login
                        </Link>
                        <Link className="btn btn-primary" to="/recruiter/login">
                            Recruiter Login
                        </Link>
                    </div>
                    <button
                        className="landing-mobile-menu"
                        type="button"
                        aria-label="Toggle navigation"
                        aria-expanded={mobileNavOpen}
                        onClick={() => setMobileNavOpen((open) => !open)}
                    >
                        <Menu size={22} />
                    </button>
                </div>
                {mobileNavOpen && (
                    <nav className="landing-mobile-nav" aria-label="Mobile navigation">
                        <a href="#features" onClick={closeMobileNav}>Features</a>
                        <a href="#how-it-works" onClick={closeMobileNav}>How It Works</a>
                        <a href="#candidate" onClick={closeMobileNav}>Candidate</a>
                        <a href="#recruiter" onClick={closeMobileNav}>Recruiter</a>
                        <Link to="/candidate/login" onClick={closeMobileNav}>Candidate Login</Link>
                        <Link to="/recruiter/login" onClick={closeMobileNav}>Recruiter Login</Link>
                    </nav>
                )}
            </header>

            <main>
                <section className="landing-hero">
                    <img
                        className="landing-hero-image"
                        src="/assets/talentsync-hiring-workspace.png"
                        alt="TalentSync AI resume matching and candidate ranking workspace"
                    />
                    <div className="landing-hero-shade" aria-hidden="true" />
                    <div className="landing-container landing-hero-content">
                        <p className="landing-kicker">
                            <span /> One platform. Two hiring journeys.
                        </p>
                        <h1>AI-Powered Hiring Platform for Candidates and Recruiters</h1>
                        <p className="landing-hero-copy">
                            Upload resumes, parse skills, match jobs, rank candidates,
                            and simplify hiring with intelligent automation.
                        </p>
                        <div className="landing-hero-actions">
                            <Link className="btn landing-btn-candidate" to="/candidate/register">
                                Continue as Candidate <ArrowRight size={17} />
                            </Link>
                            <Link className="btn landing-btn-recruiter" to="/recruiter/register">
                                Continue as Recruiter <ArrowRight size={17} />
                            </Link>
                        </div>
                        <div className="landing-trust-row">
                            <span><FileSearch size={15} /> Resume intelligence</span>
                            <span><BrainCircuit size={15} /> Skills-first matching</span>
                            <span><UsersRound size={15} /> Ranked hiring decisions</span>
                        </div>
                    </div>
                </section>

                <section className="landing-role-section" id="features">
                    <div className="landing-container">
                        <div className="landing-section-heading">
                            <p className="eyebrow">Choose your workspace</p>
                            <h2>Built for both sides of great hiring</h2>
                            <p>
                                Candidates discover stronger opportunities. Recruiters
                                find stronger matches.
                            </p>
                        </div>
                        <div className="landing-role-grid">
                            {roleContent.map((role) => {
                                const Icon = role.icon;
                                return (
                                    <article
                                        className={`landing-role-card landing-role-card-${role.id}`}
                                        id={role.id}
                                        key={role.id}
                                    >
                                        <div className="landing-role-card-head">
                                            <span className="landing-role-marker"><Icon size={17} /></span>
                                            <span className="landing-role-label">{role.label}</span>
                                        </div>
                                        <h3>{role.title}</h3>
                                        <p>{role.description}</p>
                                        <ul>
                                            {role.features.map((feature) => (
                                                <li key={feature}>
                                                    <Check size={16} /> {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <Link className="btn landing-role-button" to={role.route}>
                                            {role.action} <ArrowRight size={17} />
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="landing-process-section" id="how-it-works">
                    <div className="landing-container">
                        <div className="landing-section-heading landing-section-heading-light">
                            <p className="eyebrow">How it works</p>
                            <h2>A clear path from profile to placement</h2>
                            <p>
                                Each workspace follows a focused process powered by the
                                same matching intelligence.
                            </p>
                        </div>
                        {flows.map((flow, flowIndex) => (
                            <div
                                className={`landing-process-flow landing-process-flow-${flowIndex ? "recruiter" : "candidate"}`}
                                key={flow.label}
                            >
                                <strong>{flow.label}</strong>
                                <ol>
                                    {flow.steps.map((step, index) => (
                                        <li key={step}>
                                            <span>{index + 1}</span>
                                            <b>{step}</b>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="landing-final-cta">
                    <div className="landing-container landing-final-inner">
                        <div>
                            <p className="eyebrow">TalentSync AI</p>
                            <h2>Make every match more informed.</h2>
                            <p>
                                Start with the workspace designed for your side of the
                                hiring journey.
                            </p>
                        </div>
                        <div className="landing-final-actions">
                            <Link className="btn landing-btn-candidate" to="/candidate/register">
                                <Upload size={17} /> Join as Candidate
                            </Link>
                            <Link className="btn landing-btn-recruiter" to="/recruiter/register">
                                <BriefcaseBusiness size={17} /> Join as Recruiter
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="landing-container">
                    <span><strong>TalentSync AI</strong> - Intelligent hiring for both sides.</span>
                    <span><Sparkles size={14} /> Built for focused hiring decisions.</span>
                </div>
            </footer>
        </div>
    );
}
