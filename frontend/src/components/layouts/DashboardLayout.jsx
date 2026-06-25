import { useState } from "react";
import {
    BrainCircuit,
    BriefcaseBusiness,
    FileSearch,
    Gauge,
    KanbanSquare,
    LogOut,
    Target,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import CandidateProfileModal from "../profile/CandidateProfileModal.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";
import { ApplicationProvider } from "../../context/ApplicationContext.jsx";
import { useCandidateAuth } from "../../context/CandidateAuthContext.jsx";
import { initials } from "../../utils/formatters.js";

const navigation = [
    { label: "Dashboard", path: "/candidate/dashboard", icon: Gauge },
    { label: "Resume Intelligence", path: "/candidate/resume", icon: FileSearch },
    { label: "Career Goals", path: "/candidate/job-description", icon: Target },
    { label: "Job Discovery", path: "/candidate/browse-jobs", icon: BriefcaseBusiness },
    { label: "AI Career Coach", path: "/candidate/matching", icon: BrainCircuit },
    { label: "Application Tracker", path: "/candidate/applications", icon: KanbanSquare },
];

export default function DashboardLayout() {
    const { candidate, logout } = useCandidateAuth();
    const navigate = useNavigate();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/candidate/login", { replace: true });
    };

    return (
        <div className="dashboard-shell">
            <aside className="sidebar">
                <NavLink className="sidebar-brand" to="/candidate/dashboard">
                    <span className="brand-mark">TS</span>
                    <span>
                        <strong>TalentSync AI</strong>
                        <small>Candidate workspace</small>
                    </span>
                </NavLink>
                <nav className="sidebar-nav" aria-label="Candidate sections">
                    {navigation.map(({ label, path, icon: Icon }) => (
                        <NavLink
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "active" : ""}`
                            }
                            key={path}
                            to={path}
                        >
                            <Icon size={17} aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="workspace">
                <header className="topbar">
                    <div className="topbar-title">
                        <strong>Candidate Workspace</strong>
                        <span>Resume Intelligence · Career Goal · Job Discovery · AI Career Coach · Application Tracker</span>
                    </div>
                    <div className="topbar-actions">
                        <ThemeToggle />
                        <button
                            className="profile-chip"
                            type="button"
                            onClick={() => setIsProfileModalOpen(true)}
                            aria-label="Open candidate profile"
                        >
                            <span className="avatar">{initials(candidate?.full_name)}</span>
                            <span>
                                <strong>{candidate?.full_name}</strong>
                                <small>{candidate?.email}</small>
                            </span>
                        </button>
                        <button className="icon-action" type="button" onClick={handleLogout} aria-label="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>
                <main className="content-area">
                    <ApplicationProvider>
                        <Outlet />
                    </ApplicationProvider>
                </main>
            </div>
            <CandidateProfileModal
                open={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}
