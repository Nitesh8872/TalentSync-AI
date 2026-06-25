import { useEffect, useMemo, useState } from "react";
import {
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    MapPin,
    Search,
    SlidersHorizontal,
    Sparkles,
    Target,
    Wifi,
    X,
} from "lucide-react";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import Modal from "../../../components/common/Modal.jsx";
import SkillTags from "../../../components/common/SkillTags.jsx";
import ApplicationButton from "../../../components/jobs/ApplicationButton.jsx";
import JobCard from "../../../components/jobs/JobCard.jsx";
import { useCandidateAuth } from "../../../context/CandidateAuthContext.jsx";
import { useActiveResumeId } from "../../../context/ResumeContext.jsx";
import { getAvailableJob, listAvailableJobs } from "../../../services/availableJobService.js";
import { getRecommendedJobs } from "../../../services/recommendationService.js";
import { collectResumeSkills } from "../../../utils/resumeData.js";
import { formatDate } from "../../../utils/formatters.js";

const emptyFilters = { title: "", skill: "", location: "", workMode: "", experience: "" };

const descriptionValue = (description, labels) => {
    for (const label of labels) {
        const match = String(description || "").match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]+)`, "i"));
        if (match?.[1]) return match[1].trim();
    }
    return "";
};

const getJobDisplayMeta = (job = {}) => {
    const description = job.description || "";
    const company = descriptionValue(description, ["Company(?: name)?", "Organization", "Employer"]);
    const location = descriptionValue(description, ["Location", "Preferred location"]);
    const workModeValue = descriptionValue(description, ["Work mode", "Work type", "Workplace"]);
    const salary = descriptionValue(description, ["Salary(?: range)?", "Compensation", "Salary expectation"]);
    const workMode = workModeValue || (/\bremote\b/i.test(description) ? "Remote" : /\bhybrid\b/i.test(description) ? "Hybrid" : /\b(on-site|onsite)\b/i.test(description) ? "On-site" : "Flexible");
    return {
        company: job.company_name || company || "Company confidential",
        location: job.location || location || (workMode === "Remote" ? "Remote" : "Location flexible"),
        workMode: job.employment_type === "Remote" ? "Remote" : workMode,
        salary: job.salary_range || salary,
    };
};

function MarketCard({ icon: Icon, label, value, note, tone }) {
    return (
        <article className={`market-overview-card ${tone || ""}`}>
            <span><Icon size={20} /></span>
            <div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
        </article>
    );
}

export default function BrowseJobsPage() {
    const { candidate } = useCandidateAuth();
    const { latestResume, loadingLatestResume, resumeError } = useActiveResumeId();
    const [filters, setFilters] = useState(emptyFilters);
    const [activeFilters, setActiveFilters] = useState({});
    const [page, setPage] = useState(1);
    const [jobs, setJobs] = useState([]);
    const [recommendations, setRecommendations] = useState(new Map());
    const [recommendationsLoading, setRecommendationsLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sortBy, setSortBy] = useState("match");
    const [savedJobs, setSavedJobs] = useState(() => {
        try { return new Set(JSON.parse(localStorage.getItem(`talentsync.savedJobs.${candidate.id}`) || "[]")); }
        catch { return new Set(); }
    });

    useEffect(() => {
        setRecommendationsLoading(true);
        Promise.allSettled([getRecommendedJobs(candidate.id, 100)]).then(([recommended]) => {
            if (recommended.status === "fulfilled") {
                setRecommendations(new Map((recommended.value.recommendations || []).map((job) => [job.job_id, job])));
            }
        }).finally(() => setRecommendationsLoading(false));
    }, [candidate.id, latestResume?.resume_id]);

    useEffect(() => {
        setLoading(true);
        const query = {
            title: activeFilters.title,
            skill: activeFilters.skill,
            keyword: activeFilters.location || (activeFilters.workMode === "Flexible" ? "" : activeFilters.workMode),
            experience: activeFilters.experience,
            page,
            page_size: 6,
        };
        listAvailableJobs(query)
            .then((data) => {
                let available = data.jobs || [];
                if (activeFilters.workMode) {
                    available = available.filter((job) => getJobDisplayMeta(job).workMode.toLowerCase() === activeFilters.workMode.toLowerCase());
                }
                setJobs(available);
                setPagination(data.pagination || {});
            })
            .catch((error) => setMessage({ type: "error", text: error.message }))
            .finally(() => setLoading(false));
    }, [activeFilters, page]);

    const resumeSkills = useMemo(() => collectResumeSkills(latestResume?.parsed_data || {}), [latestResume]);
    const resumeSkillSet = useMemo(() => new Set(resumeSkills.map((skill) => skill.toLowerCase())), [resumeSkills]);
    const enhanceJob = (job) => {
        const recommendation = recommendations.get(job.job_id) || {};
        const matchedSkills = (job.skills || []).filter((skill) => resumeSkillSet.has(skill.toLowerCase()));
        const missingSkills = (job.skills || []).filter((skill) => !resumeSkillSet.has(skill.toLowerCase()));
        return {
            ...job,
            ...recommendation,
            matched_skills: recommendation.matched_skills || matchedSkills,
            missing_skills: recommendation.missing_skills || missingSkills,
            match_score: recommendation.match_score ?? job.match_score ?? 0,
        };
    };
    const enhancedJobs = useMemo(() => jobs.map(enhanceJob).sort((left, right) => sortBy === "newest"
        ? new Date(right.created_at || 0) - new Date(left.created_at || 0)
        : Number(right.match_score || 0) - Number(left.match_score || 0)), [jobs, recommendations, resumeSkillSet, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps
    const recommendedJobs = useMemo(() => [...recommendations.values()]
        .map(enhanceJob)
        .sort((left, right) => Number(right.match_score || 0) - Number(left.match_score || 0))
        .slice(0, 3), [recommendations, resumeSkillSet]); // eslint-disable-line react-hooks/exhaustive-deps

    const topMatch = enhancedJobs.length ? Math.max(...enhancedJobs.map((job) => Number(job.match_score || 0))) : 0;
    const companies = new Set(enhancedJobs.map((job) => getJobDisplayMeta(job).company)).size;
    const remoteJobs = enhancedJobs.filter((job) => getJobDisplayMeta(job).workMode === "Remote").length;
    const activeCount = Object.values(activeFilters).filter(Boolean).length;

    const search = (event) => {
        event.preventDefault();
        setPage(1);
        setActiveFilters(filters);
        setFiltersOpen(false);
        setMessage(null);
    };

    const clear = () => {
        setFilters(emptyFilters);
        setActiveFilters({});
        setPage(1);
    };

    const openDetails = async (job) => {
        setSelectedJob(job);
        setDetailsLoading(true);
        try {
            const data = await getAvailableJob(job.job_id);
            const details = data.job;
            const matchedSkills = (details.skills || []).filter((skill) => resumeSkillSet.has(skill.toLowerCase()));
            const missingSkills = (details.skills || []).filter((skill) => !resumeSkillSet.has(skill.toLowerCase()));
            const recommendation = recommendations.get(job.job_id) || {};
            setSelectedJob({
                ...details,
                ...recommendation,
                matched_skills: recommendation.matched_skills || matchedSkills,
                missing_skills: recommendation.missing_skills || missingSkills,
                match_score: recommendation.match_score ?? details.match_score ?? 0,
            });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally { setDetailsLoading(false); }
    };

    const toggleSaved = (jobId) => {
        setSavedJobs((current) => {
            const next = new Set(current);
            if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
            localStorage.setItem(`talentsync.savedJobs.${candidate.id}`, JSON.stringify([...next]));
            return next;
        });
    };

    const selectedMeta = getJobDisplayMeta(selectedJob || {});

    return (
        <div className="job-discovery-page">
            <header className="job-discovery-hero">
                <div>
                    <p className="eyebrow"><Sparkles size={14} /> AI-powered job discovery</p>
                    <h1>Find Your Next Role</h1>
                    <p>Explore opportunities ranked around your skills, experience, and career direction.</p>
                </div>
                <div className="discovery-hero-note"><Target size={18} /><span><strong>Personalized for your resume</strong><small>{loadingLatestResume ? "Loading latest resume..." : resumeSkills.length ? `${resumeSkills.length} skills shaping your results` : resumeError === "Resume parsing failed" ? "Resume parsing failed · Please upload resume" : "Upload your resume first to unlock AI matching."}</small></span></div>
            </header>

            <section className="market-overview-grid" aria-label="Job market overview">
                <MarketCard icon={BriefcaseBusiness} label="Open jobs" value={pagination.total || 0} note="Active opportunities" tone="open" />
                <MarketCard icon={Target} label="Top match" value={`${Math.round(topMatch)}%`} note="Based on your resume" tone="match" />
                <MarketCard icon={Building2} label="Companies hiring" value={companies} note="In current results" tone="companies" />
                <MarketCard icon={Wifi} label="Remote opportunities" value={remoteJobs} note="In current results" tone="remote" />
            </section>

            <section className="top-recommendations-section" aria-labelledby="top-recommendations-title">
                <div className="top-recommendations-head">
                    <div><p><Sparkles size={14} /> Personalized shortlist</p><h2 id="top-recommendations-title">AI Recommended Jobs</h2><span>Highest resume alignment from all open opportunities.</span></div>
                    {recommendedJobs.length > 0 && <b>{Math.round(Number(recommendedJobs[0].match_score || 0))}% top match</b>}
                </div>
                {recommendationsLoading && <div className="recommendations-loading">Finding your strongest matches…</div>}
                {!recommendationsLoading && !recommendedJobs.length && <div className="recommendations-empty"><Target size={20} /><span><strong>Unlock personalized recommendations</strong><small>Upload a resume to see roles ranked around your skills.</small></span></div>}
                <div className="recommended-jobs-grid">
                    {recommendedJobs.map((job, index) => <JobCard key={`recommended-${job.job_id}`} job={job} rank={index + 1} recommended candidateId={candidate.id} onDetails={openDetails} onMessage={setMessage} saved={savedJobs.has(job.job_id)} onToggleSave={toggleSaved} />)}
                </div>
            </section>

            <section className="smart-job-search">
                <form onSubmit={search}>
                    <div className="smart-search-primary">
                        <label><Search size={18} /><span><small>Job title</small><input value={filters.title} onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))} placeholder="Product designer, backend engineer…" /></span></label>
                        <label><Sparkles size={18} /><span><small>Skills</small><input value={filters.skill} onChange={(event) => setFilters((current) => ({ ...current, skill: event.target.value }))} placeholder="React, FastAPI, SQL…" /></span></label>
                        <label><MapPin size={18} /><span><small>Location</small><input value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} placeholder="City or remote" /></span></label>
                        <Button type="submit" loading={loading}><Search size={17} /> Search jobs</Button>
                    </div>
                    <button className="more-filters-toggle" type="button" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={15} /> More preferences {activeCount > 0 && <span>{activeCount}</span>}<ChevronDown size={14} className={filtersOpen ? "rotated" : ""} /></button>
                    {filtersOpen && (
                        <div className="smart-search-secondary">
                            <label>Work mode<select className="field" value={filters.workMode} onChange={(event) => setFilters((current) => ({ ...current, workMode: event.target.value }))}><option value="">Any work mode</option><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Flexible</option></select></label>
                            <label>Experience level<input className="field" list="experience-levels" value={filters.experience} onChange={(event) => setFilters((current) => ({ ...current, experience: event.target.value }))} placeholder="e.g. 3 years" /><datalist id="experience-levels"><option value="1 year">Entry level</option><option value="3 years">Mid level</option><option value="5 years">Senior level</option></datalist></label>
                            {activeCount > 0 && <button type="button" className="clear-search" onClick={clear}><X size={14} /> Clear all</button>}
                        </div>
                    )}
                </form>
                <Alert type={message?.type}>{message?.text}</Alert>
            </section>

            <section className="discovery-results-head">
                <div><p><BriefcaseBusiness size={14} /> Career marketplace</p><h2>All Opportunities</h2><span>{loading ? "Loading open opportunities…" : pagination.total ? `${pagination.total} open role${pagination.total === 1 ? "" : "s"} to explore` : "No roles match these preferences yet"}</span></div>
                <div className="discovery-results-actions">
                    <label>Sort by <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="match">Best match</option><option value="newest">Newest first</option></select></label>
                    {activeCount > 0 && <button type="button" onClick={clear}>Reset search</button>}
                </div>
            </section>

            <section className="discovery-jobs-grid">
                {loading && <div className="discovery-empty-state"><BriefcaseBusiness size={25} /><h3>Loading opportunities</h3><p>Fetching open roles and calculating resume alignment.</p></div>}
                {!loading && !enhancedJobs.length && <div className="discovery-empty-state"><Search size={25} /><h3>Let’s widen the search</h3><p>Try removing a preference or searching for a related skill.</p><Button variant="secondary" onClick={clear}>Clear preferences</Button></div>}
                {enhancedJobs.map((job, index) => (
                    <JobCard key={job.job_id} job={job} rank={index + 1} candidateId={candidate.id} onDetails={openDetails} onMessage={setMessage} saved={savedJobs.has(job.job_id)} onToggleSave={toggleSaved} />
                ))}
            </section>

            {pagination.total_pages > 1 && (
                <nav className="pagination-bar discovery-pagination" aria-label="Job results pages">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /> Previous</Button>
                    <span>Page {page} of {pagination.total_pages}</span>
                    <Button variant="secondary" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={15} /></Button>
                </nav>
            )}

            <Modal open={Boolean(selectedJob)} title={selectedJob?.title || "Opportunity"} onClose={() => setSelectedJob(null)} actions={selectedJob && <ApplicationButton candidateId={candidate.id} jobId={selectedJob.job_id} size="" onMessage={setMessage} />}>
                {detailsLoading ? <p className="empty-state">Preparing opportunity details…</p> : selectedJob && (
                    <div className="opportunity-detail">
                        <div className="opportunity-company"><span><Building2 size={20} /></span><div><strong>{selectedMeta.company}</strong><p><MapPin size={14} /> {selectedMeta.location} · {selectedMeta.workMode}</p></div><b>{Math.round(Number(selectedJob.match_score || 0))}% match</b></div>
                        <dl className="job-detail-grid"><div><dt>Experience</dt><dd>{selectedJob.experience || "Not specified"}</dd></div><div><dt>Posted</dt><dd>{formatDate(selectedJob.created_at)}</dd></div>{selectedMeta.salary && <div><dt>Salary range</dt><dd>{selectedMeta.salary}</dd></div>}<div><dt>Resume alignment</dt><dd>{Number(selectedJob.match_score || 0) >= 70 ? "Strong" : Number(selectedJob.match_score || 0) >= 40 ? "Developing" : "Early"}</dd></div></dl>
                        <section className="ai-match-breakdown"><div className="match-breakdown-head"><span><Sparkles size={17} /></span><div><h3>AI match breakdown</h3><p>How your resume aligns with this opportunity</p></div></div><div className="match-breakdown-grid"><div className="matched"><h4><CircleCheck size={15} /> Matched skills</h4><SkillTags skills={selectedJob.matched_skills} emptyText="No direct skill matches yet." /></div><div className="missing"><h4><Target size={15} /> Missing skills</h4><SkillTags skills={selectedJob.missing_skills} missing emptyText="No missing skills identified." /></div></div></section>
                        <section className="job-detail-section opportunity-description"><h3>About the opportunity</h3><p>{selectedJob.description || "No description available."}</p></section>
                    </div>
                )}
            </Modal>
        </div>
    );
}
