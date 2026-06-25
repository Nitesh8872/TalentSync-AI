import { Navigate, Outlet } from "react-router-dom";

import { useCandidateAuth } from "../context/CandidateAuthContext.jsx";
import { useRecruiterAuth } from "../context/RecruiterAuthContext.jsx";

export function CandidateProtectedRoute() {
    const { isAuthenticated } = useCandidateAuth();
    const { isAuthenticated: recruiterAuthenticated } = useRecruiterAuth();
    if (isAuthenticated) {
        return <Outlet />;
    }
    if (recruiterAuthenticated) {
        return <Navigate to="/recruiter/dashboard" replace state={{ authNotice: "You are signed in as a recruiter, so we opened the recruiter workspace." }} />;
    }
    return <Navigate to="/candidate/login" replace state={{ authNotice: "Please sign in as a candidate to open that page." }} />;
}

export function RecruiterProtectedRoute() {
    const { isAuthenticated } = useRecruiterAuth();
    const { isAuthenticated: candidateAuthenticated } = useCandidateAuth();
    if (isAuthenticated) {
        return <Outlet />;
    }
    if (candidateAuthenticated) {
        return <Navigate to="/candidate/dashboard" replace state={{ authNotice: "You are signed in as a candidate, so we opened the candidate workspace." }} />;
    }
    return <Navigate to="/recruiter/login" replace state={{ authNotice: "Please sign in as a recruiter to open that page." }} />;
}

export function CandidateGuestRoute() {
    const { isAuthenticated } = useCandidateAuth();
    const { isAuthenticated: recruiterAuthenticated } = useRecruiterAuth();
    if (recruiterAuthenticated) {
        return <Navigate to="/recruiter/dashboard" replace state={{ authNotice: "You are already signed in as a recruiter." }} />;
    }
    return isAuthenticated ? <Navigate to="/candidate/dashboard" replace /> : <Outlet />;
}

export function RecruiterGuestRoute() {
    const { isAuthenticated } = useRecruiterAuth();
    const { isAuthenticated: candidateAuthenticated } = useCandidateAuth();
    if (candidateAuthenticated) {
        return <Navigate to="/candidate/dashboard" replace state={{ authNotice: "You are already signed in as a candidate." }} />;
    }
    return isAuthenticated ? <Navigate to="/recruiter/dashboard" replace /> : <Outlet />;
}
