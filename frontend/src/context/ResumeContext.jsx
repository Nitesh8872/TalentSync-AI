/**
 * ResumeContext
 *
 * Shared reactive state for the candidate's currently selected resume.
 *
 * Problem solved:
 *   Resume Intelligence writes `sessionStorage.talentsync.selectedResumeId` when
 *   the user uploads or switches resumes, but other pages (JobDescription,
 *   BrowseJobs, AnalysisWorkspace) loaded their resume data on mount and have no
 *   way to know the selection changed — they silently show stale skills / summary.
 *
 * Solution:
 *   This context wraps the session-storage key in a React state that is kept in
 *   sync via a custom window event (`talentsync:resume-changed`).  Any component
 *   that calls `useActiveResumeId()` will re-render automatically when a new
 *   resume is selected, and any component that calls `setActiveResumeId()` will
 *   broadcast the change to all consumers.
 *
 * Usage (consuming):
 *   const { activeResumeId, setActiveResumeId } = useActiveResumeId();
 *
 * Usage (publishing — e.g. after upload):
 *   setActiveResumeId(newResumeId);   // persists + broadcasts
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getLatestResume, getResume } from "../services/resumeService.js";
import { useCandidateAuth } from "./CandidateAuthContext.jsx";

const STORAGE_KEY = "talentsync.selectedResumeId";
const RESUME_CHANGED_EVENT = "talentsync:resume-changed";

function readStoredId() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    return parsed > 0 ? parsed : null;
}

const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
    const { candidate, isAuthenticated } = useCandidateAuth();
    const [activeResumeId, setIdState] = useState(readStoredId);
    const [latestResume, setLatestResume] = useState(null);
    const [loadingLatestResume, setLoadingLatestResume] = useState(false);
    const [resumeError, setResumeError] = useState("");
    const [refreshVersion, setRefreshVersion] = useState(0);
    const lastVersionRef = useRef(0);

    // Sync state when the event fires (cross-component, same tab).
    useEffect(() => {
        const sync = () => setIdState(readStoredId());
        window.addEventListener(RESUME_CHANGED_EVENT, sync);
        return () => window.removeEventListener(RESUME_CHANGED_EVENT, sync);
    }, []);

    /**
     * setActiveResumeId(id)
     * Persists the new resume ID to sessionStorage, updates local state, and
     * broadcasts the change so every subscribed page re-renders with the new ID.
     */
    const setActiveResumeId = useCallback((id) => {
        if (id == null) {
            sessionStorage.removeItem(STORAGE_KEY);
            setIdState(null);
        } else {
            sessionStorage.setItem(STORAGE_KEY, String(id));
            setIdState(Number(id));
        }
        window.dispatchEvent(new Event(RESUME_CHANGED_EVENT));
    }, []);

    const refreshLatestResume = useCallback(() => {
        setRefreshVersion((version) => version + 1);
    }, []);

    useEffect(() => {
        const refresh = () => refreshLatestResume();
        window.addEventListener("talentsync:resume-updated", refresh);
        return () => window.removeEventListener("talentsync:resume-updated", refresh);
    }, [refreshLatestResume]);

    useEffect(() => {
        let active = true;
        if (!isAuthenticated || !candidate?.id) {
            setLatestResume(null);
            setLoadingLatestResume(false);
            setResumeError("");
            return () => { active = false; };
        }

        setLoadingLatestResume(true);
        setResumeError("");

        const loadResumeData = async () => {
            try {
                const storedId = readStoredId();
                const isRefresh = lastVersionRef.current !== refreshVersion;
                lastVersionRef.current = refreshVersion;

                if (storedId) {
                    // Avoid redundant fetch if latestResume already matches the selected ID
                    if (latestResume && latestResume.resume_id === storedId && !isRefresh) {
                        setLoadingLatestResume(false);
                        return;
                    }
                    const data = await getResume(storedId);
                    if (!active) return;
                    const contact = data.parsed_data?.personal_information || data.parsed_data?.contact || {};
                    const normalized = {
                        resume_id: data.id,
                        candidate_id: candidate.id,
                        file_name: data.filename,
                        parsed_name: data.parsed_data?.name || contact?.full_name || null,
                        email: contact?.email || null,
                        phone: contact?.phone || null,
                        skills: data.parsed_data?.all_skills_flat || data.parsed_data?.skills || [],
                        projects: data.parsed_data?.project_details || data.parsed_data?.projects || [],
                        education: data.parsed_data?.education || [],
                        experience: data.parsed_data?.work_experience || data.parsed_data?.experience || [],
                        uploaded_at: data.upload_time,
                        parsed_status: data.parsed_data ? "parsed" : "failed",
                        parsed_data: data.parsed_data || {},
                    };
                    setLatestResume(normalized);
                    if (normalized.parsed_status === "failed") {
                        setResumeError("Resume parsing failed");
                    }
                } else {
                    const resume = await getLatestResume();
                    if (!active) return;
                    setLatestResume(resume);
                    setActiveResumeId(resume.resume_id);
                    if (resume.parsed_status === "failed") {
                        setResumeError("Resume parsing failed");
                    }
                }
            } catch (error) {
                if (!active) return;
                setLatestResume(null);
                setActiveResumeId(null);
                setResumeError(/not found/i.test(error.message) ? "Resume not found" : error.message);
            } finally {
                if (active) setLoadingLatestResume(false);
            }
        };

        loadResumeData();

        return () => { active = false; };
    }, [candidate?.id, isAuthenticated, refreshVersion, activeResumeId, latestResume, setActiveResumeId]);

    const value = useMemo(() => ({
        activeResumeId,
        setActiveResumeId,
        latestResume,
        loadingLatestResume,
        resumeError,
        refreshLatestResume,
    }), [activeResumeId, setActiveResumeId, latestResume, loadingLatestResume, resumeError, refreshLatestResume]);

    return (
        <ResumeContext.Provider value={value}>
            {children}
        </ResumeContext.Provider>
    );
}

/**
 * useActiveResumeId()
 * Returns { activeResumeId, setActiveResumeId }.
 * Must be used inside <ResumeProvider>.
 */
export function useActiveResumeId() {
    const ctx = useContext(ResumeContext);
    if (!ctx) {
        throw new Error("useActiveResumeId must be used inside ResumeProvider");
    }
    return ctx;
}
