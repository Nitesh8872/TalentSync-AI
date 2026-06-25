import { Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "../pages/Landing/LandingPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import CandidateRegisterPage from "../pages/candidate/Register/RegisterPage.jsx";
import CandidateLoginPage from "../pages/candidate/Login/LoginPage.jsx";
import CandidateDashboardPage from "../pages/candidate/CandidateDashboard/DashboardPage.jsx";
import ResumeIntelligencePage from "../pages/candidate/ResumeIntelligence/ResumeIntelligencePage.jsx";
import JobDescriptionPage from "../pages/candidate/JobDescription/JobDescriptionPage.jsx";
import MatchingPage from "../pages/candidate/Matching/MatchingPage.jsx";
import BrowseJobsPage from "../pages/candidate/BrowseJobs/BrowseJobsPage.jsx";
import ApplicationsPage from "../pages/candidate/Applications/ApplicationsPage.jsx";
import RecruiterRegisterPage from "../pages/recruiter/RecruiterRegister/RecruiterRegisterPage.jsx";
import RecruiterLoginPage from "../pages/recruiter/RecruiterLogin/RecruiterLoginPage.jsx";
import RecruiterDashboardPage from "../pages/recruiter/RecruiterDashboard/DashboardPage.jsx";
import CreateJobPage from "../pages/recruiter/CreateJob/CreateJobPage.jsx";
import CandidateMatchesPage from "../pages/recruiter/CandidateMatches/CandidateMatchesPage.jsx";
import {
    CandidateGuestRoute,
    CandidateProtectedRoute,
    RecruiterGuestRoute,
    RecruiterProtectedRoute,
} from "./ProtectedRoute.jsx";
import DashboardLayout from "../components/layouts/DashboardLayout.jsx";
import RecruiterDashboardLayout from "../components/layouts/RecruiterDashboardLayout.jsx";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route element={<CandidateGuestRoute />}>
                <Route path="/candidate/register" element={<CandidateRegisterPage />} />
                <Route path="/candidate/login" element={<CandidateLoginPage />} />
            </Route>

            <Route element={<RecruiterGuestRoute />}>
                <Route path="/recruiter/register" element={<RecruiterRegisterPage />} />
                <Route path="/recruiter/login" element={<RecruiterLoginPage />} />
            </Route>

            <Route element={<CandidateProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
                    <Route path="/candidate/resume" element={<ResumeIntelligencePage />} />
                    <Route path="/candidate/resume-upload" element={<Navigate to="/candidate/resume" replace />} />
                    <Route path="/candidate/resume-parser" element={<Navigate to="/candidate/resume" replace />} />
                    <Route path="/candidate/job-description" element={<JobDescriptionPage />} />
                    <Route path="/candidate/matching" element={<MatchingPage />} />
                    <Route path="/candidate/ai-feedback" element={<Navigate to="/candidate/matching" replace />} />
                    <Route path="/candidate/browse-jobs" element={<BrowseJobsPage />} />
                    <Route path="/candidate/recommended-jobs" element={<Navigate to="/candidate/browse-jobs" replace />} />
                    <Route path="/candidate/applications" element={<ApplicationsPage />} />
                </Route>
            </Route>

            <Route element={<RecruiterProtectedRoute />}>
                <Route element={<RecruiterDashboardLayout />}>
                    <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
                    <Route path="/recruiter/create-job" element={<CreateJobPage />} />
                    <Route path="/recruiter/candidate-matches" element={<CandidateMatchesPage />} />
                </Route>
            </Route>

            <Route path="/register" element={<Navigate to="/candidate/register" replace />} />
            <Route path="/login" element={<Navigate to="/candidate/login" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/candidate/dashboard" replace />} />
            <Route
                path="/recruiter/jobs/create"
                element={<Navigate to="/recruiter/create-job" replace />}
            />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
