import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, CircleAlert, ClipboardCheck, Eye, FileSearch, Gauge, Medal, Scale, Sparkles, Target, Trophy, UserCheck, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import Modal from "../../../components/common/Modal.jsx";
import MatchScore from "../../../components/common/MatchScore.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import { useRecruiterAuth } from "../../../context/RecruiterAuthContext.jsx";
import { getRecruiterApplications, getRecruiterCandidateMatches, updateRecruiterApplicationStatus } from "../../../services/recruiterCandidateMatchService.js";
import { listRecruiterJobs } from "../../../services/recruiterJobService.js";
import { formatDate, titleCase } from "../../../utils/formatters.js";

const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length) : 0;
const statusCount = (items, terms) => items.filter((item) => terms.some((term) => String(item.status || "").toLowerCase().includes(term))).length;

function Metric({ icon: Icon, label, value, note, tone }) {
    return <article className={`match-overview-card ${tone}`}><span><Icon size={19} /></span><div><small>{label}</small><strong title={String(value)}>{value}</strong><p>{note}</p></div></article>;
}

function Pipeline({ applications, candidates }) {
    const stages = [
        ["Applied", applications.length, ClipboardCheck],
        ["Matched", candidates.filter((candidate) => Number(candidate.match_score || 0) > 0).length, Sparkles],
        ["Shortlisted", statusCount(applications, ["shortlist"]), UserCheck],
        ["Interview", statusCount(applications, ["interview"]), UsersRound],
        ["Offer", statusCount(applications, ["offer", "hired"]), Check],
    ];
    return <div className="match-pipeline-flow">{stages.map(([label, value, Icon], index) => <div className={`match-pipeline-stage stage-${label.toLowerCase()}`} key={label}><span><Icon size={16} /></span><small>{label}</small><strong>{value}</strong>{index < stages.length - 1 && <ArrowRight size={15} />}</div>)}</div>;
}

function Onboarding({ hasJob }) {
    const steps = hasJob ? ["Job Published", "Await Applications", "Generate Rankings", "Review Talent"] : ["Publish Job", "Receive Applications", "Generate AI Rankings", "Review Top Candidates"];
    return <section className={`matches-onboarding ${hasJob ? "compact" : ""}`}><div>{hasJob ? <UsersRound size={24} /> : <BriefcaseBusiness size={25} />}<h2>{hasJob ? "No applications for this role yet" : "Start your AI-ranked pipeline"}</h2><p>{hasJob ? "Candidate rankings appear after the first application arrives." : "Publish a role to begin receiving and ranking applicants."}</p>{!hasJob && <Link className="btn btn-primary" to="/recruiter/create-job">Publish Job</Link>}</div><ol>{steps.map((step, index) => <li className={hasJob && index === 0 ? "complete" : index === (hasJob ? 1 : 0) ? "current" : ""} key={step}><span>{hasJob && index === 0 ? <Check size={14} /> : index + 1}</span><strong>{step}</strong>{index < 3 && <ArrowRight size={14} />}</li>)}</ol></section>;
}

export default function CandidateMatchesPage() {
    const { recruiter } = useRecruiterAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedJobId = useRef(Number(searchParams.get("job_id")) || null);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [jobResults, setJobResults] = useState(new Map());
    const [jobId, setJobId] = useState(() => Number(searchParams.get("job_id")) || "");
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState(null);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [ranking, setRanking] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [compareIds, setCompareIds] = useState([]);
    const [resumeCandidate, setResumeCandidate] = useState(null);
    const [scoreExplanation, setScoreExplanation] = useState(null);

    const fetchMatches = useCallback(async (selectedJobId) => {
        if (!selectedJobId) return;
        setRanking(true);
        setMessage(null);
        setSearchParams({ job_id: String(selectedJobId) });
        try {
            const data = await getRecruiterCandidateMatches(recruiter.id, selectedJobId);
            setResult(data);
            setJobResults((current) => new Map(current).set(Number(selectedJobId), data));
            setSelectedId(data.candidates?.[0]?.application_id || null);
            setCompareIds([]);
        } catch (error) {
            setResult(null);
            setMessage({ type: "error", text: /does not own/i.test(error.message) ? "This job does not belong to the current recruiter." : error.message });
        } finally { setRanking(false); }
    }, [recruiter.id, setSearchParams]);

    useEffect(() => {
        let active = true;
        Promise.all([listRecruiterJobs(recruiter.id), getRecruiterApplications(recruiter.id).catch(() => ({ applications: [] }))])
            .then(async ([jobData, applicationData]) => {
                const preload = await Promise.all(jobData.map((job) => getRecruiterCandidateMatches(recruiter.id, job.job_id).catch(() => ({ job_id: job.job_id, job_title: job.title, candidates: [] }))));
                if (!active) return;
                const resultMap = new Map(preload.map((item) => [Number(item.job_id), item]));
                const initialJob = jobData.find((job) => job.job_id === requestedJobId.current) || jobData[0];
                const initialResult = initialJob ? resultMap.get(Number(initialJob.job_id)) : null;
                setJobs(jobData);
                setApplications(applicationData.applications || []);
                setJobResults(resultMap);
                if (initialJob) setJobId(initialJob.job_id);
                setResult(initialResult);
                setSelectedId(initialResult?.candidates?.[0]?.application_id || null);
            })
            .catch((error) => active && setMessage({ type: "error", text: error.message }))
            .finally(() => active && setLoadingJobs(false));
        return () => { active = false; };
    }, [recruiter.id]);

    const selectJob = (value) => {
        const id = Number(value) || "";
        const cached = id ? jobResults.get(Number(id)) : null;
        setJobId(id);
        if (id) setSearchParams({ job_id: String(id) });
        else setSearchParams({});
        setResult(cached || null);
        setSelectedId(cached?.candidates?.[0]?.application_id || null);
        setCompareIds([]);
    };
    const candidates = result?.candidates || [];
    const selectedJob = jobs.find((job) => job.job_id === Number(jobId));
    const selectedApplications = applications.filter((application) => Number(application.job_id) === Number(jobId));
    const selectedCandidate = candidates.find((candidate) => candidate.application_id === selectedId) || candidates[0];
    const avgScore = average(candidates.map((candidate) => candidate.match_score));
    const topScore = candidates.length ? Math.max(...candidates.map((candidate) => Number(candidate.match_score || 0))) : 0;
    const ready = selectedApplications.filter((application) => !application.status || /pending|applied/i.test(application.status)).length;
    const toggleCompare = (id) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
    const changeStatus = async (applicationId, nextStatus) => {
        try {
            const updated = await updateRecruiterApplicationStatus(applicationId, nextStatus);
            setApplications((current) => current.map((item) => item.application_id === applicationId ? { ...item, status: updated.status } : item));
            setResult((current) => current ? {
                ...current,
                candidates: current.candidates.map((candidate) => candidate.application_id === applicationId ? { ...candidate, application_status: updated.status } : candidate),
            } : current);
            setMessage({ type: "success", text: "Application status updated." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        }
    };
    const compared = compareIds.map((id) => candidates.find((candidate) => candidate.application_id === id)).filter(Boolean);

    const insights = (() => {
        const frequency = new Map();
        candidates.flatMap((candidate) => candidate.matched_skills || []).forEach((skill) => frequency.set(skill, (frequency.get(skill) || 0) + 1));
        const topSkill = [...frequency.entries()].sort((left, right) => right[1] - left[1])[0];
        const above80 = candidates.filter((candidate) => Number(candidate.match_score || 0) >= 80).length;
        const quality = avgScore >= 75 ? "high" : avgScore >= 50 ? "moderate" : candidates.length ? "developing" : "unavailable";
        return [
            candidates.length && [Trophy, `${above80} ${above80 === 1 ? "candidate is" : "candidates are"} above 80% match.`],
            topSkill && [Target, `${topSkill[0]} is the most common matched skill (${topSkill[1]} candidates).`],
            candidates.length && [Gauge, `Candidate pool quality is ${quality} at ${avgScore}% average alignment.`],
            candidates.length && [BarChart3, `${candidates.length - above80} candidates remain below the high-match threshold.`],
        ].filter(Boolean);
    })();

    return (
        <div className="candidate-matching-center">
            <header className="match-center-header"><div><p className="eyebrow">AI talent ranking</p><h1>Candidate Matching Center</h1><p>Review AI-ranked applicants and identify the strongest candidates for each role.</p></div><span><Sparkles size={18} /><span><strong>Evidence-based ranking</strong><small>Skills · Resume relevance · Role fit</small></span></span></header>

            <section className="match-overview-grid">
                <Metric icon={BriefcaseBusiness} label="Selected job" value={selectedJob?.title || "Choose a job"} note={selectedJob?.experience || "No role selected"} tone="job" />
                <Metric icon={UsersRound} label="Total applicants" value={selectedApplications.length} note="For this role" tone="applicants" />
                <Metric icon={Gauge} label="Average match" value={`${avgScore}%`} note="Candidate pool" tone="average" />
                <Metric icon={Trophy} label="Top match" value={`${Math.round(topScore)}%`} note="Highest-ranked candidate" tone="top" />
            </section>

            <section className="match-job-workspace">
                <form onSubmit={(event) => { event.preventDefault(); fetchMatches(jobId); }}><label><span>Hiring opportunity</span><select className="field" value={jobId} onChange={(event) => selectJob(event.target.value)} disabled={loadingJobs || !jobs.length} required><option value="">{loadingJobs ? "Loading opportunities…" : "Select a job"}</option>{jobs.map((job) => { const summary = jobResults.get(Number(job.job_id)); const count = summary?.candidates?.length || 0; const score = average((summary?.candidates || []).map((candidate) => candidate.match_score)); return <option key={job.job_id} value={job.job_id}>{job.title} · {count} applicants · {score}% avg</option>; })}</select></label><Button type="submit" loading={ranking} disabled={!jobId}><Sparkles size={16} /> View Matches</Button></form>
                <div className="selected-job-summary"><div><small>Role</small><strong>{selectedJob?.title || "—"}</strong></div><div><small>Applications</small><strong>{selectedApplications.length}</strong></div><div><small>Top match</small><strong>{Math.round(topScore)}%</strong></div><div><small>Ready for review</small><strong>{ready}</strong></div></div>
                <Alert type={message?.type}>{message?.text}</Alert>
            </section>

            {!loadingJobs && !jobs.length && <Onboarding hasJob={false} />}
            {selectedJob && !candidates.length && !ranking && <Onboarding hasJob />}

            {candidates.length > 0 && <>
                <section className="candidate-leaderboard-section">
                    <div className="match-section-head"><div><p>Candidate leaderboard</p><h2>Ranked talent for {selectedJob?.title}</h2><span>Compare skill evidence and decide who moves forward.</span></div><b>{candidates.length} ranked</b></div>
                    <div className="candidate-leaderboard">{candidates.map((candidate, index) => <CandidateCard key={candidate.application_id} candidate={candidate} index={index} selected={selectedCandidate?.application_id === candidate.application_id} comparing={compareIds.includes(candidate.application_id)} experience={selectedJob?.experience} onSelect={() => setSelectedId(candidate.application_id)} onResume={() => setResumeCandidate(candidate)} onCompare={() => toggleCompare(candidate.application_id)} onExplain={() => setScoreExplanation(candidate)} onStatusChange={(status) => changeStatus(candidate.application_id, status)} />)}</div>
                </section>

                <div className="match-analysis-grid">
                    <Explanation candidate={selectedCandidate} experience={selectedJob?.experience} />
                    <aside className="shortlist-pipeline-section"><div className="match-section-head"><div><p>Shortlist pipeline</p><h2>Hiring stages</h2></div></div><Pipeline applications={selectedApplications} candidates={candidates} /><p className="pipeline-api-note"><CircleAlert size={13} /> Use each candidate's status dropdown to move applications through the pipeline.</p></aside>
                </div>

                <Comparison candidates={compared} selectedCount={compareIds.length} experience={selectedJob?.experience} />

                <section className="match-hiring-insights"><div className="match-section-head"><div><p>Hiring insights</p><h2>Signals from this candidate pool</h2></div><Sparkles size={18} /></div><div>{insights.map(([Icon, text]) => <article key={text}><span><Icon size={17} /></span><p>{text}</p></article>)}</div></section>
            </>}

            <ResumeEvidence candidate={resumeCandidate} onClose={() => setResumeCandidate(null)} />
            <Modal open={Boolean(scoreExplanation)} title="Why this match score?" onClose={() => setScoreExplanation(null)}>
                {scoreExplanation && <div className="match-explanation-modal">
                    <MatchScore score={scoreExplanation.match_score} matchedCount={(scoreExplanation.matched_skills || []).length} missingCount={(scoreExplanation.missing_skills || []).length} />
                    <p>This live recruiter ranking uses the candidate resume evidence available to the matching workflow and may differ from the candidate's application-time snapshot.</p>
                    <div><strong>Matched skills</strong><SkillTags skills={scoreExplanation.matched_skills} emptyText="No direct skill matches detected." /></div>
                    <div><strong>Missing skills</strong><SkillTags skills={scoreExplanation.missing_skills} missing emptyText="No major skill gaps detected." /></div>
                </div>}
            </Modal>
        </div>
    );
}

function CandidateCard({ candidate, index, selected, comparing, onSelect, onResume, onCompare, onExplain, onStatusChange }) {
    return <article className={`leaderboard-candidate-card ${index < 3 ? `top-${index + 1}` : ""} ${selected ? "selected" : ""}`} onClick={onSelect}>
        <div className="leaderboard-candidate-head">
            <span className="leaderboard-rank">{index < 3 ? <Medal size={17} /> : `#${index + 1}`}</span>
            <span className="leaderboard-avatar">{candidate.candidate_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C"}</span>
            <div><h3>{candidate.candidate_name || "Candidate"}</h3><p><CalendarDays size={12} /> Applied {candidate.applied_at ? formatDate(candidate.applied_at) : "date unavailable"}</p></div>
            <MatchScore className="recruiter-candidate-match-score" score={candidate.match_score} matchedCount={candidate.matched_skills?.length || 0} missingCount={candidate.missing_skills?.length || 0} compact onExplain={(event) => { event.stopPropagation(); onExplain(); }} />
        </div>
        <div className="leaderboard-priority-row">
            <span className="priority-matched"><CheckCircle2 size={14} /><small>Matched:</small><strong>{candidate.matched_skills?.length || 0} skills</strong></span>
            <span className="priority-missing"><CircleAlert size={14} /><small>Missing:</small><strong>{candidate.missing_skills?.length || 0} skills</strong></span>
            <span className="priority-status"><ClipboardCheck size={14} /><small>Status:</small><strong>{titleCase(candidate.application_status || "Applied")}</strong></span>
        </div>
        <div className="leaderboard-skill-grid"><div><small><CheckCircle2 size={13} /> Matched skills</small><SkillTags skills={candidate.matched_skills} emptyText="No matched skills." /></div><div><small><CircleAlert size={13} /> Missing skills</small><SkillTags skills={candidate.missing_skills} missing emptyText="No missing skills." /></div></div>
        <div className="leaderboard-actions"><button type="button" onClick={(event) => { event.stopPropagation(); onResume(); }}><Eye size={14} /> View Resume</button><button type="button" className={comparing ? "active" : ""} onClick={(event) => { event.stopPropagation(); onCompare(); }}><Scale size={14} /> {comparing ? "Selected" : "Compare"}</button><select aria-label="Application status" value={String(candidate.application_status || "APPLIED").toUpperCase()} onClick={(event) => event.stopPropagation()} onChange={(event) => onStatusChange(event.target.value)}><option value="APPLIED">Applied</option><option value="UNDER_REVIEW">Under Review</option><option value="SHORTLISTED">Shortlisted</option><option value="INTERVIEW">Interview</option><option value="OFFER">Offer</option><option value="HIRED">Hired</option><option value="REJECTED">Rejected</option></select></div>
    </article>;
}

function Explanation({ candidate, experience }) {
    if (!candidate) return null;
    const total = (candidate.matched_skills?.length || 0) + (candidate.missing_skills?.length || 0);
    return <section className="ai-match-explanation"><div className="match-section-head"><div><p>Live AI match explanation</p><h2>Why {candidate.candidate_name} ranks highly</h2></div><Sparkles size={18} /></div><div className="explanation-list"><article><span><CheckCircle2 size={17} /></span><div><strong>{candidate.matched_skills?.length || 0}/{total} required skills matched</strong><p>{candidate.matched_skills?.slice(0, 4).join(", ") || "No direct skills matched."}</p></div></article><article><span><Gauge size={17} /></span><div><strong>{Math.round(Number(candidate.match_score || 0))}% overall role alignment</strong><p>Calculated from current resume evidence for recruiter review; application tracker scores are saved snapshots.</p></div></article><article><span><BriefcaseBusiness size={17} /></span><div><strong>Experience requirement: {experience}</strong><p>Experience and resume relevance contribute to the overall ranking.</p></div></article>{candidate.missing_skills?.length > 0 && <article className="attention"><span><CircleAlert size={17} /></span><div><strong>{candidate.missing_skills.length} skill gaps to review</strong><p>{candidate.missing_skills.slice(0, 4).join(", ")}</p></div></article>}</div></section>;
}

function Comparison({ candidates, selectedCount, experience }) {
    return <section className="candidate-comparison-section"><div className="match-section-head"><div><p>Candidate comparison</p><h2>Compare finalists side by side</h2><span>Select up to two candidates from the leaderboard.</span></div><span>{selectedCount}/2 selected</span></div>{candidates.length ? <div className={`candidate-comparison-grid count-${candidates.length}`}>{candidates.map((candidate) => <article key={candidate.application_id}><div className="comparison-candidate-head"><span>{candidate.candidate_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><h3>{candidate.candidate_name}</h3><p>{candidate.candidate_email || "Email unavailable"}</p></div></div><dl><div><dt>Match score</dt><dd>{Math.round(Number(candidate.match_score || 0))}%</dd></div><div><dt>Skills matched</dt><dd>{candidate.matched_skills?.length || 0}</dd></div><div><dt>Experience target</dt><dd>{experience}</dd></div><div><dt>Resume score</dt><dd title="Not provided by the current API">—</dd></div></dl><SkillTags skills={candidate.matched_skills} emptyText="No matched skills." /></article>)}</div> : <div className="comparison-empty"><Scale size={22} /><p>Select candidates using the Compare action to evaluate them side by side.</p></div>}</section>;
}

function ResumeEvidence({ candidate, onClose }) {
    return <Modal open={Boolean(candidate)} title={`${candidate?.candidate_name || "Candidate"} · Resume evidence`} onClose={onClose}>{candidate && <div className="resume-evidence-modal"><div className="resume-evidence-summary"><span>{candidate.candidate_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><h3>{candidate.candidate_name}</h3><p>{candidate.candidate_email || "Email unavailable"}</p></div><b>{Math.round(Number(candidate.match_score || 0))}% match</b></div><p className="resume-access-note"><FileSearch size={14} /> This view contains resume evidence returned by the ranking API. The original document is not exposed by the current recruiter API.</p><section><h3>Matched skills</h3><SkillTags skills={candidate.matched_skills} /></section><section><h3>Missing requirements</h3><SkillTags skills={candidate.missing_skills} missing /></section></div>}</Modal>;
}
