import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CalendarClock,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Clock3,
    Coins,
    Eye,
    FileText,
    Gauge,
    Lightbulb,
    MapPin,
    PencilLine,
    Send,
    Sparkles,
    Target,
    UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import Modal from "../../../components/common/Modal.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import { useRecruiterAuth } from "../../../context/RecruiterAuthContext.jsx";
import { getRecruiterApplications, getRecruiterCandidateMatches } from "../../../services/recruiterCandidateMatchService.js";
import { createRecruiterJob, listRecruiterJobs } from "../../../services/recruiterJobService.js";
import { formatDate } from "../../../utils/formatters.js";

const initialForm = {
    title: "",
    skills: "",
    experience: "",
    employment_type: "Full-time",
    location: "",
    salary_range: "",
    application_deadline: "",
    description: "",
};

function parseSkills(value) {
    return [...new Map(String(value || "").split(/[\n,;]+/).map((skill) => skill.trim()).filter(Boolean).map((skill) => [skill.toLowerCase(), skill])).values()];
}

const average = (values) => values.length ? Math.round(values.reduce((total, value) => total + Number(value || 0), 0) / values.length) : 0;

function FormSection({ icon: Icon, eyebrow, title, description, children }) {
    return (
        <section className="smart-job-form-section">
            <div className="smart-form-section-head"><span><Icon size={18} /></span><div><p>{eyebrow}</p><h2>{title}</h2><small>{description}</small></div></div>
            <div className="smart-form-section-body">{children}</div>
        </section>
    );
}

function PublishingJourney() {
    return (
        <div className="job-publishing-journey">
            {["Create Job", "Receive Applications", "Review AI Matches", "Hire Candidates"].map((label, index) => <div className={index === 0 ? "active" : ""} key={label}><span>{index === 0 ? <Check size={14} /> : index + 1}</span><strong>{label}</strong>{index < 3 && <ArrowRight size={14} />}</div>)}
        </div>
    );
}

export default function CreateJobPage() {
    const { recruiter } = useRecruiterAuth();
    const [form, setForm] = useState(initialForm);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [matchScores, setMatchScores] = useState(new Map());
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingWorkspace, setLoadingWorkspace] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [publishingState, setPublishingState] = useState("draft");
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const loadWorkspace = useCallback(async () => {
        try {
            const [jobData, applicationData] = await Promise.all([
                listRecruiterJobs(recruiter.id),
                getRecruiterApplications(recruiter.id).catch(() => ({ applications: [] })),
            ]);
            const applicationList = applicationData.applications || [];
            const idsWithApplicants = [...new Set(applicationList.map((application) => Number(application.job_id)).filter(Boolean))];
            const matchData = await Promise.all(idsWithApplicants.map((jobId) => getRecruiterCandidateMatches(recruiter.id, jobId).catch(() => ({ job_id: jobId, candidates: [] }))));
            setJobs(jobData);
            setApplications(applicationList);
            setMatchScores(new Map(matchData.map((result) => [Number(result.job_id), (result.candidates || []).map((candidate) => Number(candidate.match_score || 0))])));
        } catch (error) { setMessage({ type: "error", text: error.message }); }
        finally { setLoadingWorkspace(false); }
    }, [recruiter.id]);

    useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

    const skills = useMemo(() => parseSkills(form.skills), [form.skills]);
    const qualityChecks = useMemo(() => [
        { label: "Job title", complete: form.title.trim().length >= 3 },
        { label: "Employment type", complete: Boolean(form.employment_type) },
        { label: "Experience expectations", complete: Boolean(form.experience.trim()) },
        { label: "At least 3 required skills", complete: skills.length >= 3 },
        { label: "Detailed description", complete: form.description.trim().length >= 120 },
        { label: "Location or remote status", complete: Boolean(form.location.trim()) },
        { label: "Salary range", complete: Boolean(form.salary_range.trim()) },
        { label: "Application deadline", complete: Boolean(form.application_deadline) },
    ], [form, skills.length]);
    const qualityScore = Math.round((qualityChecks.filter((check) => check.complete).length / qualityChecks.length) * 100);
    const missing = qualityChecks.filter((check) => !check.complete).map((check) => check.label);
    const qualityLabel = qualityScore >= 88 ? "Excellent" : qualityScore >= 63 ? "Good" : "Needs improvement";
    const applicationCounts = useMemo(() => {
        const counts = new Map();
        applications.forEach((application) => counts.set(Number(application.job_id), (counts.get(Number(application.job_id)) || 0) + 1));
        return counts;
    }, [applications]);

    const update = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setPublishingState("draft");
        setLastUpdated(new Date());
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!skills.length) { setMessage({ type: "error", text: "Add at least one skill." }); return; }
        setLoading(true);
        setMessage(null);
        try {
            const data = await createRecruiterJob({
                title: form.title.trim(),
                company_name: recruiter.company_name,
                skills,
                experience: form.experience.trim(),
                employment_type: form.employment_type,
                location: form.location.trim(),
                salary_range: form.salary_range.trim(),
                application_deadline: form.application_deadline,
                description: form.description.trim(),
            }, recruiter.id);
            setForm(initialForm);
            setPublishingState("published");
            setLastUpdated(new Date());
            setMessage({ type: "success", text: data.message || "Hiring opportunity published." });
            await loadWorkspace();
        } catch (error) { setMessage({ type: "error", text: error.message }); }
        finally { setLoading(false); }
    };

    const mostAppliedJob = [...jobs].sort((left, right) => (applicationCounts.get(Number(right.job_id)) || 0) - (applicationCounts.get(Number(left.job_id)) || 0))[0];
    const strongestJob = jobs.map((job) => ({ job, score: average(matchScores.get(Number(job.job_id)) || []) })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score)[0];
    const skillCounts = new Map();
    jobs.flatMap((job) => job.skills || []).forEach((skill) => skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1));
    const topSkill = [...skillCounts.entries()].sort((left, right) => right[1] - left[1])[0];
    const insights = [
        mostAppliedJob && (applicationCounts.get(Number(mostAppliedJob.job_id)) || 0) > 0 && { icon: UsersRound, title: `${mostAppliedJob.title} attracts the most applicants`, text: `${applicationCounts.get(Number(mostAppliedJob.job_id))} applications received.` },
        strongestJob && { icon: Gauge, title: `${strongestJob.job.title} has the strongest alignment`, text: `${strongestJob.score}% average candidate match.` },
        topSkill && { icon: Target, title: `${topSkill[0]} is your most requested skill`, text: `Required across ${topSkill[1]} ${topSkill[1] === 1 ? "role" : "roles"}.` },
    ].filter(Boolean);

    const viewRoute = jobs[0] ? `/recruiter/candidate-matches?job_id=${jobs[0].job_id}` : "/recruiter/candidate-matches";

    return (
        <div className="job-creation-workspace">
            <header className="job-creation-header">
                <div><p className="eyebrow">Recruiter hiring workspace</p><h1>Create Hiring Opportunity</h1><p>Publish a role, attract candidates, and receive AI-ranked applications.</p></div>
                <div className="publishing-status"><span className={publishingState}><CheckCircle2 size={15} /> {publishingState === "published" ? "Published" : "Draft"}</span><small>Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>
            </header>

            <Alert type={message?.type}>{message?.text}</Alert>

            <div className="job-builder-layout">
                <form className="smart-job-form" onSubmit={submit}>
                    <FormSection icon={BriefcaseBusiness} eyebrow="Role details" title="Define the opportunity" description="Start with the role candidates will recognize.">
                        <label className="wide">Job title<input className="field" name="title" value={form.title} onChange={update} placeholder="e.g. Senior Backend Engineer" required /></label>
                        <label>Employment type<select className="field" name="employment_type" value={form.employment_type} onChange={update} required><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Remote</option></select></label>
                        <label>Experience<input className="field" name="experience" value={form.experience} onChange={update} placeholder="e.g. 3–5 Years" required /></label>
                    </FormSection>

                    <FormSection icon={FileText} eyebrow="Requirements" title="Describe the ideal candidate" description="Make expectations clear and easy to scan.">
                        <label className="wide">Required skills <span>Separate with commas</span><textarea className="field" name="skills" rows="3" value={form.skills} onChange={update} placeholder="Python, FastAPI, PostgreSQL, Docker" required /></label>
                        {skills.length > 0 && <div className="wide live-skill-preview"><SkillTags skills={skills} /></div>}
                        <label className="wide">Job description <span>{form.description.length} characters</span><textarea className="field" name="description" rows="7" value={form.description} onChange={update} placeholder="Describe responsibilities, outcomes, team context, and what success looks like…" required /></label>
                    </FormSection>

                    <FormSection icon={MapPin} eyebrow="Location & compensation" title="Set workplace expectations" description="Transparent details help candidates self-select.">
                        <label>Location<input className="field" name="location" value={form.location} onChange={update} placeholder="Bengaluru / Remote" required /></label>
                        <label>Salary range <span>Optional</span><input className="field" name="salary_range" value={form.salary_range} onChange={update} placeholder="e.g. ₹18–24 LPA" /></label>
                    </FormSection>

                    <FormSection icon={CalendarClock} eyebrow="Timeline" title="Plan the hiring window" description="Set expectations for when applications close.">
                        <label className="wide">Application deadline <span>Optional</span><input className="field" name="application_deadline" type="date" value={form.application_deadline} onChange={update} /></label>
                    </FormSection>

                    <div className="job-publish-bar"><div><span><Send size={16} /></span><div><strong>Ready to reach candidates?</strong><small>Your role becomes discoverable immediately after publishing.</small></div></div><Button type="submit" loading={loading}><Send size={16} /> Create Job</Button></div>
                </form>

                <aside className="job-builder-aside">
                    <section className="job-quality-card">
                        <div className="job-quality-head"><div><p>Job quality</p><h2>Post completeness</h2></div><span className={`quality-ring ${qualityScore >= 88 ? "excellent" : qualityScore >= 63 ? "good" : "needs-work"}`} style={{ "--job-quality": `${qualityScore * 3.6}deg` }}><b>{qualityScore}%</b></span></div>
                        <div className="quality-status"><span className={qualityScore >= 88 ? "excellent" : qualityScore >= 63 ? "good" : "needs-work"}>{qualityLabel}</span><small>{qualityChecks.filter((check) => check.complete).length} of {qualityChecks.length} quality signals complete</small></div>
                        <div className="quality-progress"><span style={{ width: `${qualityScore}%` }} /></div>
                        <div className="quality-guidance"><h3>{missing.length ? "Improve before publishing" : "Ready to publish"}</h3>{missing.length ? <ul>{missing.slice(0, 4).map((item) => <li key={item}><CircleAlert size={13} /> Add {item.toLowerCase()}</li>)}</ul> : <p><Check size={14} /> Your post includes every quality signal.</p>}</div>
                    </section>

                    <section className="candidate-job-preview">
                        <div className="candidate-preview-label"><Eye size={16} /><span><strong>Candidate view</strong><small>Live preview</small></span></div>
                        <div className="candidate-preview-hero"><span><BriefcaseBusiness size={19} /></span><div><small>{recruiter.company_name || "Your company"}</small><h2>{form.title || "Your job title"}</h2></div><b>{publishingState === "published" ? "Open" : "Preview"}</b></div>
                        <div className="candidate-preview-meta"><span><MapPin size={13} /> {form.location || "Location"}</span><span><BriefcaseBusiness size={13} /> {form.experience || "Experience"}</span><span><Clock3 size={13} /> {form.employment_type}</span>{form.salary_range && <span><Coins size={13} /> {form.salary_range}</span>}</div>
                        <div className="candidate-preview-skills"><small>Skills</small><SkillTags skills={skills.slice(0, 6)} emptyText="Required skills will appear here." /></div>
                        <div className="candidate-preview-description"><small>About the opportunity</small><p>{form.description || "Your job description preview will update as you type."}</p></div>
                        {form.application_deadline && <div className="candidate-preview-deadline"><CalendarDays size={14} /> Apply by {formatDate(form.application_deadline)}</div>}
                    </section>
                </aside>
            </div>

            <section className="existing-jobs-section">
                <div className="existing-jobs-head"><div><p className="eyebrow">Hiring portfolio</p><h2>Existing jobs</h2><span>Monitor performance and continue each hiring workflow.</span></div><b>{jobs.length} {jobs.length === 1 ? "job" : "jobs"}</b></div>
                {loadingWorkspace && <p className="jobs-workspace-empty">Loading your hiring opportunities…</p>}
                {!loadingWorkspace && !jobs.length && <div className="job-onboarding-empty"><div><Sparkles size={22} /><h3>Your first hiring journey starts here</h3><p>Complete the form above to publish an opportunity.</p></div><PublishingJourney /></div>}
                <div className="existing-job-grid">{jobs.map((job) => { const count = applicationCounts.get(Number(job.job_id)) || 0; const match = average(matchScores.get(Number(job.job_id)) || []); return <article className="existing-job-card" key={job.job_id}><div className="existing-job-top"><span><BriefcaseBusiness size={18} /></span><div><small>{job.company_name || recruiter.company_name}</small><h3>{job.title}</h3></div><b>{job.status || "Published"}</b></div><div className="existing-job-metrics"><div><small>Posted</small><strong>{formatDate(job.created_at)}</strong></div><div><small>Applications</small><strong>{count}</strong></div><div><small>Average match</small><strong>{match ? `${match}%` : "—"}</strong></div></div><SkillTags skills={(job.skills || []).slice(0, 5)} /><div className="existing-job-actions"><button type="button" onClick={() => setSelectedJob(job)}><Eye size={14} /> View</button><button type="button" disabled title="Editing published jobs is not supported by the current API"><PencilLine size={14} /> Edit</button><Link to={`/recruiter/candidate-matches?job_id=${job.job_id}`}><UsersRound size={14} /> Candidate matches</Link></div></article>; })}</div>
            </section>

            <div className="job-workspace-bottom">
                <section className="job-hiring-insights"><div className="job-bottom-head"><span><Lightbulb size={18} /></span><div><p>Hiring insights</p><h2>Signals from your current jobs</h2></div></div>{insights.length ? <div>{insights.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={17} /></span><div><strong>{title}</strong><p>{text}</p></div></article>)}</div> : <div className="job-insights-onboarding"><BarChart3 size={22} /><strong>Insights grow with your pipeline</strong><p>Publish jobs and receive applications to unlock hiring performance signals.</p></div>}</section>
                <section className="job-quick-actions"><div className="job-bottom-head"><span><Sparkles size={18} /></span><div><p>Quick actions</p><h2>Continue hiring</h2></div></div><nav><Link to={viewRoute}><UsersRound size={17} /><span><strong>View Applications</strong><small>Review your pipeline</small></span><ChevronRight size={14} /></Link><Link to={viewRoute}><Target size={17} /><span><strong>Candidate Matches</strong><small>Explore AI ranking</small></span><ChevronRight size={14} /></Link><Link to="/recruiter/dashboard"><Gauge size={17} /><span><strong>Dashboard</strong><small>Return to command center</small></span><ChevronRight size={14} /></Link></nav></section>
            </div>

            <Modal open={Boolean(selectedJob)} title={selectedJob?.title || "Job opportunity"} onClose={() => setSelectedJob(null)} actions={selectedJob && <Link className="btn btn-primary" to={`/recruiter/candidate-matches?job_id=${selectedJob.job_id}`}>Candidate Matches <ArrowRight size={15} /></Link>}>
                {selectedJob && <div className="recruiter-job-detail"><div className="recruiter-job-detail-meta"><span><MapPin size={14} /> {selectedJob.location || "Not specified"}</span><span><BriefcaseBusiness size={14} /> {selectedJob.experience}</span><span><Clock3 size={14} /> {selectedJob.employment_type || "Full-time"}</span>{selectedJob.salary_range && <span><Coins size={14} /> {selectedJob.salary_range}</span>}</div><section><h3>Required skills</h3><SkillTags skills={selectedJob.skills} /></section><section><h3>About the opportunity</h3><p>{selectedJob.description}</p></section></div>}
            </Modal>
        </div>
    );
}
