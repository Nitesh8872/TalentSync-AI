import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    ChevronRight,
    CircleAlert,
    ClipboardCheck,
    Clock3,
    Eye,
    FileSearch,
    Gauge,
    Plus,
    Search,
    Sparkles,
    Target,
    UserCheck,
    UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import SkillTags from "../../../components/common/SkillTags.jsx";
import { getRecruiterApplications, getRecruiterCandidateMatches, updateRecruiterApplicationStatus } from "../../../services/recruiterCandidateMatchService.js";
import { listRecruiterJobs } from "../../../services/recruiterJobService.js";
import { useRecruiterAuth } from "../../../context/RecruiterAuthContext.jsx";
import { formatDate } from "../../../utils/formatters.js";

const isToday = (value) => {
    const date = new Date(value);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
};

const statusIncludes = (application, values) => values.some((value) => String(application.status || "").toLowerCase().includes(value));
const average = (values) => values.length ? Math.round(values.reduce((total, value) => total + Number(value || 0), 0) / values.length) : 0;

function KpiCard({ icon: Icon, label, value, note, tone, route }) {
    const content = <><span className="recruiter-kpi-icon"><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>{route && <ChevronRight size={16} className="recruiter-kpi-arrow" />}</>;
    return route ? <Link className={`recruiter-kpi-card ${tone || ""}`} to={route}>{content}</Link> : <article className={`recruiter-kpi-card ${tone || ""}`}>{content}</article>;
}

function PipelineStage({ label, value, icon: Icon, tone, last }) {
    return (
        <div className={`pipeline-stage ${tone || ""}`}>
            <span className="pipeline-stage-icon"><Icon size={17} /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
            {!last && <ArrowRight size={17} className="pipeline-arrow" />}
        </div>
    );
}

function OnboardingJourney({ hasJobs, hasApplications, hasMatches, hasShortlist }) {
    const steps = [
        { label: "Create first job", complete: hasJobs, route: "/recruiter/create-job" },
        { label: "Receive applications", complete: hasApplications },
        { label: "Review AI matches", complete: hasMatches, route: "/recruiter/candidate-matches" },
        { label: "Shortlist candidates", complete: hasShortlist },
    ];
    return (
        <section className="recruiter-onboarding">
            <div><p className="eyebrow">Hiring setup</p><h2>Build your first hiring pipeline</h2><span>TalentSync becomes more useful at every step.</span></div>
            <ol>{steps.map((step, index) => <li className={step.complete ? "complete" : index === steps.findIndex((item) => !item.complete) ? "current" : ""} key={step.label}><span>{step.complete ? <Check size={15} /> : index + 1}</span><strong>{step.label}</strong>{step.route && !step.complete && <Link to={step.route}>Start <ArrowRight size={13} /></Link>}</li>)}</ol>
        </section>
    );
}

export default function RecruiterDashboardPage() {
    const { recruiter } = useRecruiterAuth();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        async function loadDashboard() {
            try {
                const [jobData, applicationData] = await Promise.all([
                    listRecruiterJobs(recruiter.id).catch(() => []),
                    getRecruiterApplications(recruiter.id).catch(() => ({ applications: [] })),
                ]);
                const applicationsList = applicationData.applications || [];
                const jobIdsWithApplicants = [...new Set(applicationsList.map((application) => Number(application.job_id)).filter(Boolean))];
                const matchResults = await Promise.all(jobIdsWithApplicants.map((jobId) => getRecruiterCandidateMatches(recruiter.id, jobId).catch(() => ({ candidates: [], job_title: "", job_id: jobId }))));
                if (!active) return;
                setJobs(jobData);
                setApplications(applicationsList);
                setRankings(matchResults.flatMap((result) => (result.candidates || []).map((candidate) => ({ ...candidate, job_id: Number(result.job_id), job_title: result.job_title }))));
            } finally { if (active) setLoading(false); }
        }
        loadDashboard();
        return () => { active = false; };
    }, [recruiter.id]);

    const data = useMemo(() => {
        const activeJobs = jobs.filter((job) => !job.status || String(job.status).toLowerCase() === "active" || String(job.status).toLowerCase() === "published");
        const newToday = applications.filter((application) => isToday(application.applied_at));
        const shortlisted = applications.filter((application) => statusIncludes(application, ["shortlist"]));
        const interviewed = applications.filter((application) => statusIncludes(application, ["interview"]));
        const offers = applications.filter((application) => statusIncludes(application, ["offer", "hired"]));
        const matched = rankings.filter((candidate) => Number(candidate.match_score || 0) > 0);
        const rankedByScore = [...rankings].sort((left, right) => Number(right.match_score || 0) - Number(left.match_score || 0));
        const applicationsByJob = new Map();
        applications.forEach((application) => applicationsByJob.set(Number(application.job_id), (applicationsByJob.get(Number(application.job_id)) || 0) + 1));
        const matchesByJob = new Map();
        rankings.forEach((candidate) => {
            const scores = matchesByJob.get(Number(candidate.job_id)) || [];
            scores.push(Number(candidate.match_score || 0));
            matchesByJob.set(Number(candidate.job_id), scores);
        });
        const jobsWithoutApplicants = activeJobs.filter((job) => !applicationsByJob.get(Number(job.job_id)));
        const strongCandidates = rankings.filter((candidate) => Number(candidate.match_score || 0) >= 80);
        const skillFrequency = new Map();
        rankings.flatMap((candidate) => candidate.matched_skills || []).forEach((skill) => skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1));
        const topSkill = [...skillFrequency.entries()].sort((left, right) => right[1] - left[1])[0];
        const strongestJob = jobs.map((job) => ({ job, score: average(matchesByJob.get(Number(job.job_id)) || []) })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score)[0];
        return { activeJobs, newToday, shortlisted, interviewed, offers, matched, rankedByScore, applicationsByJob, matchesByJob, jobsWithoutApplicants, strongCandidates, topSkill, strongestJob, averageScore: average(rankings.map((candidate) => candidate.match_score)) };
    }, [applications, jobs, rankings]);

    const priorityItems = [
        { icon: Clock3, count: data.newToday.length, text: `${data.newToday.length} new ${data.newToday.length === 1 ? "applicant" : "applicants"} awaiting review`, route: "/recruiter/candidate-matches", cta: "Review now", tone: "new" },
        { icon: CircleAlert, count: data.jobsWithoutApplicants.length, text: `${data.jobsWithoutApplicants.length} ${data.jobsWithoutApplicants.length === 1 ? "job has" : "jobs have"} no applicants`, route: "/recruiter/create-job", cta: "View jobs", tone: "warning" },
        { icon: Sparkles, count: data.strongCandidates.length, text: `${data.strongCandidates.length} ${data.strongCandidates.length === 1 ? "candidate exceeds" : "candidates exceed"} 80% match`, route: "/recruiter/candidate-matches", cta: "View matches", tone: "strong" },
    ].filter((item) => item.count > 0);

    const insights = [
        data.topSkill && { icon: Target, title: `${data.topSkill[0]} is a leading matched skill`, text: `Appears across ${data.topSkill[1]} ranked ${data.topSkill[1] === 1 ? "candidate" : "candidates"}.` },
        data.strongestJob && { icon: BriefcaseBusiness, title: `${data.strongestJob.job.title} has the strongest talent pool`, text: `${data.strongestJob.score}% average candidate alignment.` },
        data.strongCandidates.length > 0 && { icon: Sparkles, title: `${data.strongCandidates.length} high-potential ${data.strongCandidates.length === 1 ? "candidate" : "candidates"}`, text: "These applicants meet or exceed an 80% match score." },
        rankings.length > 0 && { icon: BarChart3, title: `${data.averageScore}% average resume alignment`, text: `Calculated across ${rankings.length} ranked ${rankings.length === 1 ? "application" : "applications"}.` },
    ].filter(Boolean).slice(0, 4);

    const shortlistCandidate = async (applicationId) => {
        try {
            await updateRecruiterApplicationStatus(applicationId, "SHORTLISTED");
            setRankings((current) => current.map((c) => c.application_id === applicationId ? { ...c, application_status: "SHORTLISTED" } : c));
            setApplications((current) => current.map((a) => a.application_id === applicationId ? { ...a, status: "SHORTLISTED" } : a));
        } catch (error) {
            console.error("Failed to shortlist candidate:", error);
        }
    };

    const firstReviewJob = data.activeJobs.find((job) => data.applicationsByJob.get(Number(job.job_id))) || data.activeJobs[0];
    const reviewRoute = firstReviewJob ? `/recruiter/candidate-matches?job_id=${firstReviewJob.job_id}` : "/recruiter/candidate-matches";
    const isEmpty = !loading && !jobs.length && !applications.length;

    return (
        <div className="recruiter-command-center">
            <header className="recruiter-command-header">
                <div><p className="eyebrow">AI hiring command center</p><h1>Good to see you, {recruiter?.recruiter_name?.split(" ")[0] || "Recruiter"}</h1><p>Here’s what needs attention across {recruiter?.company_name || "your hiring workspace"} today.</p></div>
                <Link className="btn btn-primary" to="/recruiter/create-job"><Plus size={17} /> Create job</Link>
            </header>

            <section className="recruiter-kpi-grid" aria-label="Hiring overview">
                <KpiCard icon={BriefcaseBusiness} label="Active jobs" value={data.activeJobs.length} note="Open roles" tone="jobs" route="/recruiter/create-job" />
                <KpiCard icon={ClipboardCheck} label="Total applications" value={applications.length} note="Across all roles" tone="applications" route={reviewRoute} />
                <KpiCard icon={Clock3} label="New today" value={data.newToday.length} note="Awaiting review" tone="new" route={reviewRoute} />
                <KpiCard icon={UserCheck} label="Shortlisted" value={data.shortlisted.length} note="Pipeline candidates" tone="shortlisted" route={reviewRoute} />
                <KpiCard icon={Gauge} label="Average match" value={`${data.averageScore}%`} note="Ranked applicants" tone="score" route={reviewRoute} />
            </section>

            {isEmpty && <OnboardingJourney hasJobs={false} hasApplications={false} hasMatches={false} hasShortlist={false} />}

            {!isEmpty && <>
                <div className="recruiter-core-grid">
                    <section className="recruiter-command-card hiring-pipeline-card">
                        <div className="recruiter-card-head"><div><p>Hiring pipeline</p><h2>Candidate movement</h2></div><Link to={reviewRoute}>View pipeline <ArrowRight size={14} /></Link></div>
                        <div className="hiring-pipeline-flow">
                            <PipelineStage label="Applications" value={applications.length} icon={ClipboardCheck} tone="applications" />
                            <PipelineStage label="Matched" value={data.matched.length} icon={FileSearch} tone="matched" />
                            <PipelineStage label="Shortlisted" value={data.shortlisted.length} icon={UserCheck} tone="shortlisted" />
                            <PipelineStage label="Interview" value={data.interviewed.length} icon={UsersRound} tone="interview" />
                            <PipelineStage label="Offer" value={data.offers.length} icon={Check} tone="offer" last />
                        </div>
                        {!applications.length && <div className="pipeline-empty-note"><Clock3 size={16} /><span><strong>Your pipeline is ready</strong> Applications will move through these stages once candidates apply.</span></div>}
                    </section>

                    <aside className="recruiter-command-card needs-attention-card">
                        <div className="recruiter-card-head"><div><p>Priority actions</p><h2>Needs attention</h2></div>{priorityItems.length > 0 && <span>{priorityItems.length}</span>}</div>
                        <div className="attention-list">
                            {priorityItems.length ? priorityItems.map(({ icon: Icon, text, route, cta, tone }) => <article className={tone} key={text}><span><Icon size={17} /></span><p>{text}</p><Link to={route}>{cta} <ChevronRight size={13} /></Link></article>) : <div className="attention-clear"><Check size={18} /><span><strong>You’re all caught up</strong><small>No urgent hiring actions right now.</small></span></div>}
                        </div>
                    </aside>
                </div>

                <section className="recruiter-command-card candidate-spotlight-section">
                    <div className="recruiter-card-head"><div><p>Top candidate spotlight</p><h2>Strongest applicants</h2><span>{rankings.length ? "Ranked by resume-to-role alignment." : "Top applicants will appear after candidates apply."}</span></div><Link to={reviewRoute}>View all matches <ArrowRight size={14} /></Link></div>
                    {!loading && !rankings.length && <div className="recruiter-section-empty"><UsersRound size={23} /><div><strong>No ranked candidates yet</strong><p>Once applications arrive, AI-ranked candidates will appear here.</p></div><Link to="/recruiter/create-job">Review active jobs</Link></div>}
                    <div className="candidate-spotlight-grid">
                        {data.rankedByScore.slice(0, 3).map((candidate, index) => (
                            <article className="candidate-spotlight-card" key={candidate.application_id}>
                                <div className="candidate-spotlight-top"><span className="candidate-rank">#{index + 1}</span><span className="candidate-avatar">{candidate.candidate_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C"}</span><div><h3>{candidate.candidate_name || "Candidate"}</h3><p>{candidate.job_title}</p></div><b>{Math.round(Number(candidate.match_score || 0))}%</b></div>
                                <SkillTags skills={(candidate.matched_skills || []).slice(0, 5)} emptyText="No matched skills detected." />
                                <div className="candidate-card-actions">
                                    <Link to={`/recruiter/candidate-matches?job_id=${candidate.job_id}`}><Eye size={14} /> View profile</Link>
                                    {String(candidate.application_status || "").toLowerCase().includes("shortlist") ? (
                                        <button type="button" disabled className="shortlisted-btn">
                                            <Check size={14} /> Shortlisted
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            onClick={() => shortlistCandidate(candidate.application_id)}
                                            title="Shortlist this candidate"
                                        >
                                            <UserCheck size={14} /> Shortlist
                                        </button>
                                    )}
                                    <Link to={`/recruiter/candidate-matches?job_id=${candidate.job_id}`}><FileSearch size={14} /> Compare</Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <div className="recruiter-detail-grid">
                    <section className="recruiter-command-card active-jobs-section">
                        <div className="recruiter-card-head"><div><p>Active jobs</p><h2>Hiring performance by role</h2></div><Link to="/recruiter/create-job">Manage jobs <ArrowRight size={14} /></Link></div>
                        {!loading && !data.activeJobs.length && <div className="recruiter-section-empty"><BriefcaseBusiness size={23} /><div><strong>No active jobs</strong><p>Create a role to start building your candidate pipeline.</p></div><Link to="/recruiter/create-job">Create job</Link></div>}
                        <div className="active-jobs-list">{data.activeJobs.slice(0, 5).map((job) => { const count = data.applicationsByJob.get(Number(job.job_id)) || 0; const quality = average(data.matchesByJob.get(Number(job.job_id)) || []); return <article key={job.job_id}><span className="active-job-icon"><BriefcaseBusiness size={17} /></span><div className="active-job-title"><strong>{job.title}</strong><small><CalendarDays size={12} /> Posted {formatDate(job.created_at)}</small></div><div><small>Applications</small><strong>{count}</strong></div><div><small>Match quality</small><strong className={quality >= 70 ? "good" : ""}>{quality ? `${quality}%` : "—"}</strong></div><Link to={`/recruiter/candidate-matches?job_id=${job.job_id}`}>Manage job <ChevronRight size={13} /></Link></article>; })}</div>
                    </section>

                    <aside className="recruiter-command-card ai-hiring-insights">
                        <div className="recruiter-card-head"><div><p>AI hiring insights</p><h2>Signals from your talent pool</h2></div><Sparkles size={18} /></div>
                        <div className="hiring-insights-list">{insights.length ? insights.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={17} /></span><div><strong>{title}</strong><p>{text}</p></div></article>) : <div className="insights-empty"><BarChart3 size={20} /><p>Hiring insights will appear once candidates enter your pipeline.</p></div>}</div>
                    </aside>
                </div>
            </>}

            <section className="recruiter-quick-actions">
                <div><p className="eyebrow">Quick actions</p><h2>Keep hiring moving</h2></div>
                <nav>{[
                    { label: "Create Job", note: "Publish a new opportunity", route: "/recruiter/create-job", icon: Plus },
                    { label: "Review Applicants", note: "Triage the current pipeline", route: reviewRoute, icon: ClipboardCheck },
                    { label: "View Matches", note: "See AI-ranked candidates", route: reviewRoute, icon: Target },
                    { label: "Browse Talent Pool", note: "Explore available applicants", route: reviewRoute, icon: Search },
                ].map(({ label, note, route, icon: Icon }) => <Link to={route} key={label}><span><Icon size={18} /></span><div><strong>{label}</strong><small>{note}</small></div><ChevronRight size={15} /></Link>)}</nav>
            </section>
        </div>
    );
}
