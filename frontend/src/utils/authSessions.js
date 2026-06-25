export const CANDIDATE_SESSION_KEY = "talentsync.session";
export const RECRUITER_SESSION_KEY = "talentsync.recruiterSession";
export const AUTH_EVENT = "talentsync:auth-changed";

export function readSession(key) {
    try {
        return JSON.parse(sessionStorage.getItem(key));
    } catch {
        return null;
    }
}

export function hasCandidateAccessToken(session) {
    return Boolean(session?.access_token && session?.user?.id);
}

export function hasRecruiterAccessToken(session) {
    return Boolean(session?.access_token && session?.recruiter?.id);
}

export function resolveDualRoleSessions(preferredRole = null) {
    const candidate = readSession(CANDIDATE_SESSION_KEY);
    const recruiter = readSession(RECRUITER_SESSION_KEY);
    const candidateActive = hasCandidateAccessToken(candidate);
    const recruiterActive = hasRecruiterAccessToken(recruiter);

    if (!candidateActive) sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
    if (!recruiterActive) sessionStorage.removeItem(RECRUITER_SESSION_KEY);

    if (candidateActive && recruiterActive) {
        if (preferredRole === "candidate") {
            sessionStorage.removeItem(RECRUITER_SESSION_KEY);
            return { candidate, recruiter: null };
        }
        sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
        return { candidate: null, recruiter };
    }

    return {
        candidate: candidateActive ? candidate : null,
        recruiter: recruiterActive ? recruiter : null,
    };
}
