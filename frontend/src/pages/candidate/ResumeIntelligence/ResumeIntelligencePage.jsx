import { useCallback, useEffect, useRef, useState } from "react";
import {
    BrainCircuit,
    CheckCircle2,
    Download,
    FileText,
    FolderKanban,
    History,
    RefreshCw,
    Sparkles,
    Trash2,
    Upload,
    UsersRound,
} from "lucide-react";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import ParsedResumeView from "../../../components/resumes/ParsedResumeView.jsx";
import { useCandidateAuth } from "../../../context/CandidateAuthContext.jsx";
import { useActiveResumeId } from "../../../context/ResumeContext.jsx";
import { getParsedResume, listResumes, uploadResume } from "../../../services/resumeService.js";
import { collectResumeSkills, normalizeRecords } from "../../../utils/resumeData.js";
import { formatBytes, formatDate } from "../../../utils/formatters.js";

function getExperienceYears(records) {
    let totalMonths = 0;
    records.forEach((record) => {
        const start = record?.start_date || record?.start_year;
        const end = record?.end_date || record?.end_year || "present";
        const startYear = Number(String(start || "").match(/\d{4}/)?.[0]);
        const endYear = /present|current/i.test(String(end)) ? new Date().getFullYear() : Number(String(end || "").match(/\d{4}/)?.[0]);
        if (startYear && endYear >= startYear) totalMonths += (endYear - startYear) * 12;
    });
    return Math.round((totalMonths / 12) * 10) / 10;
}

function getResumeScore(parsed) {
    const source = parsed && typeof parsed === "object" ? parsed : {};
    const personal = source.personal_information || source.contact || {};
    const skills = collectResumeSkills(source);
    const experience = normalizeRecords(source.work_experience || source.experience);
    const projects = normalizeRecords(source.project_details || source.projects || source.project_experience);
    const education = normalizeRecords(source.education);
    const checks = [
        [personal.full_name || source.full_name || source.name, 15],
        [personal.email, 10],
        [personal.phone, 5],
        [source.professional_summary || source.summary, 15],
        [skills.length >= 5, 20],
        [experience.length, 20],
        [projects.length, 10],
        [education.length, 5],
    ];
    return checks.reduce((score, [value, weight]) => score + (value ? weight : 0), 0);
}

function InsightCard({ icon: Icon, label, value, note, tone }) {
    return (
        <article className={`resume-insight-card ${tone || ""}`}>
            <span className="resume-insight-icon"><Icon size={20} /></span>
            <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
        </article>
    );
}

export default function ResumeIntelligencePage() {
    const { candidate } = useCandidateAuth();
    const fileInput = useRef(null);
    const [resumes, setResumes] = useState([]);
    const { activeResumeId: selectedId, setActiveResumeId: setSelectedId, refreshLatestResume } = useActiveResumeId();
    const [parsedResume, setParsedResume] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [dragging, setDragging] = useState(false);

    const loadParsed = useCallback(async (resumeId) => {
        if (!resumeId) return;
        try {
            setParsedResume(await getParsedResume(resumeId));
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        }
    }, []);

    // Load history once on mount; default-select the first resume if nothing is active.
    useEffect(() => {
        let active = true;
        listResumes()
            .then((data) => {
                if (!active) return;
                setResumes(data);
                // Only set a default when context has no active ID yet.
                if (!sessionStorage.getItem("talentsync.selectedResumeId") && data.length > 0) {
                    setSelectedId(data[0].id);
                }
                setLoading(false);
            })
            .catch((error) => {
                if (!active) return;
                setMessage({ type: "error", text: error.message });
                setLoading(false);
            });
        return () => { active = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load parsed resume details whenever selectedId changes
    useEffect(() => {
        if (selectedId) {
            loadParsed(selectedId);
        } else {
            setParsedResume(null);
        }
    }, [selectedId, loadParsed]);

    const selectResume = (resumeId) => {
        setSelectedId(resumeId);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleFile = async (file) => {
        if (!file) return;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            setMessage({ type: "error", text: "Please choose a PDF resume." });
            return;
        }
        setUploading(true);
        setMessage(null);
        try {
            const uploaded = await uploadResume(file);
            setSelectedId(uploaded.id);
            refreshLatestResume();
            setMessage({ type: "success", text: "Your resume is ready. We refreshed your profile insights." });
            setResumes(await listResumes());
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const analyzeResume = async () => {
        if (!selectedId) return;
        setAnalyzing(true);
        setMessage(null);
        await loadParsed(selectedId);
        setMessage({ type: "success", text: "Resume insights are up to date." });
        setAnalyzing(false);
    };

    const parsed = parsedResume?.parsed_data || {};
    const skills = collectResumeSkills(parsed);
    const projects = normalizeRecords(parsed.project_details || parsed.projects || parsed.project_experience);
    const experience = normalizeRecords(parsed.work_experience || parsed.experience);
    const score = parsedResume ? getResumeScore(parsed) : 0;
    const selectedResume = resumes.find((resume) => resume.id === selectedId);

    return (
        <div className="resume-intelligence-page">
            <header className="resume-page-header">
                <div>
                    <p className="eyebrow"><Sparkles size={14} /> Career profile</p>
                    <h1>Resume Intelligence Center</h1>
                    <p>See how your experience comes together and keep your professional profile ready for every opportunity.</p>
                </div>
                <Button onClick={() => fileInput.current?.click()} loading={uploading}>
                    <Upload size={17} /> {parsedResume ? "Replace resume" : "Upload resume"}
                </Button>
            </header>

            <Alert type={message?.type}>{message?.text}</Alert>

            {loading ? (
                <p className="empty-state">Loading latest resume...</p>
            ) : !parsedResume ? (
                <section className="resume-first-upload">
                    <span><FileText size={28} /></span>
                    <h2>Build your professional profile</h2>
                    <p>Add your latest PDF resume to uncover your skills, experience, projects, and profile strength.</p>
                    <Button onClick={() => fileInput.current?.click()} loading={uploading}><Upload size={17} /> Upload your resume</Button>
                    <small>PDF only · Your file stays private</small>
                </section>
            ) : (
                <>
                    <section className="resume-insights-grid" aria-label="Resume insights">
                        <InsightCard icon={BrainCircuit} label="Resume score" value={`${score}%`} note={score >= 70 ? "Strong profile" : "Keep improving"} tone="score" />
                        <InsightCard icon={CheckCircle2} label="Skills found" value={skills.length} note="Ready for matching" tone="skills" />
                        <InsightCard icon={FolderKanban} label="Projects found" value={projects.length} note="Proof of your work" tone="projects" />
                        <InsightCard icon={UsersRound} label="Experience years" value={getExperienceYears(experience)} note={`${experience.length} ${experience.length === 1 ? "role" : "roles"} identified`} tone="experience" />
                    </section>

                    <div className="resume-main-grid">
                        <main><ParsedResumeView resume={parsedResume} candidate={candidate} /></main>
                        <aside className="resume-management-card">
                            <div className="management-head">
                                <span><FileText size={19} /></span>
                                <div><h2>Resume management</h2><p>Keep your profile current</p></div>
                            </div>
                            {selectedResume && (
                                <div className="current-resume-file">
                                    <span className="pdf-mark">PDF</span>
                                    <div><strong>{selectedResume.filename}</strong><small>{formatBytes(selectedResume.file_size)} · Added {formatDate(selectedResume.upload_time)}</small></div>
                                    <CheckCircle2 size={18} />
                                </div>
                            )}
                            <button className={`compact-upload-zone ${dragging ? "dragover" : ""}`} type="button" onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}>
                                <Upload size={20} /><span><strong>{parsedResume ? "Drop a new resume here" : "Drop your resume here"}</strong><small>or browse a PDF from your device</small></span>
                            </button>
                            <div className="resume-management-actions">
                                <Button onClick={() => fileInput.current?.click()} variant="secondary" disabled={uploading}><RefreshCw size={16} /> Replace resume</Button>
                                <Button onClick={analyzeResume} loading={analyzing}><BrainCircuit size={16} /> Analyze resume</Button>
                                <button className="management-link" type="button" disabled title="Resume file downloads are not available yet"><Download size={16} /> Download resume <span>Coming soon</span></button>
                                <button className="management-link danger" type="button" disabled title="Resume deletion is not available yet"><Trash2 size={16} /> Delete resume <span>Coming soon</span></button>
                            </div>
                            <p className="privacy-note"><CheckCircle2 size={14} /> Visible only to you until you apply</p>
                        </aside>
                    </div>
                </>
            )}

            <input ref={fileInput} type="file" accept="application/pdf" hidden onChange={(event) => handleFile(event.target.files[0])} />

            <section className="resume-history-section">
                <div className="resume-history-head">
                    <div><span><History size={18} /></span><div><h2>Upload history</h2><p>Review and switch between previous resume versions.</p></div></div>
                    <span className="history-count">{resumes.length} {resumes.length === 1 ? "version" : "versions"}</span>
                </div>
                <div className="resume-history-list">
                    {loading && <p className="resume-empty-content">Loading your resumes…</p>}
                    {!loading && !resumes.length && <p className="resume-empty-content">Your uploaded resumes will appear here.</p>}
                    {resumes.map((resume) => (
                        <button className={`resume-history-row ${selectedId === resume.id ? "active" : ""}`} key={resume.id} type="button" onClick={() => selectResume(resume.id)}>
                            <span className="history-file-icon"><FileText size={18} /></span>
                            <span className="history-file-info"><strong>{resume.parsed_name || resume.filename}</strong><small>{resume.filename}</small></span>
                            <span className="history-meta">{formatBytes(resume.file_size)}</span>
                            <span className="history-meta">{formatDate(resume.upload_time)}</span>
                            <span className={`history-status ${selectedId === resume.id ? "current" : ""}`}>{selectedId === resume.id ? "Current" : "View"}</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}
