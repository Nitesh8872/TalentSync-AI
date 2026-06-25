import { useEffect, useMemo, useState, useRef } from "react";
import {
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Compass,
    FileSearch,
    MapPin,
    PencilLine,
    Plus,
    Save,
    Sparkles,
    Target,
    Trash2,
    TrendingUp,
    AlertCircle
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import Modal from "../../../components/common/Modal.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import { useActiveResumeId } from "../../../context/ResumeContext.jsx";
import { createJobDescription, deleteCareerGoal, listJobDescriptions } from "../../../services/jobService.js";
import { collectResumeSkills, normalizeRecords } from "../../../utils/resumeData.js";
import { formatDate, trimText } from "../../../utils/formatters.js";

const emptyForm = {
    title: "",
    experienceLevel: "",
    location: "",
    salary: "",
    skills: "",
    description: "",
};

const splitSkills = (value) => [...new Map(
    String(value || "")
        .split(/[,;\n|]/)
        .map((skill) => skill.trim())
        .filter(Boolean)
        .map((skill) => [skill.toLowerCase(), skill]),
).values()];

const jobSkills = (job) => job?.parsed_job_data?.required_skills || [];
const ACTIVE_GOAL_EVENT = "talentsync:active-goal-changed";

const experienceLabel = (job) => {
    const years = job?.parsed_job_data?.experience_required;
    if (years === null || years === undefined) return "Not specified";
    if (years <= 1) return "Entry level";
    if (years <= 4) return "Mid level";
    return "Senior level";
};

const extractLine = (description, label) => {
    const match = String(description || "").match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return match?.[1]?.trim() || "";
};

function buildDescription(form) {
    const preferences = [
        form.experienceLevel && `Experience level: ${form.experienceLevel}`,
        form.location && `Preferred location: ${form.location}`,
        form.salary && `Salary expectation: ${form.salary}`,
        form.skills && `Required skills: ${splitSkills(form.skills).join(", ")}`,
    ].filter(Boolean);
    return [...preferences, "", form.description.trim()].filter((line, index, all) => line || (index > 0 && all[index - 1])).join("\n").trim();
}

function ReadinessRing({ score, size = "large" }) {
    const angle = Number(score || 0) * 3.6;
    return (
        <span className={`career-readiness-ring ${size}`} style={{ "--readiness": `${angle}deg` }}>
            <span><strong>{score || 0}%</strong>{size === "large" && <small>ready</small>}</span>
        </span>
    );
}

function SummaryCard({ icon: Icon, label, value, note, tone }) {
    return (
        <article className={`career-summary-card ${tone || ""}`}>
            <span className="career-summary-icon"><Icon size={20} /></span>
            <div><span>{label}</span><strong title={String(value)}>{value}</strong><small>{note}</small></div>
        </article>
    );
}

export default function JobDescriptionPage() {
    const navigate = useNavigate();
    const desiredRoleInputRef = useRef(null);
    const [form, setForm] = useState(emptyForm);
    const [jobs, setJobs] = useState([]);
    const { latestResume, loadingLatestResume, resumeError } = useActiveResumeId();
    const resumes = latestResume ? [latestResume] : [];
    const resumeSkills = useMemo(() => collectResumeSkills(latestResume?.parsed_data || {}), [latestResume]);
    const resumeExperience = useMemo(() => normalizeRecords(latestResume?.parsed_data?.work_experience || latestResume?.experience), [latestResume]);
    const resumeProjects = useMemo(() => normalizeRecords(latestResume?.parsed_data?.project_details || latestResume?.projects), [latestResume]);
    const [selectedJobId, setSelectedJobId] = useState(() => Number(sessionStorage.getItem("talentsync.matchJobId")) || null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadJobs = async () => {
        try {
            const data = await listJobDescriptions();
            setJobs(data);
            const active = data.find((job) => job.id === selectedJobId) || data[0] || null;
            if (active && active.id !== selectedJobId) {
                setSelectedJobId(active.id);
                sessionStorage.setItem("talentsync.matchJobId", String(active.id));
            } else if (!active) {
                setSelectedJobId(null);
                sessionStorage.removeItem("talentsync.matchJobId");
            }
            return data;
        } catch (error) {
            setMessage({ type: "error", text: error.message });
            return [];
        } finally {
            setLoadingJobs(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedJob = useMemo(() => {
        return jobs.find((job) => job.id === selectedJobId) || jobs[0];
    }, [jobs, selectedJobId]);

    // When selecting a new job, load its data into the form for active visualization
    useEffect(() => {
        if (selectedJob && !form.title) {
            loadJobIntoForm(selectedJob);
        }
    }, [selectedJob]); // eslint-disable-line react-hooks/exhaustive-deps

    const requiredSkills = useMemo(
        () => splitSkills(form.skills).length ? splitSkills(form.skills) : jobSkills(selectedJob),
        [form.skills, selectedJob],
    );

    const resumeSkillSet = useMemo(() => new Set(resumeSkills.map((skill) => skill.toLowerCase())), [resumeSkills]);
    const matchingSkills = useMemo(() => requiredSkills.filter((skill) => resumeSkillSet.has(skill.toLowerCase())), [requiredSkills, resumeSkillSet]);
    const missingSkills = useMemo(() => requiredSkills.filter((skill) => !resumeSkillSet.has(skill.toLowerCase())), [requiredSkills, resumeSkillSet]);
    
    const readiness = useMemo(() => {
        if (resumes.length === 0) return 0;
        const skillAlignment = requiredSkills.length ? matchingSkills.length / requiredSkills.length : (resumeSkills.length ? 0.5 : 0);
        return Math.round((skillAlignment * 70) + (resumeExperience.length ? 15 : 0) + (resumeProjects.length ? 15 : 0));
    }, [resumes.length, requiredSkills.length, matchingSkills.length, resumeSkills.length, resumeExperience.length, resumeProjects.length]);

    const activeRole = form.title || selectedJob?.title || "Choose a role";
    const activeExperience = form.experienceLevel || experienceLabel(selectedJob);

    // Calculate dynamic matching state values
    const statusText = useMemo(() => {
        if (resumes.length === 0) return "No Resume Uploaded";
        if (readiness >= 80) return "Strong Match";
        if (readiness >= 50) return "Good Progress";
        return "Room to Grow";
    }, [readiness, resumes.length]);

    const statusBadgeClass = useMemo(() => {
        if (resumes.length === 0) return "room-to-grow";
        return statusText.toLowerCase().replace(" ", "-");
    }, [statusText, resumes.length]);

    const matchingExperienceText = useMemo(() => {
        if (resumes.length === 0) return "N/A";
        const level = activeExperience.toLowerCase();
        if (level.includes("entry")) return "Fully Matched";
        if (level.includes("mid")) return "Aligned";
        if (level.includes("senior") || level.includes("lead")) return "Growth Opportunity";
        return "Aligned";
    }, [activeExperience, resumes.length]);

    const strengths = useMemo(() => {
        if (resumes.length === 0) return ["Resume not uploaded."];
        const list = [];
        if (matchingSkills.length > 0) {
            list.push(`Strong skills matched: ${matchingSkills.slice(0, 2).join(", ")}`);
        } else {
            list.push("Foundational matching credentials found.");
        }
        if (activeExperience.toLowerCase().includes("entry") || activeExperience.toLowerCase().includes("mid")) {
            list.push("Experience level is a solid alignment.");
        } else {
            list.push("Portfolio details show good baseline coverage.");
        }
        return list;
    }, [matchingSkills, activeExperience, resumes.length]);

    const gaps = useMemo(() => {
        if (resumes.length === 0) return ["Please upload your resume to identify skill gaps."];
        const list = [];
        if (missingSkills.length > 0) {
            list.push(`Missing core skills: ${missingSkills.slice(0, 2).join(", ")}`);
        }
        list.push(`Optimize resume keywords for target role: ${activeRole}`);
        return list;
    }, [missingSkills, activeRole, resumes.length]);

    const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

    const loadJobIntoForm = (job) => {
        if (!job) return;
        const cleanDesc = job.description
            .replace(/^(Experience level|Preferred location|Salary expectation|Required skills):.*$/gim, "")
            .trim();
            
        setForm({
            title: job.title || "",
            experienceLevel: extractLine(job.description, "Experience level") || "",
            location: extractLine(job.description, "Preferred location") || "",
            salary: extractLine(job.description, "Salary expectation") || "",
            skills: extractLine(job.description, "Required skills") || "",
            description: cleanDesc,
        });
    };

    const handleAddNewGoal = () => {
        setForm(emptyForm);
        setSelectedJobId(null);
        setMessage(null);
        setTimeout(() => {
            desiredRoleInputRef.current?.focus();
        }, 100);
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const previousIds = new Set(jobs.map((job) => job.id));
            const data = await createJobDescription({
                title: form.title.trim(),
                description: buildDescription(form),
            });
            setMessage({ type: "success", text: data.message ? "Career goal analyzed and saved." : "Career goal saved." });
            const updatedJobs = await loadJobs();
            const savedGoal = updatedJobs.find((job) => !previousIds.has(job.id) && job.title === form.title.trim())
                || updatedJobs.find((job) => job.title === form.title.trim())
                || updatedJobs[0];
            if (savedGoal?.id) {
                setSelectedJobId(savedGoal.id);
                sessionStorage.setItem("talentsync.matchJobId", String(savedGoal.id));
                window.dispatchEvent(new CustomEvent(ACTIVE_GOAL_EVENT, { detail: { jobId: savedGoal.id } }));
                loadJobIntoForm(savedGoal);
            }
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const chooseTarget = (jobId) => {
        setSelectedJobId(jobId);
        sessionStorage.setItem("talentsync.matchJobId", String(jobId));
        window.dispatchEvent(new CustomEvent(ACTIVE_GOAL_EVENT, { detail: { jobId } }));
        const target = jobs.find(j => j.id === jobId);
        if (target) {
            loadJobIntoForm(target);
        }
    };

    const compareResume = (jobId = selectedJobId) => {
        if (jobId) sessionStorage.setItem("talentsync.matchJobId", String(jobId));
        navigate("/candidate/matching");
    };

    const confirmDeleteGoal = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setMessage(null);
        try {
            await deleteCareerGoal(deleteTarget.id);
            const remaining = jobs.filter((job) => job.id !== deleteTarget.id);
            setJobs(remaining);

            if (selectedJobId === deleteTarget.id) {
                const nextGoal = remaining[0] || null;
                setSelectedJobId(nextGoal?.id || null);
                if (nextGoal) {
                    sessionStorage.setItem("talentsync.matchJobId", String(nextGoal.id));
                    window.dispatchEvent(new CustomEvent(ACTIVE_GOAL_EVENT, { detail: { jobId: nextGoal.id } }));
                    loadJobIntoForm(nextGoal);
                } else {
                    sessionStorage.removeItem("talentsync.matchJobId");
                    window.dispatchEvent(new CustomEvent(ACTIVE_GOAL_EVENT, { detail: { jobId: null } }));
                    setForm(emptyForm);
                }
            }

            setDeleteTarget(null);
            setMessage({ type: "success", text: "Career goal deleted." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="career-target-page">
            <header className="career-page-header">
                <div>
                    <p className="eyebrow"><Compass size={14} /> Career planning</p>
                    <h1>Career Goal Center</h1>
                    <p>Define your target role. TalentSync will compare your resume against that role and calculate readiness.</p>
                </div>
                <Button type="button" onClick={handleAddNewGoal}>
                    <Plus size={17} /> Add Career Goal
                </Button>
            </header>

            {(loadingLatestResume || resumes.length === 0) && (
                <Alert type="warning">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} />
                        <span>
                            {loadingLatestResume ? "Loading latest resume..." : resumeError === "Resume parsing failed" ? "Resume parsing failed. Please upload resume." : "Upload your resume first to unlock AI matching."}
                            <Link to="/candidate/resume" style={{ marginLeft: '6px', textDecoration: 'underline', fontWeight: 700 }}>
                                Open Resume Intelligence ➔
                            </Link>
                        </span>
                    </span>
                </Alert>
            )}

            <Alert type={message?.type}>{message?.text}</Alert>

            <Modal
                open={Boolean(deleteTarget)}
                title="Delete this career goal?"
                onClose={() => !deleting && setDeleteTarget(null)}
                actions={(
                    <>
                        <Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button type="button" className="delete-goal-confirm" loading={deleting} onClick={confirmDeleteGoal}><Trash2 size={16} /> Delete Goal</Button>
                    </>
                )}
            >
                <p className="delete-goal-copy">This will remove this saved goal and its readiness preview.</p>
            </Modal>

            {/* SECTION: Overview Cards */}
            <section className="career-summary-grid" aria-label="Current career goal summary">
                <SummaryCard icon={Target} label="Active Goal" value={activeRole} note={activeExperience} tone="role" />
                <SummaryCard icon={CheckCircle2} label="Required Skills" value={requiredSkills.length} note="In target goal" tone="required" />
                <SummaryCard icon={CircleAlert} label="Missing Skills" value={resumes.length === 0 ? "N/A" : missingSkills.length} note={resumes.length === 0 ? "Upload resume" : "To close gaps"} tone="missing" />
                <SummaryCard icon={TrendingUp} label="Readiness Score" value={resumes.length === 0 ? "N/A" : `${readiness}%`} note={resumes.length === 0 ? "No resume" : (readiness >= 70 ? "Strong alignment" : "Room to grow")} tone="readiness" />
            </section>

            <div className="career-builder-grid">
                {/* LEFT: Career Goal Builder */}
                <section className="career-card target-builder-card" id="target-role-builder">
                    <div className="career-section-head">
                        <span><PencilLine size={19} /></span>
                        <div><p>Goal Builder</p><h2>Define Your Career Goal</h2></div>
                    </div>
                    <p className="career-section-copy">
                        Paste a real job description or describe the role you want. This creates a private career goal for AI Career Coach analysis, not a recruiter-posted job.
                    </p>
                    <form className="career-target-form" onSubmit={submit}>
                        <div className="career-form-grid">
                            <label>
                                Desired role <span>Required</span>
                                <input 
                                    className="field" 
                                    ref={desiredRoleInputRef}
                                    value={form.title} 
                                    onChange={(event) => updateField("title", event.target.value)} 
                                    placeholder="e.g. Senior Product Designer" 
                                    required 
                                />
                            </label>
                            <label>
                                Experience level
                                <select className="field" value={form.experienceLevel} onChange={(event) => updateField("experienceLevel", event.target.value)}>
                                    <option value="">Select a level</option>
                                    <option>Entry level (0–1 years)</option>
                                    <option>Mid level (2–4 years)</option>
                                    <option>Senior level (5+ years)</option>
                                    <option>Lead / Manager (7+ years)</option>
                                </select>
                            </label>
                            <label>
                                Preferred location
                                <div className="career-input-icon">
                                    <MapPin size={16} />
                                    <input className="field" value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Remote, Bengaluru, Mumbai…" />
                                </div>
                            </label>
                            <label>
                                Expected salary <span>Optional</span>
                                <input className="field" value={form.salary} onChange={(event) => updateField("salary", event.target.value)} placeholder="e.g. ₹18–24 LPA" />
                            </label>
                        </div>
                        <label>
                            Skills you want to target <span>Separate with commas</span>
                            <input className="field" value={form.skills} onChange={(event) => updateField("skills", event.target.value)} placeholder="React, TypeScript, Product Strategy, Figma" />
                        </label>
                        {splitSkills(form.skills).length > 0 && <SkillTags skills={splitSkills(form.skills)} />}
                        <label>
                            Target Job Description / Sample JD <span>Required</span>
                            <textarea className="field" rows="7" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Paste the responsibilities, outcomes, and qualifications of your target role..." required />
                        </label>
                        <div className="career-form-footer">
                            <p><Sparkles size={14} /> Compare this goal description against your resume.</p>
                            <Button type="submit" loading={loading}><Save size={16} /> Analyze My Readiness</Button>
                        </div>
                    </form>
                </section>

                {/* RIGHT: Resume Readiness Score */}
                <aside className="career-card readiness-preview-card">
                    <div className="readiness-preview-head">
                        <div><p>Resume Readiness</p><h2>Readiness Summary</h2></div>
                        <ReadinessRing score={readiness} />
                    </div>
                    
                    <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
                        <span className={`readiness-status-badge ${statusBadgeClass}`}>
                            {statusText}
                        </span>
                    </div>

                    <div className="readiness-progress"><span style={{ width: `${readiness}%` }} /></div>

                    {resumes.length === 0 ? (
                        <p className="readiness-message" style={{ color: 'var(--danger)' }}>
                            Upload your resume first to calculate readiness and identify skill gaps.
                        </p>
                    ) : (
                        <p className="readiness-message">
                            {readiness >= 70 
                                ? "Your resume demonstrates strong alignment for this goal." 
                                : "There are key areas where optimizing your resume or skills can boost readiness."
                            }
                        </p>
                    )}

                    <div className="readiness-breakdown-list">
                        <div className="readiness-breakdown-item">
                            <span>Skills Match</span>
                            <span className={resumes.length === 0 ? "" : (matchingSkills.length === requiredSkills.length ? "matched" : "partial")}>
                                {resumes.length === 0 ? "N/A" : `${matchingSkills.length} / ${requiredSkills.length}`}
                            </span>
                        </div>
                        <div className="readiness-breakdown-item">
                            <span>Experience Match</span>
                            <span>{matchingExperienceText}</span>
                        </div>
                        <div className="readiness-breakdown-item">
                            <span>Project Relevance</span>
                            <span className={resumes.length === 0 ? "" : "matched"}>
                                {resumes.length === 0 ? "N/A" : (readiness >= 65 ? "High Match" : "Moderate")}
                            </span>
                        </div>
                        <div className="readiness-breakdown-item">
                            <span>Required Skill Coverage</span>
                            <span className={resumes.length === 0 ? "" : "matched"}>
                                {resumes.length === 0 ? "N/A" : (requiredSkills.length ? `${Math.round((matchingSkills.length / requiredSkills.length) * 100)}%` : "No skills set")}
                            </span>
                        </div>
                        <div className="readiness-breakdown-item">
                            <span>Education Match</span>
                            <span className={resumes.length === 0 ? "" : "matched"}>
                                {resumes.length === 0 ? "N/A" : "Aligned"}
                            </span>
                        </div>
                    </div>

                    <div className="readiness-highlights">
                        <div className="readiness-highlight-group strengths">
                            <h4>Strengths</h4>
                            <ul>
                                {strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                            </ul>
                        </div>
                        <div className="readiness-highlight-group gaps">
                            <h4>Top Gaps</h4>
                            <ul>
                                {gaps.map((gap, idx) => <li key={idx}>{gap}</li>)}
                            </ul>
                        </div>
                    </div>

                    <Button 
                        type="button" 
                        variant="secondary" 
                        disabled={!selectedJob || resumes.length === 0} 
                        onClick={() => compareResume()}
                    >
                        <FileSearch size={16} /> View Full Readiness Report
                    </Button>
                </aside>
            </div>

            {/* SECTION: Saved Career Goals */}
            <section className="career-targets-section">
                <div className="career-targets-head">
                    <div><p className="eyebrow">Your Pipeline</p><h2>Saved Career Goals</h2><p>Track multiple dream roles and choose which one to build toward.</p></div>
                    <span>{jobs.length} {jobs.length === 1 ? "goal" : "goals"}</span>
                </div>
                {loadingJobs && <p className="career-empty-state">Loading saved goals…</p>}
                {!loadingJobs && !jobs.length && (
                    <div className="career-empty-state"><Target size={24} /><strong>No career goals defined yet</strong><span>Define a goal above to analyze readiness and identify skill gaps.</span></div>
                )}
                
                <div className="career-target-card-grid">
                    {jobs.map((job) => {
                        const skills = jobSkills(job);
                        const matched = skills.filter((skill) => resumeSkillSet.has(skill.toLowerCase()));
                        const score = resumes.length === 0 ? 0 : (skills.length ? Math.round((matched.length / skills.length) * 100) : 0);
                        const location = extractLine(job.description, "Preferred location") || "Not specified";
                        const experience = extractLine(job.description, "Experience level") || "Not specified";
                        
                        return (
                            <article className={`career-target-card ${selectedJobId === job.id ? "active" : ""}`} key={job.id}>
                                <div className="target-card-top">
                                    <span className="target-role-icon"><BriefcaseBusiness size={20} /></span>
                                    <div className="target-card-controls">
                                        {resumes.length > 0 && <ReadinessRing score={score} size="small" />}
                                        <button className="target-delete-button" type="button" aria-label={`Delete ${job.title}`} title="Delete goal" onClick={() => setDeleteTarget(job)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                                <h3>{job.title}</h3>
                                <p style={{ fontSize: '0.78rem', color: 'var(--career-muted)', margin: '8px 0 0' }}>
                                    {trimText(job.description.replace(/^(Experience level|Preferred location|Salary expectation|Required skills):.*$/gim, "").trim(), 110)}
                                </p>
                                <div className="target-card-meta">
                                    <span><BarChart3 size={14} /> {experience}</span>
                                    <span><MapPin size={14} /> {location}</span>
                                </div>
                                <SkillTags skills={skills.slice(0, 4)} emptyText="No skills specified." />
                                <div className="target-card-footer">
                                    <small>Updated {formatDate(job.created_at)}</small>
                                    <button 
                                        type="button" 
                                        onClick={() => chooseTarget(job.id)}
                                        style={{ color: selectedJobId === job.id ? 'var(--primary)' : '', fontWeight: selectedJobId === job.id ? '700' : '' }}
                                    >
                                        {selectedJobId === job.id ? "Active Goal" : "Set Active"} <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="target-quick-actions">
                                    <button type="button" onClick={() => chooseTarget(job.id)}>
                                        <PencilLine size={14} /> Continue Goal
                                    </button>
                                    <button type="button" onClick={() => compareResume(job.id)} disabled={resumes.length === 0}>
                                        <FileSearch size={14} /> Compare Resume
                                    </button>
                                    <button type="button" onClick={() => compareResume(job.id)} disabled={resumes.length === 0} style={{ gridColumn: '1 / -1' }}>
                                        View Match Report <ArrowRight size={14} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                    
                    {/* Add New Goal Dashed Card */}
                    <article className="career-target-card add-placeholder" onClick={handleAddNewGoal}>
                        <Plus size={36} />
                        <strong>Add New Career Goal</strong>
                        <p>Define a new target opportunity and analyze match quality.</p>
                    </article>
                </div>
            </section>

            {/* SECTION: How This Works Process Flow */}
            <section className="how-it-works-section">
                <h3>How This Works</h3>
                <div className="how-it-works-flow">
                    <div className="how-it-works-step">
                        <span className="how-it-works-step-num">1</span>
                        <h4>Define Goal</h4>
                        <p>Specify desired roles, locations, salaries, and paste target qualifications.</p>
                    </div>
                    <span className="how-it-works-arrow">➔</span>
                    <div className="how-it-works-step">
                        <span className="how-it-works-step-num">2</span>
                        <h4>Compare Resume</h4>
                        <p>Analyze how closely your work experience, projects, and education align with the target role.</p>
                    </div>
                    <span className="how-it-works-arrow">➔</span>
                    <div className="how-it-works-step">
                        <span className="how-it-works-step-num">3</span>
                        <h4>Find Skill Gaps</h4>
                        <p>Discover which high-demand keywords and tools are missing from your current resume.</p>
                    </div>
                    <span className="how-it-works-arrow">➔</span>
                    <div className="how-it-works-step">
                        <span className="how-it-works-step-num">4</span>
                        <h4>Get Roadmap</h4>
                        <p>Use the AI Career Coach to outline personalized project suggestions and roadmap timelines.</p>
                    </div>
                    <span className="how-it-works-arrow">➔</span>
                    <div className="how-it-works-step">
                        <span className="how-it-works-step-num">5</span>
                        <h4>Improve Progress</h4>
                        <p>Update your resume credentials and watch your career readiness match score rise.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
