import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
    listCandidateApplications,
    subscribeToApplications,
} from "../services/applicationService.js";

const ApplicationContext = createContext(null);

export function ApplicationProvider({ children }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const refreshApplications = useCallback(async () => {
        setError("");
        try {
            const response = await listCandidateApplications();
            setApplications(response.applications || []);
        } catch (requestError) {
            setError(requestError.message || "Could not load applications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshApplications();
        return subscribeToApplications(refreshApplications);
    }, [refreshApplications]);

    const appliedJobIds = useMemo(
        () => new Set(applications.map((application) => Number(application.job_id))),
        [applications],
    );

    const value = useMemo(
        () => ({
            applications,
            appliedJobIds,
            loading,
            error,
            refreshApplications,
            setApplications,
        }),
        [applications, appliedJobIds, loading, error, refreshApplications],
    );

    return (
        <ApplicationContext.Provider value={value}>
            {children}
        </ApplicationContext.Provider>
    );
}

export function useApplications() {
    const context = useContext(ApplicationContext);
    if (!context) {
        return {
            applications: [],
            appliedJobIds: new Set(),
            loading: false,
            error: "",
            refreshApplications: async () => {},
            setApplications: () => {},
        };
    }
    return context;
}
