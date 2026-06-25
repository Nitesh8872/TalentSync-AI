import { Bookmark, BriefcaseBusiness, Building2, CalendarDays, CircleCheck, MapPin, Sparkles, Target, Wifi } from "lucide-react";

import { formatDate, trimText } from "../../utils/formatters.js";
import Button from "../common/Button.jsx";
import MatchScore from "../common/MatchScore.jsx";
import SkillTags from "../common/SkillTags.jsx";
import ApplicationButton from "./ApplicationButton.jsx";

const getMeta = (job) => {
    const value = (labels) => {
        for (const label of labels) {
            const match = String(job.description || "").match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]+)`, "i"));
            if (match?.[1]) return match[1].trim();
        }
        return "";
    };
    const workMode = value(["Work mode", "Work type", "Workplace"]) || (/\bremote\b/i.test(job.description) ? "Remote" : /\bhybrid\b/i.test(job.description) ? "Hybrid" : "Flexible");
    return { company: value(["Company(?: name)?", "Organization", "Employer"]) || "Company confidential", location: value(["Location", "Preferred location"]) || (workMode === "Remote" ? "Remote" : "Location flexible"), workMode, salary: value(["Salary(?: range)?", "Compensation"]) };
};

export default function JobCard({ job, candidateId, onDetails, onMessage, rank, recommended = false, saved = false, onToggleSave }) {
    const meta = getMeta(job);
    const score = Math.round(Number(job.match_score || 0));
    const matched = job.matched_skills || [];
    const missing = job.missing_skills || [];

    return (
        <article className="discovery-job-card">
            <div className="discovery-card-topline">
                <span className="discovery-company-mark"><Building2 size={20} /></span>
                {recommended && <div className="discovery-rank"><Sparkles size={13} /> Recommended #{rank || 1}</div>}
                {onToggleSave && <button className={`save-job-button ${saved ? "saved" : ""}`} type="button" aria-label={saved ? "Remove from saved jobs" : "Save job"} title={saved ? "Saved" : "Save job"} onClick={() => onToggleSave(job.job_id)}><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button>}
            </div>
            <div className="discovery-job-title"><div><p>{meta.company}</p><h2>{job.title || "Untitled opportunity"}</h2></div><MatchScore score={score} matchedCount={matched.length} missingCount={missing.length} onExplain={() => onDetails(job)} compact /></div>
            <div className="discovery-job-meta"><span><MapPin size={14} /> {meta.location}</span><span><BriefcaseBusiness size={14} /> {job.experience || "Experience flexible"}</span><span><Wifi size={14} /> {meta.workMode}</span>{meta.salary && <span>{meta.salary}</span>}</div>
            <p className="discovery-job-description">{trimText(job.description, 150)}</p>
            <SkillTags skills={(job.skills || []).slice(0, 6)} />
            <div className="compact-match-breakdown"><div><strong><CircleCheck size={14} /> Matching skills</strong><span>{matched.slice(0, 3).join(", ") || "Build your profile"}</span></div><div><strong><Target size={14} /> Missing skills</strong><span>{missing.slice(0, 3).join(", ") || "No major gaps"}</span></div></div>
            <div className="discovery-card-footer"><small><CalendarDays size={14} /> {job.created_at ? `Posted ${formatDate(job.created_at)}` : "Recently posted"}</small><div><Button variant="secondary" size="sm" type="button" onClick={() => onDetails(job)}>View opportunity</Button><ApplicationButton candidateId={candidateId} jobId={job.job_id} onMessage={onMessage} /></div></div>
        </article>
    );
}
