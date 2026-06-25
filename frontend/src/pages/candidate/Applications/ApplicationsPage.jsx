import { useCallback, useEffect, useState, useMemo } from "react";
import { ExternalLink, Gauge, BriefcaseBusiness, AlertCircle, Calendar, ChevronRight, Award } from "lucide-react";
import { Link } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import PageHeader from "../../../components/common/PageHeader.jsx";
import Panel from "../../../components/common/Panel.jsx";
import Modal from "../../../components/common/Modal.jsx";
import MatchScore from "../../../components/common/MatchScore.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import {
    listCandidateApplications,
    subscribeToApplications,
} from "../../../services/applicationService.js";
import { useActiveResumeId } from "../../../context/ResumeContext.jsx";
import { getMatchQuality } from "../../../utils/matchScore.js";

const STATUS_STAGES = [
    { key: "Applied", label: "Applied", tone: "applied" },
    { key: "Under Review", label: "Review", tone: "review" },
    { key: "Shortlisted", label: "Shortlisted", tone: "shortlisted" },
    { key: "Interview", label: "Interview", tone: "interview" },
    { key: "Offer", label: "Offer", tone: "offer" },
    { key: "Hired", label: "Hired", tone: "hired" },
    { key: "Rejected", label: "Rejected", tone: "rejected" },
];

function getServerMetadata(application) {
    const status = String(application.status || "APPLIED")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const appliedDate = new Date(application.applied_at);
    return {
        appliedAt: appliedDate.toISOString(),
        status,
        lastActivity: `Application status: ${status}`,
        nextAction: status === "Rejected" || status === "Hired" ? "No action required" : "Waiting for recruiter update",
        timeline: [{ stage: status, date: appliedDate.toLocaleDateString(), done: true, current: true }],
    };
}

export default function ApplicationsPage() {
    const { latestResume, loadingLatestResume, resumeError } = useActiveResumeId();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [matchScores, setMatchScores] = useState({});
    const [appMetadata, setAppMetadata] = useState({});
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [scoreExplanation, setScoreExplanation] = useState(null);

    const loadApplications = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const applicationsResult = await listCandidateApplications();
            const applications = applicationsResult.applications || [];
            const validJobs = applications.map((application) => ({ ...application, job_id: application.job_id }));
            setJobs(validJobs);
            const updatedMeta = Object.fromEntries(
                applications.map((application) => [application.job_id, getServerMetadata(application)]),
            );
            setAppMetadata(updatedMeta);

            setMatchScores(Object.fromEntries(applications.map((application) => [
                application.job_id,
                {
                    match_score: application.match_score,
                    matched_skills: application.matched_skills || [],
                    missing_skills: application.missing_skills || [],
                    resume_id: application.resume_id,
                },
            ])));

        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadApplications();
        return subscribeToApplications(loadApplications);
    }, [loadApplications]);

    // Select the first job if none is selected
    useEffect(() => {
        if (jobs.length > 0 && !selectedJobId) {
            setSelectedJobId(jobs[0].job_id);
        }
    }, [jobs, selectedJobId]);

    // Section 1 Calculations: Overview
    const stats = useMemo(() => {
        let total = jobs.length;
        let applied = 0;
        let underReview = 0;
        let interviews = 0;
        let offers = 0;

        jobs.forEach((job) => {
            const meta = appMetadata[job.job_id];
            if (meta) {
                if (meta.status === "Applied") {
                    applied++;
                } else if (meta.status === "Under Review" || meta.status === "Shortlisted") {
                    underReview++;
                } else if (meta.status === "Interview") {
                    interviews++;
                } else if (meta.status === "Offer" || meta.status === "Hired") {
                    offers++;
                }
            }
        });

        return { total, applied, underReview, interviews, offers };
    }, [jobs, appMetadata]);

    // Section 2 Calculations: Pipeline Stage Counts
    const pipelineCounts = useMemo(() => {
        const counts = {
            "Applied": 0,
            "Under Review": 0,
            "Shortlisted": 0,
            "Interview": 0,
            "Offer": 0,
            "Hired": 0,
            "Rejected": 0,
        };

        jobs.forEach((job) => {
            const meta = appMetadata[job.job_id];
            if (meta && counts[meta.status] !== undefined) {
                counts[meta.status]++;
            }
        });

        return counts;
    }, [jobs, appMetadata]);

    // Section 4 Calculations: Insights
    const appsThisMonth = useMemo(() => {
        const now = new Date();
        return jobs.filter((job) => {
            const meta = appMetadata[job.job_id];
            if (!meta?.appliedAt) return false;
            const appliedDate = new Date(meta.appliedAt);
            return (
                appliedDate.getMonth() === now.getMonth() &&
                appliedDate.getFullYear() === now.getFullYear()
            );
        }).length;
    }, [jobs, appMetadata]);

    const highestMatchScore = useMemo(() => {
        const scores = Object.values(matchScores)
            .filter((job) => job.resume_id && Number.isFinite(Number(job.match_score)))
            .map((job) => Number(job.match_score));
        return scores.length ? Math.max(...scores) : 0;
    }, [matchScores]);

    const averageMatchScore = useMemo(() => {
        const scores = Object.values(matchScores)
            .filter((job) => job.resume_id && Number.isFinite(Number(job.match_score)))
            .map((job) => Number(job.match_score));
        return scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
    }, [matchScores]);

    const hasMatchData = useMemo(
        () => Object.values(matchScores).some((job) => job.resume_id && Number.isFinite(Number(job.match_score))),
        [matchScores],
    );

    const commonSkills = useMemo(() => {
        const skillCounts = {};
        jobs.forEach((job) => {
            if (Array.isArray(job.skills)) {
                job.skills.forEach((skill) => {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                });
            }
        });
        return Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([skill]) => skill);
    }, [jobs]);

    // Selection helper
    const selectedJob = useMemo(() => jobs.find((j) => j.job_id === selectedJobId), [jobs, selectedJobId]);
    const selectedMeta = useMemo(() => selectedJob ? appMetadata[selectedJob.job_id] : null, [selectedJob, appMetadata]);

    return (
        <>
            <PageHeader eyebrow="Dashboard" title="Application Tracker">
                Review, track, and manage your job applications, recruitment stages, and search insights.
            </PageHeader>

            <Alert type="error">{error}</Alert>

            {loadingLatestResume && <p className="empty-state">Loading latest resume...</p>}
            {!loadingLatestResume && !latestResume && <Alert type="warning">{resumeError === "Resume parsing failed" ? "Resume parsing failed. Please upload resume." : "Upload your resume first to unlock AI matching."}</Alert>}

            {loading && <p className="empty-state">Loading applications...</p>}

            {!loading && !jobs.length && (
                <Panel>
                    <div className="centered-empty">
                        <h2>No applications yet</h2>
                        <p className="empty-state">
                            Browse open roles or review recommendations to submit your first application.
                        </p>
                        <Link className="btn btn-primary" to="/candidate/browse-jobs">
                            Browse Jobs <ExternalLink size={16} />
                        </Link>
                    </div>
                </Panel>
            )}

            {!loading && jobs.length > 0 && (
                <>
                    {/* SECTION 1: Application Overview */}
                    <section className="tracker-stats-grid">
                        <article className="tracker-stat-card">
                            <span className="tracker-stat-icon total"><BriefcaseBusiness size={20} /></span>
                            <div className="tracker-stat-info">
                                <span>Total Applications</span>
                                <strong>{stats.total}</strong>
                            </div>
                        </article>
                        <article className="tracker-stat-card">
                            <span className="tracker-stat-icon review"><Gauge size={20} /></span>
                            <div className="tracker-stat-info">
                                <span>Applied</span>
                                <strong>{stats.applied}</strong>
                            </div>
                        </article>
                        <article className="tracker-stat-card">
                            <span className="tracker-stat-icon interview"><Calendar size={20} /></span>
                            <div className="tracker-stat-info">
                                <span>Interviews</span>
                                <strong>{stats.interviews}</strong>
                            </div>
                        </article>
                        <article className="tracker-stat-card">
                            <span className="tracker-stat-icon offers"><Award size={20} /></span>
                            <div className="tracker-stat-info">
                                <span>Review / Offers</span>
                                <strong>{stats.underReview + stats.offers}</strong>
                            </div>
                        </article>
                    </section>

                    {/* SECTION 2: Horizontal Application Pipeline */}
                    <section className="pipeline-visualizer-card">
                        <h3>Hiring Pipeline Overview</h3>
                        <div className="pipeline-flow">
                            {STATUS_STAGES.map((stage, idx) => {
                                const count = pipelineCounts[stage.key] || 0;
                                const isActive = count > 0;
                                return (
                                    <div key={stage.key} className={`pipeline-stage-wrap tone-${stage.tone}`}>
                                        <div className={`pipeline-step tone-${stage.tone} ${isActive ? 'active' : ''}`}>
                                            <span className="pipeline-step-badge">{idx + 1}</span>
                                            <span className="pipeline-step-label">{stage.label}</span>
                                            <span className="pipeline-step-count">{count} active</span>
                                        </div>
                                        {idx < STATUS_STAGES.length - 1 && (
                                            <span className="pipeline-arrow" aria-hidden="true">→</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className="tracker-layout">
                        {/* LEFT COLUMN: Section 3 Cards List */}
                        <section className="tracker-cards-list">
                            {jobs.map((job) => {
                                const scoreData = matchScores[job.job_id] || {};
                                const score = Math.round(Number(scoreData.match_score || 0));
                                const scoreAvailable = Boolean(scoreData.resume_id) && Number.isFinite(Number(scoreData.match_score));
                                const meta = appMetadata[job.job_id] || {};
                                const appliedDateStr = meta.appliedAt 
                                    ? new Date(meta.appliedAt).toLocaleDateString()
                                    : "Recently";

                                return (
                                    <article 
                                        className={`tracker-application-card ${selectedJobId === job.job_id ? 'selected' : ''}`}
                                        key={job.job_id}
                                        onClick={() => setSelectedJobId(job.job_id)}
                                    >
                                        <div className="tracker-card-header">
                                            <div className="tracker-job-info">
                                                <h3>{job.title}</h3>
                                                <p>{job.experience}</p>
                                            </div>
                                            <span className={`tracker-status-pill ${meta.status?.toLowerCase().replace(" ", "_") || 'applied'}`}>
                                                {meta.status || "Applied"}
                                            </span>
                                        </div>

                                        <SkillTags skills={job.skills} />

                                        <div className="tracker-card-meta">
                                            <span>
                                                <Calendar size={13} />
                                                Applied {appliedDateStr}
                                            </span>
                                            {scoreAvailable ? (
                                                <div className="tracker-snapshot-score">
                                                    <small>Application snapshot</small>
                                                    <MatchScore className={`tracker-card-match-score ${score === 0 ? "zero" : ""}`} score={score} matchedCount={(scoreData.matched_skills || []).length} missingCount={(scoreData.missing_skills || []).length} compact onExplain={(event) => { event.stopPropagation(); setScoreExplanation({ ...job, ...scoreData }); }} />
                                                </div>
                                            ) : (
                                                <span className="tracker-match-unavailable"><AlertCircle size={13} /> Resume data unavailable</span>
                                            )}
                                        </div>

                                        <div className="tracker-card-footer">
                                            <span className="tracker-activity">
                                                <AlertCircle size={14} style={{ color: 'var(--muted)' }} />
                                                Last active: {meta.lastActivity || "Submitted"}
                                            </span>
                                            <div className="tracker-next-action">
                                                <span>Next step: <strong>{meta.nextAction || "Review"}</strong></span>
                                                <ChevronRight size={15} />
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        {/* RIGHT COLUMN: Section 4 Insights & Section 5 Timeline */}
                        <section className="tracker-sidebar">
                            {/* SECTION 5: Activity Timeline */}
                            <article className="tracker-sidebar-card">
                                <h3>Activity Timeline</h3>
                                {selectedJob ? (
                                    <>
                                        <div style={{ marginBottom: '14px' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{selectedJob.title}</h4>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>Application Process Stages</p>
                                        </div>
                                        <div className="timeline-list">
                                            {selectedMeta?.timeline?.map((event, index) => (
                                                <div 
                                                    className={`timeline-item ${event.done ? 'done' : ''} ${event.current ? 'current' : ''}`}
                                                    key={`${event.stage}-${index}`}
                                                >
                                                    <span className="timeline-dot" />
                                                    <div className="timeline-info">
                                                        <h4>{event.stage}</h4>
                                                        <p>{event.date}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="timeline-empty">Select an application card to view timeline details.</p>
                                )}
                            </article>

                            {/* SECTION 4: Application Insights */}
                            <article className="tracker-sidebar-card">
                                <h3>Search Insights</h3>
                                <div style={{ display: 'grid', gap: '6px' }}>
                                    <div className="insight-metric-item">
                                        <span>Velocity (this month)</span>
                                        <strong>{appsThisMonth} jobs</strong>
                                    </div>
                                    <div className="insight-metric-item">
                                        <span>Highest Snapshot Match</span>
                                        <strong>{hasMatchData ? `${highestMatchScore}%` : "Match data pending"}</strong>
                                    </div>
                                    <div className="insight-metric-item">
                                        <span>Average Snapshot Match</span>
                                        <strong>{hasMatchData ? `${averageMatchScore}%` : "Match data pending"}</strong>
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>Key Focus Areas</span>
                                    <div className="insights-skills-list">
                                        {commonSkills.length > 0 ? (
                                            commonSkills.map((skill) => (
                                                <span className="insights-skill-badge" key={skill}>
                                                    {skill}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>No skills recorded yet.</span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        </section>
                    </div>
                </>
            )}

            <p className="page-footnote">
                Application details come from the live application API and reflect the latest recruiter status updates.
            </p>
            <Modal open={Boolean(scoreExplanation)} title="Why this match score?" onClose={() => setScoreExplanation(null)}>
                {scoreExplanation && <div className="match-explanation-modal">
                    <MatchScore score={scoreExplanation.match_score} matchedCount={(scoreExplanation.matched_skills || []).length} missingCount={(scoreExplanation.missing_skills || []).length} />
                    <p>This is the match-score snapshot saved when you applied, using the resume attached to that application.</p>
                    <div><strong>Matched skills</strong><SkillTags skills={scoreExplanation.matched_skills} emptyText="No direct skill matches detected." /></div>
                    <div><strong>Missing skills</strong><SkillTags skills={scoreExplanation.missing_skills} missing emptyText="No major skill gaps detected." /></div>
                    <small>{getMatchQuality(scoreExplanation.match_score).label} reflects the role requirements and the resume used at application time.</small>
                </div>}
            </Modal>
        </>
    );
}
