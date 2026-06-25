import { useEffect, useState } from "react";
import { BriefcaseBusiness, Gauge, LogOut, UsersRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import ProfileModal from "../profile/ProfileModal.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";
import { useRecruiterAuth } from "../../context/RecruiterAuthContext.jsx";
import { getRecruiterApplications } from "../../services/recruiterCandidateMatchService.js";
import { listRecruiterJobs } from "../../services/recruiterJobService.js";
import { initials } from "../../utils/formatters.js";

const navigation = [
    { label: "Dashboard", path: "/recruiter/dashboard", icon: Gauge },
    { label: "Job Posting", path: "/recruiter/create-job", icon: BriefcaseBusiness },
    { label: "Candidate Matches", path: "/recruiter/candidate-matches", icon: UsersRound },
];

export default function RecruiterDashboardLayout() {
    const { recruiter, logout } = useRecruiterAuth();
    const navigate = useNavigate();
    const recruiterName =
        recruiter?.recruiter_name ||
        recruiter?.name ||
        recruiter?.email?.split("@")[0];
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileStats, setProfileStats] = useState({
        jobs: "-",
        applications: "-",
        applicantsPerJob: "-",
    });
    const [profileStatsError, setProfileStatsError] = useState("");

    useEffect(() => {
        if (!profileOpen || !recruiter?.id) return;

        setProfileStatsError("");
        Promise.all([
            listRecruiterJobs(recruiter.id),
            getRecruiterApplications(recruiter.id),
        ])
            .then(([jobs, applications]) => {
                const applicationCount = applications.applications?.length || 0;
                setProfileStats({
                    jobs: jobs.length,
                    applications: applicationCount,
                    applicantsPerJob: jobs.length
                        ? Math.round((applicationCount / jobs.length) * 10) / 10
                        : 0,
                });
            })
            .catch((error) => {
                setProfileStats({
                    jobs: "-",
                    applications: "-",
                    applicantsPerJob: "-",
                });
                setProfileStatsError(error.message || "Could not load recruiter stats.");
            });
    }, [profileOpen, recruiter?.id]);

    const handleLogout = () => {
        logout();
        navigate("/recruiter/login", { replace: true });
    };

    return (
        <div className="dashboard-shell recruiter-shell">
            <aside className="sidebar">
                <NavLink className="sidebar-brand" to="/recruiter/dashboard">
                    <span className="brand-mark">TS</span>
                    <span>
                        <strong>TalentSync AI</strong>
                        <small>Recruiter workspace</small>
                    </span>
                </NavLink>
                <nav className="sidebar-nav" aria-label="Recruiter sections">
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
                        <strong>Recruiter workspace</strong>
                        <span>Job management and candidate ranking</span>
                    </div>
                    <div className="topbar-actions">
                        <ThemeToggle />
                        <button
                            className="profile-chip"
                            type="button"
                            onClick={() => setProfileOpen(true)}
                            aria-label="Open recruiter profile"
                        >
                            <span className="avatar">{initials(recruiter?.company_name)}</span>
                            <span>
                                <strong>{recruiter?.company_name}</strong>
                                <small>{recruiter?.email}</small>
                            </span>
                        </button>
                        <button className="icon-action" type="button" onClick={handleLogout} aria-label="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            <ProfileModal
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                avatar={initials(recruiter?.company_name)}
                title={recruiter?.company_name || "Recruiter"}
                subtitle={recruiter?.email}
                error={profileStatsError}
                stats={[
                    { label: "Jobs posted", value: profileStats.jobs },
                    { label: "Applications", value: profileStats.applications },
                    { label: "Apps / job", value: profileStats.applicantsPerJob },
                ]}
                fields={[
                    { label: "Recruiter Name", value: recruiterName },
                    { label: "Email", value: recruiter?.email },
                    { label: "Role", value: "Recruiter" },
                    { label: "Company Name", value: recruiter?.company_name },
                    { label: "Recruiter ID", value: recruiter?.id },
                ]}
            />
        </div>
    );
}
