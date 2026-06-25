import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BrainCircuit,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronRight,
    FileSearch,
    FileText,
    Gauge,
    MapPin,
    Sparkles,
    Target,
    TrendingUp,
    Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import ApplicationButton from "../../../components/jobs/ApplicationButton.jsx";
import MatchScore from "../../../components/common/MatchScore.jsx";
import Modal from "../../../components/common/Modal.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import { useCandidateAuth } from "../../../context/CandidateAuthContext.jsx";
import { useActiveResumeId } from "../../../context/ResumeContext.jsx";
import { useApplications } from "../../../context/ApplicationContext.jsx";
import { listCandidateApplications } from "../../../services/applicationService.js";
import { listJobDescriptions } from "../../../services/jobService.js";
import { getRecommendedJobs } from "../../../services/recommendationService.js";
import { collectResumeSkills, normalizeRecords } from "../../../utils/resumeData.js";
import { trimText } from "../../../utils/formatters.js";

/* ─── Static config ──────────────────────────────────────────── */

const quickActions = [
    { label: "Upload Resume", route: "/candidate/resume", icon: FileSearch, color: "blue" },
    { label: "Continue Career Goal", route: "/candidate/job-description", icon: Target, color: "purple" },
    { label: "Explore Jobs", route: "/candidate/browse-jobs", icon: BriefcaseBusiness, color: "teal" },
    { label: "Open AI Career Coach", route: "/candidate/matching", icon: BrainCircuit, color: "violet" },
    { label: "Track Applications", route: "/candidate/applications", icon: FileText, color: "amber" },
];

const PIPELINE_STAGES = [
    { key: "Applied", label: "Applied", color: "#2563eb" },
    { key: "Under Review", label: "Under Review", color: "#d97706" },
    { key: "Shortlisted", label: "Shortlisted", color: "#7c3aed" },
    { key: "Interview", label: "Interview", color: "#7c3aed" },
    { key: "Offer", label: "Offer", color: "#059669" },
    { key: "Hired", label: "Hired", color: "#047857" },
    { key: "Rejected", label: "Rejected", color: "#b91c1c" },
];

/* ─── Helpers ─────────────────────────────────────────────────── */

function calcResumeReadiness(resume) {
    if (!resume) return 0;
    const parsed = resume.parsed_data || {};
    const contact = parsed.personal_information || parsed.contact || {};
    const checks = [
        contact.full_name || parsed.name,
        contact.email,
        collectResumeSkills(parsed).length >= 5,
        normalizeRecords(parsed.experience || parsed.work_experience).length,
        normalizeRecords(parsed.projects || parsed.project_details).length,
        normalizeRecords(parsed.education).length,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcProfileCompletion(resumes, jobTargets, applications) {
    const steps = [
        resumes.length > 0,
        resumes.some((r) => r.parsed_name),
        jobTargets.length > 0,
        applications.length > 0,
    ];
    const done = steps.filter(Boolean).length;
    return { done, total: steps.length, pct: Math.round((done / steps.length) * 100), steps };
}

function getPipelineCounts(metadata) {
    const counts = { Applied: 0, "Under Review": 0, Shortlisted: 0, Interview: 0, Offer: 0, Hired: 0, Rejected: 0 };
    Object.values(metadata).forEach((meta) => {
        const status = meta?.status || "Applied";
        if (counts[status] !== undefined) counts[status]++;
        else counts["Applied"]++;
    });
    return counts;
}

/* ─── Sub-components ──────────────────────────────────────────── */

function CareerProgressCard({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className="cmd-stat-card" style={{ "--card-accent": accent }}>
            <div className="cmd-stat-icon">
                <Icon size={19} />
            </div>
            <div className="cmd-stat-body">
                <span className="cmd-stat-label">{label}</span>
                <strong className="cmd-stat-value">{value}</strong>
                {sub && <small className="cmd-stat-sub">{sub}</small>}
            </div>
        </div>
    );
}

function NextActionCard({ icon: Icon, title, description, status, to, statusOk }) {
    return (
        <Link className={`cmd-action-card ${statusOk ? "done" : ""}`} to={to}>
            <div className="cmd-action-icon">
                <Icon size={18} />
            </div>
            <div className="cmd-action-body">
                <strong>{title}</strong>
                <p>{description}</p>
            </div>
            <div className="cmd-action-right">
                {status && (
                    <span className={`cmd-action-status ${statusOk ? "ok" : "pending"}`}>
                        {statusOk ? <CheckCircle2 size={12} /> : null}
                        {status}
                    </span>
                )}
                <ChevronRight size={16} className="cmd-action-arrow" />
            </div>
        </Link>
    );
}

function JobMatchCard({ job, candidateId, onExplain }) {
    const score = Math.round(Number(job.match_score || 0));
    const matched = job.matched_skills || [];
    const missing = job.missing_skills || [];
    return (
        <article className="cmd-job-card">
            <div className="cmd-job-header">
                <div className="cmd-job-title">
                    <strong>{job.title || "Untitled Role"}</strong>
                    {job.location && (
                        <span className="cmd-job-location">
                            <MapPin size={11} /> {job.location}
                        </span>
                    )}
                </div>
                <MatchScore score={score} matchedCount={matched.length} missingCount={missing.length} compact onExplain={() => onExplain(job)} />
            </div>
            <p className="cmd-job-desc">{trimText(job.description || "Matched role", 110)}</p>
            <div className="cmd-job-footer">
                <ApplicationButton candidateId={candidateId} jobId={job.job_id} size="sm" />
                <Link className="btn btn-secondary btn-sm" to={`/candidate/browse-jobs`}>
                    View
                </Link>
            </div>
        </article>
    );
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function CandidateDashboardPage() {
    const { candidate } = useCandidateAuth();
    const { latestResume, loadingLatestResume } = useActiveResumeId();
    const resumes = useMemo(() => latestResume ? [{ parsed_name: latestResume.parsed_name || latestResume.file_name }] : [], [latestResume]);
    const [jobTargets, setJobTargets] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [appliedJobs, setAppliedJobs] = useState([]);
    const [appMetadata, setAppMetadata] = useState({});
    const [loading, setLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");
    const [scoreExplanation, setScoreExplanation] = useState(null);
    const { applications: sharedApplications, error: applicationsError } = useApplications();

    useEffect(() => {
        let active = true;
        async function loadDashboard() {
            setDashboardError("");
            try {
                const [targetResult, recommendationResult, applicationResult] = await Promise.allSettled([
                    listJobDescriptions(),
                    getRecommendedJobs(candidate.id, 3),
                    listCandidateApplications(),
                ]);
                const failures = [targetResult, recommendationResult, applicationResult]
                    .filter((result) => result.status === "rejected")
                    .map((result) => result.reason?.message || "Request failed");
                const targetData = targetResult.status === "fulfilled" ? targetResult.value : [];
                const recommendationData = recommendationResult.status === "fulfilled" ? recommendationResult.value : { recommendations: [] };
                const applicationData = applicationResult.status === "fulfilled" ? applicationResult.value : { applications: sharedApplications };
                const applications = applicationData.applications || [];
                const meta = Object.fromEntries(applications.map((application) => {
                    const status = String(application.status || "APPLIED").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
                    return [application.job_id, { status }];
                }));
                if (!active) return;
                setJobTargets(targetData);
                setRecommendations(recommendationData.recommendations || []);
                setAppliedJobs(applications);
                setAppMetadata(meta);
                if (failures.length) {
                    setDashboardError(`Some dashboard data could not be loaded: ${failures[0]}`);
                }
            } finally {
                if (active) setLoading(false);
            }
        }
        loadDashboard();
        return () => { active = false; };
    }, [candidate.id, latestResume?.resume_id, sharedApplications]);

    useEffect(() => {
        if (applicationsError) setDashboardError(applicationsError);
    }, [applicationsError]);

    /* Derived values */
    const resumeReadiness = useMemo(() => calcResumeReadiness(latestResume), [latestResume]);
    const workspaceLoading = loading || loadingLatestResume;
    const profile = useMemo(
        () => calcProfileCompletion(resumes, jobTargets, appliedJobs),
        [resumes, jobTargets, appliedJobs],
    );

    const resumeSkills = useMemo(() => collectResumeSkills(latestResume?.parsed_data || {}), [latestResume]);
    const resumeSkillSet = useMemo(() => new Set(resumeSkills.map((skill) => skill.toLowerCase())), [resumeSkills]);

    const enhancedRecommendations = useMemo(() => {
        if (!latestResume) return recommendations;
        return recommendations.map((job) => {
            const matchedSkills = (job.skills || []).filter((skill) => resumeSkillSet.has(skill.toLowerCase()));
            const missingSkills = (job.skills || []).filter((skill) => !resumeSkillSet.has(skill.toLowerCase()));
            const calculatedScore = job.skills?.length ? Math.round((matchedSkills.length / job.skills.length) * 100) : 0;
            return {
                ...job,
                matched_skills: matchedSkills,
                missing_skills: missingSkills,
                match_score: job.match_score ?? calculatedScore
            };
        }).sort((left, right) => Number(right.match_score || 0) - Number(left.match_score || 0));
    }, [recommendations, latestResume, resumeSkillSet]);

    const topMatchScore = useMemo(
        () => (enhancedRecommendations.length ? Math.round(Number(enhancedRecommendations[0]?.match_score || 0)) : 0),
        [enhancedRecommendations],
    );
    const topGoal = jobTargets[0];
    const pipelineCounts = useMemo(() => getPipelineCounts(appMetadata), [appMetadata]);
    const totalApplied = appliedJobs.length;

    /* Next-action cards config (dynamic status) */
    const nextActions = [
        {
            icon: FileSearch,
            title: "Complete Resume Profile",
            description: "Upload and parse your resume to unlock AI-powered job matching.",
            status: resumes.some((r) => r.parsed_name) ? "Complete" : "Pending",
            statusOk: resumes.some((r) => r.parsed_name),
            to: "/candidate/resume",
        },
        {
            icon: Gauge,
            title: "Improve Readiness Score",
            description: "Review your Readiness Score and close the skill gaps that matter most.",
            status: resumeReadiness >= 75 ? "On Track" : "Action Needed",
            statusOk: resumeReadiness >= 75,
            to: "/candidate/matching",
        },
        {
            icon: BriefcaseBusiness,
            title: "Review Top Job Matches",
            description: "Your AI matched you to new roles. Review them before they fill.",
            status: enhancedRecommendations.length ? `${enhancedRecommendations.length} new` : "No matches yet",
            statusOk: enhancedRecommendations.length > 0,
            to: "/candidate/browse-jobs",
        },
        {
            icon: Target,
            title: "Continue Career Goal",
            description: "Set or refine your target role so the AI can personalise your roadmap.",
            status: topGoal ? "Set" : "Not set",
            statusOk: !!topGoal,
            to: "/candidate/job-description",
        },
        {
            icon: FileText,
            title: "Track Applications",
            description: "Check the latest status of your job applications and next steps.",
            status: totalApplied ? `${totalApplied} submitted` : "None yet",
            statusOk: totalApplied > 0,
            to: "/candidate/applications",
        },
    ];

    /* Profile progress items */
    const progressItems = [
        { label: "Resume Status", done: resumes.some((r) => r.parsed_name), value: resumes.some((r) => r.parsed_name) ? "Parsed & Ready" : "Not uploaded" },
        { label: "Career Goal", done: !!topGoal, value: topGoal ? trimText(topGoal.title || topGoal.job_title || "Set", 28) : "Not set" },
        { label: "Job Discovery", done: enhancedRecommendations.length > 0, value: enhancedRecommendations.length ? `${enhancedRecommendations.length} matches` : "No matches" },
        { label: "Applications", done: totalApplied > 0, value: totalApplied ? `${totalApplied} submitted` : "None yet" },
    ];

    return (
        <>
            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="cmd-hero">
                <div className="cmd-hero-text">
                    <p className="cmd-hero-eyebrow">
                        <Sparkles size={13} /> Candidate Command Center
                    </p>
                    <h1>Welcome back, {candidate?.full_name?.split(" ")[0] ?? candidate?.full_name}</h1>
                    <p className="cmd-hero-subtitle">
                        Track your career progress, resume readiness, job matches, and application activity in one place.
                    </p>
                </div>

                {/* Profile progress card */}
                <div className="cmd-profile-card">
                    <div className="cmd-profile-card-top">
                        <div>
                            <span className="cmd-profile-pct-label">Profile Completion</span>
                            <strong className="cmd-profile-pct">{profile.pct}%</strong>
                        </div>
                        <div className="cmd-profile-ring" style={{ "--pct": profile.pct }}>
                            <svg viewBox="0 0 36 36" aria-hidden="true">
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e6edf6" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="15.9155" fill="none"
                                    stroke="var(--primary)" strokeWidth="3"
                                    strokeDasharray={`${profile.pct} ${100 - profile.pct}`}
                                    strokeDashoffset="25"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span>{profile.done}/{profile.total}</span>
                        </div>
                    </div>
                    <div className="cmd-profile-items">
                        {progressItems.map((item) => (
                            <div key={item.label} className={`cmd-profile-item ${item.done ? "done" : ""}`}>
                                <CheckCircle2 size={13} />
                                <span className="cmd-profile-item-label">{item.label}</span>
                                <span className="cmd-profile-item-val">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {!loadingLatestResume && !latestResume && <p className="cmd-empty">Upload your resume first to unlock AI matching.</p>}
            <Alert type="error">{dashboardError}</Alert>

            {/* ── Career Progress Overview ──────────────────────── */}
            <section className="cmd-stats-row">
                <CareerProgressCard
                    icon={FileSearch}
                    label="Resume Readiness"
                    value={workspaceLoading ? "—" : `${resumeReadiness}%`}
                    sub={resumeReadiness >= 75 ? "Above threshold" : "Needs improvement"}
                    accent="#2563eb"
                />
                <CareerProgressCard
                    icon={Target}
                    label="Career Goal"
                    value={workspaceLoading ? "—" : (topGoal ? trimText(topGoal.title || topGoal.job_title || "Set", 20) : "Not set")}
                    sub={topGoal ? "Active goal" : "Set a target role"}
                    accent="#7c3aed"
                />
                <CareerProgressCard
                    icon={TrendingUp}
                    label="Top Match Score"
                    value={workspaceLoading ? "—" : (topMatchScore ? `${topMatchScore}%` : "No data")}
                    sub={topMatchScore >= 80 ? "Excellent fit" : topMatchScore >= 60 ? "Good fit" : "Upload resume first"}
                    accent="#059669"
                />
                <CareerProgressCard
                    icon={FileText}
                    label="Applications Submitted"
                    value={workspaceLoading ? "—" : String(totalApplied)}
                    sub={totalApplied === 1 ? "1 role applied" : `${totalApplied} roles applied`}
                    accent="#d97706"
                />
            </section>

            {/* ── Your Next Best Actions ────────────────────────── */}
            <section className="cmd-section">
                <div className="cmd-section-head">
                    <div>
                        <p className="cmd-section-eyebrow"><Zap size={12} /> Your Next Best Actions</p>
                        <h2>What should you do next?</h2>
                    </div>
                </div>
                <div className="cmd-action-list">
                    {nextActions.map((action) => (
                        <NextActionCard key={action.to} {...action} />
                    ))}
                </div>
            </section>

            {/* ── Two-column: Job Matches + Application Tracker ──── */}
            <div className="cmd-two-col">
                {/* Top Job Matches */}
                <section className="cmd-section">
                    <div className="cmd-section-head">
                        <div>
                            <p className="cmd-section-eyebrow"><Sparkles size={12} /> AI-Powered</p>
                            <h2>Top Job Matches</h2>
                        </div>
                        <Link className="btn btn-secondary btn-sm" to="/candidate/browse-jobs">
                            View All Opportunities <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="cmd-job-list">
                        {loading && <p className="cmd-empty">Loading job matches…</p>}
                        {!loading && !enhancedRecommendations.length && (
                            <div className="cmd-empty-card">
                                <BriefcaseBusiness size={28} />
                                <strong>No matches yet</strong>
                                <p>Upload and parse a resume to unlock AI-powered job recommendations.</p>
                                <Link className="btn btn-primary btn-sm" to="/candidate/resume">
                                    Upload Resume <ArrowRight size={13} />
                                </Link>
                            </div>
                        )}
                        {enhancedRecommendations.map((job) => (
                            <JobMatchCard key={job.job_id} job={job} candidateId={candidate.id} onExplain={setScoreExplanation} />
                        ))}
                    </div>
                </section>

                {/* Application Tracker Preview */}
                <section className="cmd-section">
                    <div className="cmd-section-head">
                        <div>
                            <p className="cmd-section-eyebrow"><FileText size={12} /> Pipeline Overview</p>
                            <h2>Application Tracker</h2>
                        </div>
                        <Link className="text-link" to="/candidate/applications">
                            Open <ArrowRight size={13} />
                        </Link>
                    </div>
                    <div className="cmd-pipeline">
                        {PIPELINE_STAGES.map((stage) => (
                            <div key={stage.key} className="cmd-pipeline-stage" style={{ "--stage-color": stage.color }}>
                                <span className="cmd-pipeline-count">{pipelineCounts[stage.key] ?? 0}</span>
                                <span className="cmd-pipeline-label">{stage.label}</span>
                                <div className="cmd-pipeline-bar">
                                    <div
                                        className="cmd-pipeline-fill"
                                        style={{
                                            width: totalApplied
                                                ? `${Math.min(100, ((pipelineCounts[stage.key] ?? 0) / totalApplied) * 100)}%`
                                                : "0%",
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link className="btn btn-secondary cmd-pipeline-btn" to="/candidate/applications">
                        Open Application Tracker <ArrowRight size={14} />
                    </Link>

                    {/* Recent applied jobs */}
                    {!!appliedJobs.length && (
                        <div className="cmd-applied-list">
                            <p className="cmd-applied-label">Recently applied</p>
                            {appliedJobs.slice(0, 3).map((job) => (
                                <div className="cmd-applied-row" key={job.job_id}>
                                    <div>
                                        <strong>{job.title}</strong>
                                        <small>{job.experience || "Experience not specified"}</small>
                                    </div>
                                    <span className="cmd-status-pill applied">Applied</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── Two-column: AI Coach Insights + Career Goal ──── */}
            <div className="cmd-two-col">
                {/* AI Career Coach Insights */}
                <section className="cmd-section cmd-coach-section">
                    <div className="cmd-section-head">
                        <div>
                            <p className="cmd-section-eyebrow coach"><BrainCircuit size={12} /> AI Career Coach</p>
                            <h2>Coach Insights</h2>
                        </div>
                        <Link className="btn btn-secondary btn-sm" to="/candidate/matching">
                            Open AI Career Coach <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="cmd-coach-grid">
                        <div className="cmd-coach-card strength">
                            <span className="cmd-coach-card-label">Top Strength</span>
                            <strong>
                                {resumes.some((r) => r.parsed_name)
                                    ? "Parsed resume ready"
                                    : "—"}
                            </strong>
                            <p>
                                {resumes.some((r) => r.parsed_name)
                                    ? "Your resume is parsed and ready for AI matching."
                                    : "Upload and parse your resume to discover your top strengths."}
                            </p>
                        </div>
                        <div className="cmd-coach-card gap">
                            <span className="cmd-coach-card-label">Top Skill Gap</span>
                            <strong>
                                {topGoal ? "Role skills analysis" : "No goal set"}
                            </strong>
                            <p>
                                {topGoal
                                    ? "Run the AI Career Coach to identify missing skills for your target role."
                                    : "Set a Career Goal to unlock personalised skill gap analysis."}
                            </p>
                        </div>
                        <div className="cmd-coach-card action">
                            <span className="cmd-coach-card-label">Recommended Action</span>
                            <strong>
                                {!resumes.some((r) => r.parsed_name)
                                    ? "Upload Resume"
                                    : !topGoal
                                        ? "Set Career Goal"
                                        : "Run AI Analysis"}
                            </strong>
                            <p>
                                {!resumes.some((r) => r.parsed_name)
                                    ? "Start by uploading a resume to enable AI coaching."
                                    : !topGoal
                                        ? "Set a target role to personalise your improvement roadmap."
                                        : "Open the AI Career Coach for a full readiness analysis."}
                            </p>
                        </div>
                        <div className="cmd-coach-card uplift">
                            <span className="cmd-coach-card-label">Est. Readiness Increase</span>
                            <strong>
                                {resumeReadiness < 100 ? `+${Math.min(28, 100 - resumeReadiness)}%` : "Max reached"}
                            </strong>
                            <p>Estimated readiness gain by completing your improvement roadmap.</p>
                        </div>
                    </div>
                </section>

                {/* Career Goal Preview */}
                <section className="cmd-section cmd-goal-section">
                    <div className="cmd-section-head">
                        <div>
                            <p className="cmd-section-eyebrow goal"><Target size={12} /> Current Career Goal</p>
                            <h2>Goal Progress</h2>
                        </div>
                    </div>
                    {topGoal ? (
                        <div className="cmd-goal-body">
                            <div className="cmd-goal-role">
                                <Target size={22} />
                                <div>
                                    <span>Target Role</span>
                                    <strong>{topGoal.title || topGoal.job_title || "Role not named"}</strong>
                                </div>
                            </div>
                            <div className="cmd-goal-meta-grid">
                                <div className="cmd-goal-meta-item">
                                    <small>Readiness Score</small>
                                    <strong>{resumeReadiness}%</strong>
                                </div>
                                <div className="cmd-goal-meta-item">
                                    <small>Missing Skills</small>
                                    <strong>{topGoal ? "Run Coach" : "—"}</strong>
                                </div>
                                <div className="cmd-goal-meta-item">
                                    <small>Last Updated</small>
                                    <strong>Recent</strong>
                                </div>
                                <div className="cmd-goal-meta-item">
                                    <small>Total Goals</small>
                                    <strong>{jobTargets.length}</strong>
                                </div>
                            </div>
                            <div className="cmd-goal-readiness-bar">
                                <div className="cmd-goal-readiness-track">
                                    <div className="cmd-goal-readiness-fill" style={{ width: `${resumeReadiness}%` }} />
                                </div>
                                <span>{resumeReadiness}% ready</span>
                            </div>
                            <Link className="btn btn-primary cmd-goal-cta" to="/candidate/job-description">
                                Continue Goal <ArrowRight size={15} />
                            </Link>
                        </div>
                    ) : (
                        <div className="cmd-goal-empty">
                            <Target size={32} />
                            <strong>No Career Goal Set</strong>
                            <p>Define your target role so the AI can map your Improvement Roadmap and Skill Gaps.</p>
                            <Link className="btn btn-primary btn-sm" to="/candidate/job-description">
                                Set Career Goal <ArrowRight size={13} />
                            </Link>
                        </div>
                    )}
                </section>
            </div>

            {/* ── Quick Actions ─────────────────────────────────── */}
            <section className="cmd-section cmd-quick-section">
                <div className="cmd-section-head">
                    <div>
                        <p className="cmd-section-eyebrow"><Zap size={12} /> Quick Actions</p>
                        <h2>Jump to a section</h2>
                    </div>
                </div>
                <div className="cmd-quick-grid">
                    {quickActions.map(({ label, route, icon: Icon, color }) => (
                        <Link className={`cmd-quick-card color-${color}`} to={route} key={route}>
                            <span className="cmd-quick-icon">
                                <Icon size={20} />
                            </span>
                            <span className="cmd-quick-label">{label}</span>
                            <ArrowRight size={15} className="cmd-quick-arrow" />
                        </Link>
                    ))}
                </div>
            </section>
            <Modal open={Boolean(scoreExplanation)} title="Why this match score?" onClose={() => setScoreExplanation(null)}>
                {scoreExplanation && (
                    <div className="match-explanation-modal">
                        <MatchScore
                            score={scoreExplanation.match_score}
                            matchedCount={(scoreExplanation.matched_skills || []).length}
                            missingCount={(scoreExplanation.missing_skills || []).length}
                        />
                        <p>This dashboard score compares your latest resume skills with the job requirements shown in the recommendation.</p>
                        <div><strong>Matched skills</strong><SkillTags skills={scoreExplanation.matched_skills} emptyText="No direct skill matches detected." /></div>
                        <div><strong>Missing skills</strong><SkillTags skills={scoreExplanation.missing_skills} missing emptyText="No major skill gaps detected." /></div>
                    </div>
                )}
            </Modal>
        </>
    );
}
