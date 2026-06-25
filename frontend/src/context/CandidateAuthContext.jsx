import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
    AUTH_EVENT,
    CANDIDATE_SESSION_KEY,
    RECRUITER_SESSION_KEY,
    hasCandidateAccessToken,
    resolveDualRoleSessions,
} from "../utils/authSessions.js";

const CandidateAuthContext = createContext(null);

function readStoredSession() {
    return resolveDualRoleSessions("candidate").candidate;
}

export function CandidateAuthProvider({ children }) {
    const [session, setSessionState] = useState(readStoredSession);

    useEffect(() => {
        const syncSession = () => setSessionState(readStoredSession());
        window.addEventListener(AUTH_EVENT, syncSession);
        return () => {
            window.removeEventListener(AUTH_EVENT, syncSession);
        };
    }, []);

    const setSession = (nextSession) => {
        sessionStorage.removeItem(RECRUITER_SESSION_KEY);
        sessionStorage.setItem(CANDIDATE_SESSION_KEY, JSON.stringify(nextSession));
        localStorage.removeItem(CANDIDATE_SESSION_KEY);
        localStorage.removeItem(RECRUITER_SESSION_KEY);
        setSessionState(nextSession);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    const logout = () => {
        sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
        setSessionState(null);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    const value = useMemo(
        () => ({
            session,
            candidate: session?.user || null,
            isAuthenticated: hasCandidateAccessToken(session),
            setSession,
            logout,
        }),
        [session],
    );

    return (
        <CandidateAuthContext.Provider value={value}>
            {children}
        </CandidateAuthContext.Provider>
    );
}

export function useCandidateAuth() {
    const context = useContext(CandidateAuthContext);
    if (!context) {
        throw new Error("useCandidateAuth must be used inside CandidateAuthProvider");
    }
    return context;
}
