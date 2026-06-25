import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    BriefcaseBusiness,
    Check,
    CircleAlert,
    Code2,
    FilePenLine,
    FileText,
    FolderKanban,
    Gauge,
    Lightbulb,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Alert from "../common/Alert.jsx";
import Button from "../common/Button.jsx";
import SkillTags from "../common/SkillTags.jsx";
import { useActiveResumeId } from "../../context/ResumeContext.jsx";
import { generateAIFeedback } from "../../services/aiFeedbackService.js";
import { listJobDescriptions } from "../../services/jobService.js";
import { matchResumeToJob } from "../../services/matchingService.js";
import { getParsedResume } from "../../services/resumeService.js";
import { collectResumeSkills, normalizeRecords } from "../../utils/resumeData.js";

async function getCoachResults(resumeId, jobId) {
    const [matchResult, feedbackResult, parsedResult] = await Promise.allSettled([
        matchResumeToJob({ resume_id: resumeId, job_id: jobId }),
        generateAIFeedback({ resume_id: resumeId, job_id: jobId }),
        getParsedResume(resumeId),
    ]);
    if (matchResult.status === "rejected") throw matchResult.reason;
    return {
        match: matchResult.value,
        feedback: feedbackResult.status === "fulfilled" ? feedbackResult.value.feedback : null,
        parsed: parsedResult.status === "fulfilled" ? parsedResult.value.parsed_data || {} : {},
        feedbackError: feedbackResult.status === "rejected" ? feedbackResult.reason : null,
    };
}

function calculateResumeScore(parsed) {
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const personal = source.personal_information || source.contact || {};
    const skills = collectResumeSkills(source);
    const experience = normalizeRecords(source.work_experience || source.experience);
    const projects = normalizeRecords(source.project_details || source.projects || source.project_experience);
    const education = normalizeRecords(source.education);
    return Math.min(100,
        (personal.full_name || source.name ? 12 : 0) +
        (personal.email ? 8 : 0) +
        (personal.phone ? 5 : 0) +
        (source.professional_summary || source.summary ? 15 : 0) +
        (skills.length >= 5 ? 20 : skills.length * 3) +
        (experience.length ? 20 : 0) +
        (projects.length ? 12 : 0) +
        (education.length ? 8 : 0));
}

function CoachMetric({ icon: Icon, label, value, note, tone }) {
    return (
        <article className={`coach-metric-card ${tone || ""}`}>
            <span><Icon size={20} /></span>
            <div><small>{label}</small><strong title={String(value)}>{value}</strong><p>{note}</p></div>
        </article>
    );
}

function ImprovementGroup({ tone, label, icon: Icon, items }) {
    return (
        <article className={`priority-group ${tone}`}>
            <div className="priority-group-head"><span><Icon size={17} /></span><div><h3>{label}</h3><p>{items.length} recommended {items.length === 1 ? "action" : "actions"}</p></div></div>
            <ul>{items.length ? items.map((item, index) => <li key={`${item}-${index}`}><span>{index + 1}</span>{item}</li>) : <li className="priority-complete"><Check size={15} /> No urgent improvements in this category.</li>}</ul>
        </article>
    );
}

function InsightList({ title, icon: Icon, items, emptyText, tone }) {
    return (
        <article className={`strength-insight-card ${tone || ""}`}>
            <div><span><Icon size={17} /></span><h3>{title}</h3></div>
            {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}><Check size={14} />{item}</li>)}</ul> : <p>{emptyText}</p>}
        </article>
    );
}

function RoadmapStep({ number, icon: Icon, title, items }) {
    return (
        <article className="roadmap-step">
            <span className="roadmap-number">{number}</span>
            <span className="roadmap-icon"><Icon size={18} /></span>
            <div><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
        </article>
    );
}

export default function AnalysisWorkspace() {
    const navigate = useNavigate();
    const { latestResume, loadingLatestResume, resumeError } = useActiveResumeId();
    const [context, setContext] = useState(null);
    const [match, setMatch] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [parsed, setParsed] = useState({});
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [missingSetup, setMissingSetup] = useState(null);
    const [activeGoalVersion, setActiveGoalVersion] = useState(0);

    useEffect(() => {
        const refreshActiveGoal = () => setActiveGoalVersion((version) => version + 1);
        window.addEventListener("talentsync:active-goal-changed", refreshActiveGoal);
        window.addEventListener("storage", refreshActiveGoal);
        window.addEventListener("focus", refreshActiveGoal);
        return () => {
            window.removeEventListener("talentsync:active-goal-changed", refreshActiveGoal);
            window.removeEventListener("storage", refreshActiveGoal);
            window.removeEventListener("focus", refreshActiveGoal);
        };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        if (loadingLatestResume) return () => { active = false; };
        Promise.all([listJobDescriptions()])
            .then(async ([jobs]) => {
                if (!latestResume || !jobs.length) {
                    if (active) setMissingSetup(!latestResume ? "resume" : "target");
                    return;
                }
                if (active) setMissingSetup(null);
                const storedJobId = Number(sessionStorage.getItem("talentsync.matchJobId"));
                const resume = { ...latestResume, id: latestResume.resume_id };
                const job = jobs.find((item) => item.id === storedJobId) || jobs[0];
                sessionStorage.setItem("talentsync.matchResumeId", String(resume.id));
                sessionStorage.setItem("talentsync.matchJobId", String(job.id));
                if (active) setContext({ resume, job });
                const results = await getCoachResults(resume.id, job.id);
                if (!active) return;
                setMatch(results.match);
                setFeedback(results.feedback);
                setParsed(results.parsed);
                if (results.feedbackError) setMessage({ type: "error", text: "Resume alignment is ready, but detailed coaching could not be refreshed." });
            })
            .catch((error) => active && setMessage({ type: "error", text: error.message }))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [latestResume, loadingLatestResume, activeGoalVersion]);

    const refresh = async () => {
        if (!context) return;
        setGenerating(true);
        setMessage(null);
        try {
            const results = await getCoachResults(context.resume.id, context.job.id);
            setMatch(results.match);
            setFeedback(results.feedback);
            setParsed(results.parsed);
            setMessage({ type: results.feedbackError ? "error" : "success", text: results.feedbackError ? "Alignment refreshed; detailed coaching is temporarily unavailable." : "Your coaching plan is up to date." });
        } catch (error) { setMessage({ type: "error", text: error.message }); }
        finally { setGenerating(false); }
    };

    const resumeSkills = useMemo(() => collectResumeSkills(parsed), [parsed]);
    const resumeScore = calculateResumeScore(parsed);
    const currentScore = Math.round(Number(match?.match_score || feedback?.resume_score || 0));
    const matchedSkills = match?.matched_skills || [];
    const missingSkills = match?.missing_skills || feedback?.missing_skills || [];
    const targetSkills = context?.job?.parsed_job_data?.required_skills || [...matchedSkills, ...missingSkills];
    const skillCoverage = targetSkills.length ? Math.round((matchedSkills.length / targetSkills.length) * 100) : 0;
    const highPriority = [...new Set([...(feedback?.weaknesses || []).slice(0, 2), ...missingSkills.slice(0, 2).map((skill) => `Build credible experience with ${skill}`)])].slice(0, 4);
    const mediumPriority = (feedback?.suggestions || []).slice(0, 3);
    const lowPriority = ["Refine formatting for faster recruiter scanning", "Keep portfolio links and contact details current"];
    const predictedScore = Math.min(100, currentScore + Math.min(35, Math.max(8, missingSkills.length * 7)));
    const improvement = predictedScore - currentScore;
    const projectIdeas = missingSkills.length
        ? missingSkills.slice(0, 3).map((skill) => `Build a practical ${skill} project with measurable outcomes`)
        : ["Expand your strongest project with measurable business impact"];
    const resumeImprovements = (feedback?.suggestions || []).slice(0, 3).length
        ? (feedback?.suggestions || []).slice(0, 3)
        : ["Quantify achievements in experience and project descriptions"];

    if (loading) return <div className="coach-loading"><BrainCircuit size={28} /><h2>Building your coaching plan</h2><p>Reviewing your latest resume against your active career target…</p></div>;

    if (missingSetup) return (
        <section className="coach-setup-empty">
            <span>{missingSetup === "resume" ? <FileText size={27} /> : <Target size={27} />}</span>
            <h2>{missingSetup === "resume" ? "Add your resume to begin" : "Define your career target first"}</h2>
            <p>{missingSetup === "resume" ? (resumeError === "Resume parsing failed" ? "Resume parsing failed. Please upload resume." : "Upload your resume first to unlock AI matching.") : "Choose the role you want so your coach can build a focused improvement plan."}</p>
            <Button onClick={() => navigate(missingSetup === "resume" ? "/candidate/resume" : "/candidate/job-description")}>{missingSetup === "resume" ? "Open Resume Intelligence" : "Create Career Target"} <ArrowRight size={16} /></Button>
        </section>
    );

    return (
        <div className="career-coach-workspace">
            <Alert type={message?.type}>{message?.text}</Alert>
            <section className="coach-context-bar">
                <div><span><FileText size={16} /></span><small>Resume</small><strong>{context?.resume?.parsed_name || context?.resume?.filename}</strong></div>
                <ArrowRight size={16} />
                <div><span><Target size={16} /></span><small>Active career goal</small><strong>{context?.job?.title}</strong></div>
                <Button variant="secondary" size="sm" loading={generating} onClick={refresh}><RefreshCw size={14} /> Refresh coaching</Button>
            </section>

            <section className="coach-overview-section">
                <div className="coach-section-title"><div><p>Career readiness overview</p><h2>Your position today</h2></div><span>Automatically uses your latest resume and active target</span></div>
                <div className="coach-metric-grid">
                    <CoachMetric icon={FileText} label="Resume score" value={`${resumeScore}%`} note="Profile completeness" tone="resume" />
                    <CoachMetric icon={Gauge} label="Career readiness" value={`${currentScore}%`} note={currentScore >= 70 ? "Strong alignment" : "Growth opportunity"} tone="readiness" />
                    <CoachMetric icon={Target} label="Career goal" value={context?.job?.title || "Not set"} note={`${targetSkills.length} priority skills`} tone="target" />
                    <CoachMetric icon={TrendingUp} label="Skill coverage" value={`${skillCoverage}%`} note={`${matchedSkills.length} of ${targetSkills.length} priority skills aligned`} tone="match" />
                </div>
            </section>

            <section className="coach-panel">
                <div className="coach-panel-head"><span><CircleAlert size={19} /></span><div><p>Priority improvements</p><h2>What to work on next</h2></div></div>
                <div className="priority-grid">
                    <ImprovementGroup tone="high" label="High priority" icon={CircleAlert} items={highPriority} />
                    <ImprovementGroup tone="medium" label="Medium priority" icon={Lightbulb} items={mediumPriority} />
                    <ImprovementGroup tone="low" label="Low priority" icon={BookOpenCheck} items={lowPriority} />
                </div>
            </section>

            <section className="coach-panel">
                <div className="coach-panel-head"><span><ShieldCheck size={19} /></span><div><p>Strength analysis</p><h2>Your competitive foundation</h2></div></div>
                <div className="strength-grid">
                    <InsightList title="Existing strengths" icon={ShieldCheck} items={feedback?.strengths || []} emptyText="Add more evidence of impact to reveal stronger signals." tone="strength" />
                    <InsightList title="Competitive advantages" icon={Rocket} items={matchedSkills.slice(0, 5).map((skill) => `${skill} aligns directly with your target role`)} emptyText="Direct role advantages will appear after alignment improves." tone="advantage" />
                    <InsightList title="Valuable skills" icon={Sparkles} items={resumeSkills.slice(0, 5)} emptyText="Add skills to your resume to strengthen your profile." tone="valuable" />
                </div>
            </section>

            <section className="coach-panel">
                <div className="coach-panel-head"><span><BarChart3 size={19} /></span><div><p>Skill gap analysis</p><h2>Where your skills stand</h2></div></div>
                <div className="coach-skill-grid">
                    <div className="coach-skill-column have"><h3><Check size={16} /> Skills you have <span>{matchedSkills.length}</span></h3><SkillTags skills={matchedSkills} emptyText="No direct matches identified yet." /></div>
                    <div className="coach-skill-column missing"><h3><CircleAlert size={16} /> Skills missing <span>{missingSkills.length}</span></h3><SkillTags skills={missingSkills} missing emptyText="No required skills are missing." /></div>
                    <div className="coach-skill-column demand"><h3><TrendingUp size={16} /> Market demand <span>{targetSkills.length}</span></h3><SkillTags skills={targetSkills.slice(0, 8)} emptyText="Add required skills to your career target." /></div>
                </div>
            </section>

            <section className="coach-panel roadmap-panel">
                <div className="coach-panel-head"><span><Rocket size={19} /></span><div><p>Improvement roadmap</p><h2>A practical path forward</h2></div></div>
                <div className="coach-roadmap">
                    <RoadmapStep number="01" icon={FolderKanban} title="Build proof through projects" items={projectIdeas} />
                    <RoadmapStep number="02" icon={Code2} title="Close technology gaps" items={missingSkills.slice(0, 3).length ? missingSkills.slice(0, 3).map((skill) => `Develop working proficiency in ${skill}`) : ["Deepen expertise in your strongest technologies"]} />
                    <RoadmapStep number="03" icon={FilePenLine} title="Strengthen your resume" items={resumeImprovements} />
                    <RoadmapStep number="04" icon={BriefcaseBusiness} title="Upgrade your portfolio" items={["Show the problem, your decisions, and measurable outcomes", "Feature work that demonstrates target-role skills"]} />
                </div>
            </section>

            <section className="impact-forecast-section">
                <div className="impact-forecast-copy"><p><Sparkles size={14} /> Impact forecast</p><h2>Your improvement potential</h2><span>Estimated impact after completing the priority roadmap.</span></div>
                <div className="forecast-score current"><small>Current match</small><strong>{currentScore}%</strong><div><span style={{ width: `${currentScore}%` }} /></div></div>
                <ArrowRight className="forecast-arrow" size={21} />
                <div className="forecast-score predicted"><small>Predicted match</small><strong>{predictedScore}%</strong><div><span style={{ width: `${predictedScore}%` }} /></div></div>
                <div className="forecast-uplift"><TrendingUp size={18} /><span><strong>+{improvement}%</strong><small>potential improvement</small></span></div>
            </section>
        </div>
    );
}
