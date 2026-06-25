import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
    AUTH_EVENT,
    CANDIDATE_SESSION_KEY,
    RECRUITER_SESSION_KEY,
    hasRecruiterAccessToken,
    resolveDualRoleSessions,
} from "../utils/authSessions.js";

const RecruiterAuthContext = createContext(null);

function readStoredSession() {
    return resolveDualRoleSessions("recruiter").recruiter;
}

export function RecruiterAuthProvider({ children }) {
    const [session, setSessionState] = useState(readStoredSession);

    useEffect(() => {
        const syncSession = () => setSessionState(readStoredSession());
        window.addEventListener(AUTH_EVENT, syncSession);
        return () => {
            window.removeEventListener(AUTH_EVENT, syncSession);
        };
    }, []);

    const setSession = (nextSession) => {
        sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
        sessionStorage.setItem(RECRUITER_SESSION_KEY, JSON.stringify(nextSession));
        localStorage.removeItem(RECRUITER_SESSION_KEY);
        localStorage.removeItem(CANDIDATE_SESSION_KEY);
        setSessionState(nextSession);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    const logout = () => {
        sessionStorage.removeItem(RECRUITER_SESSION_KEY);
        setSessionState(null);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    const value = useMemo(
        () => ({
            session,
            recruiter: session?.recruiter || null,
            isAuthenticated: hasRecruiterAccessToken(session),
            setSession,
            logout,
        }),
        [session],
    );

    return (
        <RecruiterAuthContext.Provider value={value}>
            {children}
        </RecruiterAuthContext.Provider>
    );
}

export function useRecruiterAuth() {
    const context = useContext(RecruiterAuthContext);
    if (!context) {
        throw new Error("useRecruiterAuth must be used inside RecruiterAuthProvider");
    }
    return context;
}
