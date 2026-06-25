import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowUpRight,
    BrainCircuit,
    Briefcase,
    Camera,
    CheckCircle2,
    CircleAlert,
    Compass,
    FileText,
    FolderKanban,
    Send,
    Target,
    X,
} from "lucide-react";

import { useCandidateAuth } from "../../context/CandidateAuthContext.jsx";
import { useActiveResumeId } from "../../context/ResumeContext.jsx";
import Alert from "../common/Alert.jsx";
import { listCandidateApplications } from "../../services/applicationService.js";
import { listJobDescriptions } from "../../services/jobService.js";
import { getParsedResume, listResumes } from "../../services/resumeService.js";
import {
    getCandidateProfilePhotoBlob,
    uploadCandidateProfilePhoto,
    removeCandidateProfilePhoto,
} from "../../services/authService.js";
import {
    categorizedResumeSkills,
    collectResumeSkills,
    normalizeRecords,
} from "../../utils/resumeData.js";
import { initials, trimText } from "../../utils/formatters.js";

/* ─── Field helpers ────────────────────────────────────────────── */
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== "";

function firstValue(record, keys, fallback = "") {
    for (const key of keys) {
        if (hasValue(record?.[key])) return String(record[key]).trim();
    }
    return fallback;
}

const safeUrl = (v) => {
    if (!hasValue(v)) return "";
    const url = String(v).trim();
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

/* ─── Readiness ────────────────────────────────────────────────── */
function computeReadiness(resumeSkills, activeJob) {
    if (!activeJob) return 0;
    const required = activeJob?.parsed_job_data?.required_skills || [];
    if (!required.length) return resumeSkills.length ? 35 : 0;
    const skillSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
    const matched = required.filter((s) => skillSet.has(s.toLowerCase()));
    return Math.round((matched.length / required.length) * 100);
}

/* ─── Sub-components ───────────────────────────────────────────── */

/** Avatar: photo if URL available, else styled initials, with edit camera overlay and dropdown options */
function HubAvatar({ candidate, parsedPersonal, onUploadClick, onRemoveClick }) {
    const photoUrl = parsedPersonal?.photo_url || parsedPersonal?.photo || candidate?.profile_image_url || null;
    const name = candidate?.full_name || "";
    const [showMenu, setShowMenu] = useState(false);
    const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let active = true;
        let objectUrl = null;

        if (!photoUrl) {
            setResolvedPhotoUrl(null);
            return undefined;
        }
        if (photoUrl.startsWith("http") || photoUrl.startsWith("data:")) {
            setResolvedPhotoUrl(photoUrl);
            return undefined;
        }

        getCandidateProfilePhotoBlob(photoUrl)
            .then((blob) => {
                objectUrl = URL.createObjectURL(blob);
                if (active) {
                    setResolvedPhotoUrl(objectUrl);
                } else {
                    URL.revokeObjectURL(objectUrl);
                }
            })
            .catch(() => {
                if (active) setResolvedPhotoUrl(null);
            });

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [photoUrl]);

    return (
        <div className="hub-avatar-container" ref={menuRef}>
            <div className="hub-avatar-wrapper">
                {resolvedPhotoUrl ? (
                    <span className="hub-avatar hub-avatar--photo">
                        <img 
                            src={resolvedPhotoUrl} 
                            alt={name} 
                            onError={(e) => { 
                                e.currentTarget.style.display = "none"; 
                                e.currentTarget.nextSibling.style.display = "grid"; 
                            }} 
                        />
                        <span className="hub-avatar-fallback" style={{ display: "none" }}>{initials(name)}</span>
                    </span>
                ) : (
                    <span className="hub-avatar">{initials(name)}</span>
                )}
                
                <button 
                    type="button" 
                    className="hub-avatar-edit-btn" 
                    onClick={() => setShowMenu(!showMenu)}
                    aria-label="Profile photo options"
                >
                    <Camera size={13} />
                </button>
            </div>

            {showMenu && (
                <div className="hub-photo-menu">
                    <button 
                        type="button" 
                        onClick={() => { 
                            setShowMenu(false); 
                            onUploadClick(); 
                        }}
                    >
                        {photoUrl ? "Replace photo" : "Upload photo"}
                    </button>
                    {photoUrl && (
                        <button 
                            type="button" 
                            className="danger" 
                            onClick={() => { 
                                setShowMenu(false); 
                                onRemoveClick(); 
                            }}
                        >
                            Remove photo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/** All-Skills drawer/modal */
function AllSkillsModal({ categories, onClose }) {
    const backdropRef = useRef(null);
    useEffect(() => {
        const handle = (e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopImmediatePropagation();
            onClose();
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [onClose]);

    return (
        <div
            className="hub-skills-modal-backdrop"
            ref={backdropRef}
            onMouseDown={(e) => {
                e.stopPropagation();
                if (e.target === backdropRef.current) onClose();
            }}
            role="presentation"
        >
            <div className="hub-skills-modal" role="dialog" aria-modal="true" aria-label="All Skills">
                <div className="hub-skills-modal-head">
                    <h3>All Skills</h3>
                    <button className="candidate-hub-close" type="button" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>
                <div className="hub-skills-modal-body">
                    {categories.length === 0 ? (
                        <p className="hub-empty-note">No categorized skills found in your resume.</p>
                    ) : (
                        categories.map(({ label, skills }) => (
                            <div key={label} className="hub-skills-category-group">
                                <h4>{label}</h4>
                                <div className="hub-skills-flex">
                                    {skills.map((skill) => (
                                        <span className="hub-skill-badge" key={skill}>{skill}</span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Main modal ───────────────────────────────────────────────── */

export default function CandidateProfileModal({ open, onClose }) {
    const { candidate, session, setSession } = useCandidateAuth();
    const { activeResumeId } = useActiveResumeId();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parsedResume, setParsedResume] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applicationCount, setApplicationCount] = useState(0);
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
    const [photoError, setPhotoError] = useState("");

    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setPhotoError("");
            const data = await uploadCandidateProfilePhoto(formData);
            if (data.success && data.profile_image_url) {
                setSession({
                    ...session,
                    user: {
                        ...session.user,
                        profile_image_url: data.profile_image_url,
                    },
                });
            }
        } catch (err) {
            setPhotoError(err.message || "Failed to upload profile photo.");
        }
    };

    const handleRemoveClick = async () => {
        try {
            setPhotoError("");
            await removeCandidateProfilePhoto();
            setSession({
                ...session,
                user: {
                    ...session.user,
                    profile_image_url: null,
                },
            });
        } catch (err) {
            setPhotoError(err.message || "Failed to remove profile photo.");
        }
    };

    /* ── Data fetch ── */
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);
        setError(null);

        Promise.all([
            listResumes().catch(() => []),
            listJobDescriptions().catch(() => []),
            listCandidateApplications().catch(() => ({ applications: [] })),
        ]).then(async ([resumeList, jobList, appData]) => {
            if (!active) return;
            setJobs(jobList);
            setApplicationCount((appData.applications || []).length);

            // Use active resume from context, fall back to most recent
            const targetResume =
                resumeList.find((r) => r.id === activeResumeId) || resumeList[0] || null;

            if (targetResume) {
                try {
                    const data = await getParsedResume(targetResume.id);
                    if (active) setParsedResume(data);
                } catch {
                    if (active) setParsedResume(null);
                }
            } else {
                if (active) setParsedResume(null);
            }
        }).catch((err) => {
            if (active) setError(err.message || "Failed to load profile data.");
        }).finally(() => {
            if (active) setLoading(false);
        });

        return () => { active = false; };
    }, [open, activeResumeId]);

    useEffect(() => {
        if (!open) setIsSkillsModalOpen(false);
    }, [open]);

    /* Close on Escape */
    useEffect(() => {
        const handle = (e) => { if (e.key === "Escape" && !isSkillsModalOpen) onClose(); };
        if (open) window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [open, onClose, isSkillsModalOpen]);

    /* ── Derived values ── */
    const parsedData = useMemo(() => parsedResume?.parsed_data || {}, [parsedResume]);

    const personalInfo = useMemo(
        () => parsedData.personal_information || parsedData.contact || {},
        [parsedData],
    );

    const education = useMemo(() => normalizeRecords(parsedData.education)[0] || {}, [parsedData]);

    const experience = useMemo(
        () => normalizeRecords(parsedData.work_experience || parsedData.experience),
        [parsedData],
    );

    // Canonical project field
    const projects = useMemo(
        () => normalizeRecords(
            parsedData.project_details || parsedData.projects || parsedData.project_experience,
        ),
        [parsedData],
    );

    // Active career goal = first saved job description (most recently created first)
    const activeJobId = Number(sessionStorage.getItem("talentsync.matchJobId"));
    const activeJob = useMemo(
        () => jobs.find((j) => j.id === activeJobId) || jobs[0] || null,
        [jobs, activeJobId],
    );

    // Resume headline field
    const resumeHeadline = firstValue(parsedData, [
        "professional_role", "job_title", "headline", "profile_title",
    ]);

    // Professional title priority: active goal > resume headline > "Candidate"
    const professionalTitle = activeJob?.title || resumeHeadline || "Candidate";

    const location = personalInfo.location ||
        personalInfo.address ||
        candidate?.location ||
        "";

    const university = firstValue(education, [
        "university", "institution", "school", "college",
    ]);

    // Profile completion
    const hasResume = Boolean(parsedResume);
    const hasJob = jobs.length > 0;
    const hasApplied = applicationCount > 0;
    const hasParsed = Boolean(parsedResume?.parsed_data);
    const completionSteps = [hasParsed, hasJob, hasApplied, experience.length > 0];
    const completionPct = Math.round((completionSteps.filter(Boolean).length / completionSteps.length) * 100);

    // Skills — flat list and categorized
    const allSkillsFlat = useMemo(() => collectResumeSkills(parsedData), [parsedData]);
    const skillCategories = useMemo(() => categorizedResumeSkills(parsedData), [parsedData]);
    // Keep the modal compact; the complete list remains available in All Skills.
    const TOP_SKILL_LIMIT = 9;
    const topSkills = allSkillsFlat.slice(0, TOP_SKILL_LIMIT);
    const extraSkillsCount = allSkillsFlat.length - TOP_SKILL_LIMIT;

    // Readiness score from skill gap
    const readinessScore = useMemo(
        () => (hasResume ? computeReadiness(allSkillsFlat, activeJob) : 0),
        [hasResume, allSkillsFlat, activeJob],
    );

    // Missing skills for active goal
    const missingSkills = useMemo(() => {
        if (!activeJob) return [];
        const required = activeJob?.parsed_job_data?.required_skills || [];
        const skillSet = new Set(allSkillsFlat.map((s) => s.toLowerCase()));
        return required.filter((s) => !skillSet.has(s.toLowerCase()));
    }, [activeJob, allSkillsFlat]);

    // Featured project — first in project_details (highest ranked / first defined)
    const featuredProject = projects[0] || null;

    if (!open) return null;

    return (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className="profile-modal candidate-hub-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Candidate Profile Hub"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button className="candidate-hub-close" type="button" onClick={onClose} aria-label="Close Profile Hub">
                    <X size={18} />
                </button>

                {loading ? (
                    <div className="candidate-hub-loading">
                        <BrainCircuit size={32} className="spin" />
                        <h3>Loading your profile…</h3>
                        <p>Preparing career snapshot and insights.</p>
                    </div>
                ) : error ? (
                    <div className="candidate-hub-error">
                        <CircleAlert size={32} />
                        <h3>Could not load profile</h3>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="candidate-hub-content">
                        {/* ── HEADER ── */}
                        <header className="candidate-hub-header">
                            <Alert type="error">{photoError}</Alert>
                            <div className="hub-header-profile">
                                <HubAvatar
                                    candidate={candidate}
                                    parsedPersonal={personalInfo}
                                    onUploadClick={handleUploadClick}
                                    onRemoveClick={handleRemoveClick}
                                />

                                <div className="hub-identity">
                                    <h2>{candidate?.full_name || "Candidate"}</h2>
                                    <p className="hub-title">{professionalTitle}</p>
                                    <div className="hub-meta-row">
                                        {university && <span>{university}</span>}
                                        {university && location && <b aria-hidden="true">•</b>}
                                        {location && <span>{location}</span>}
                                    </div>
                                    <p className="hub-email">{candidate?.email}</p>
                                </div>

                                {/* Profile Completion */}
                                <div className="hub-completion-section">
                                    <div className="hub-completion-label">
                                        <span>Profile Completion</span>
                                        <strong>{completionPct}%</strong>
                                    </div>
                                    <div className="hub-completion-bar">
                                        <span style={{ width: `${completionPct}%` }} />
                                    </div>
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </header>

                        <div className="hub-body-layout">
                            {/* ── SECTION 1: CAREER SNAPSHOT ── */}
                            <section className="hub-section" aria-label="Career Snapshot">
                                <div className="hub-cards-grid">
                                    <article className="hub-snapshot-card accent-green">
                                        <Target size={18} />
                                        <div>
                                            <small>Readiness Score</small>
                                            <strong>
                                                {hasResume && activeJob
                                                    ? `${readinessScore}%`
                                                    : hasResume
                                                    ? "Set a goal"
                                                    : "No resume"}
                                            </strong>
                                        </div>
                                    </article>

                                    <article className="hub-snapshot-card accent-blue">
                                        <Briefcase size={18} />
                                        <div>
                                            <small>Active Career Goal</small>
                                            <strong
                                                className="truncate"
                                                title={activeJob ? activeJob.title : "Not set"}
                                            >
                                                {activeJob ? trimText(activeJob.title, 22) : "Not set"}
                                            </strong>
                                        </div>
                                    </article>

                                    <article className="hub-snapshot-card accent-violet">
                                        <FolderKanban size={18} />
                                        <div>
                                            <small>Projects</small>
                                            <strong>{projects.length}</strong>
                                        </div>
                                    </article>

                                    <article className="hub-snapshot-card accent-amber">
                                        <Send size={18} />
                                        <div>
                                            <small>Applications</small>
                                            <strong>{applicationCount}</strong>
                                        </div>
                                    </article>
                                </div>
                            </section>

                            {/* ── SECTION 2: TOP SKILLS ── */}
                            <section className="hub-section">
                                <h3>Top Skills</h3>
                                {topSkills.length > 0 ? (
                                    <div className="hub-skills-flex">
                                        {topSkills.map((skill) => (
                                            <span className="hub-skill-badge" key={skill}>{skill}</span>
                                        ))}
                                        {extraSkillsCount > 0 && (
                                            <button
                                                type="button"
                                                className="hub-skill-badge-more"
                                                onClick={() => setIsSkillsModalOpen(true)}
                                            >
                                                +{extraSkillsCount} more
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="hub-empty-note">
                                        {hasResume
                                            ? "No skills detected. Check your resume has a Skills section."
                                            : "Upload a resume to extract your skills."}
                                    </p>
                                )}
                            </section>

                            {/* ── SECTION 3: FEATURED PROJECT ── */}
                            <section className="hub-section">
                                <h3>Featured Project</h3>
                                {featuredProject ? (
                                    <article className="hub-project-card">
                                        <div className="hub-project-head">
                                            <div>
                                                <h4>
                                                    {firstValue(featuredProject, [
                                                        "project_name", "name", "title",
                                                    ], "Project")}
                                                </h4>
                                                {firstValue(featuredProject, ["status_type", "status", "type"]) && (
                                                    <span className="hub-project-status">
                                                        {firstValue(featuredProject, ["status_type", "status", "type"])}
                                                    </span>
                                                )}
                                            </div>
                                            {firstValue(featuredProject, ["github_link", "url", "link", "github"]) && (
                                                <a
                                                    href={safeUrl(firstValue(featuredProject, ["github_link", "url", "link", "github"]))}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hub-project-link"
                                                >
                                                    GitHub <ArrowUpRight size={14} />
                                                </a>
                                            )}
                                        </div>

                                        <p className="hub-project-desc">
                                            {trimText(
                                                firstValue(featuredProject, ["description", "summary", "overview"]) ||
                                                (Array.isArray(featuredProject.bullet_descriptions)
                                                    ? featuredProject.bullet_descriptions[0]
                                                    : "") ||
                                                "No description available.",
                                                160,
                                            )}
                                        </p>

                                        {Array.isArray(featuredProject.technologies || featuredProject.technologies_used) &&
                                            (featuredProject.technologies || featuredProject.technologies_used).length > 0 && (
                                                <div className="hub-project-tech">
                                                    {(featuredProject.technologies || featuredProject.technologies_used).slice(0, 4).map((tech) => (
                                                        <span className="hub-tech-tag" key={tech}>{tech}</span>
                                                    ))}
                                                    {(featuredProject.technologies || featuredProject.technologies_used).length > 4 && (
                                                        <span className="hub-tech-tag hub-tech-tag-more">
                                                            +{(featuredProject.technologies || featuredProject.technologies_used).length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                    </article>
                                ) : (
                                    <p className="hub-empty-note">
                                        {hasResume
                                            ? "No projects found in your resume."
                                            : "Upload a resume to display your featured project."}
                                    </p>
                                )}
                            </section>

                            {/* ── SECTION 4: CURRENT CAREER GOAL ── */}
                            <section className="hub-section">
                                <h3>Current Career Goal</h3>
                                {activeJob ? (
                                    <article className="hub-goal-card">
                                        <div className="hub-goal-head">
                                            <div>
                                                <h4>{activeJob.title}</h4>
                                                <small>Active target role</small>
                                            </div>
                                            <div className="hub-goal-score">
                                                <span>Readiness</span>
                                                <strong>
                                                    {hasResume ? `${readinessScore}%` : "N/A"}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="hub-goal-gaps">
                                            <h5>Top Skill Gaps</h5>
                                            {!hasResume ? (
                                                <p className="hub-empty-note">Upload your resume to check skill gaps.</p>
                                            ) : missingSkills.length > 0 ? (
                                                <div className="hub-gaps-flex">
                                                    {missingSkills.slice(0, 3).map((skill) => (
                                                        <span className="hub-gap-badge" key={skill}>{skill}</span>
                                                    ))}
                                                    {missingSkills.length > 3 && (
                                                        <span className="hub-gap-badge-more">
                                                            +{missingSkills.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="hub-success-note">
                                                    <CheckCircle2 size={13} />
                                                    {activeJob?.parsed_job_data?.required_skills?.length
                                                        ? "You match all core skills for this goal!"
                                                        : "Set required skills in your Career Goal to see gaps."}
                                                </p>
                                            )}
                                        </div>
                                    </article>
                                ) : (
                                    <p className="hub-empty-note">
                                        No active career goal. Define one in{" "}
                                        <Link to="/candidate/job-description" onClick={onClose} style={{ color: "var(--primary)", fontWeight: 700 }}>
                                            Career Goals
                                        </Link>.
                                    </p>
                                )}
                            </section>

                            {/* ── SECTION 5: QUICK ACTIONS ── */}
                            <section className="hub-section">
                                <h3>Quick Actions</h3>
                                <div className="hub-actions-grid">
                                    <Link className="hub-action-btn color-blue" to="/candidate/resume" onClick={onClose}>
                                        <FileText size={16} />
                                        <span>Resume Intelligence</span>
                                    </Link>
                                    <Link className="hub-action-btn color-purple" to="/candidate/job-description" onClick={onClose}>
                                        <Target size={16} />
                                        <span>Career Goals</span>
                                    </Link>
                                    <Link className="hub-action-btn color-violet" to="/candidate/matching" onClick={onClose}>
                                        <BrainCircuit size={16} />
                                        <span>AI Career Coach</span>
                                    </Link>
                                    <Link className="hub-action-btn color-amber" to="/candidate/applications" onClick={onClose}>
                                        <Compass size={16} />
                                        <span>Application Tracker</span>
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </section>

            {/* All-skills sub-modal */}
            {isSkillsModalOpen && (
                <AllSkillsModal
                    categories={
                        skillCategories.length > 0
                            ? skillCategories
                            : [{ label: "All Skills", skills: allSkillsFlat }]
                    }
                    onClose={() => setIsSkillsModalOpen(false)}
                />
            )}
        </div>
    );
}
