import axiosClient from "../api/axiosClient.js";

const APPLICATION_EVENT = "talentsync:application-updated";

export async function submitJobApplication(candidateId, jobId) {
    void candidateId;
    try {
        const { data } = await axiosClient.post("/applications", {
            job_id: Number(jobId),
        });
        window.dispatchEvent(new CustomEvent(APPLICATION_EVENT));
        return data;
    } catch (error) {
        if (/already applied/i.test(error.message)) {
            window.dispatchEvent(new CustomEvent(APPLICATION_EVENT));
            const duplicateError = new Error("You already applied to this job.");
            duplicateError.code = "DUPLICATE_APPLICATION";
            throw duplicateError;
        }
        throw error;
    }
}

export async function listCandidateApplications() {
    const { data } = await axiosClient.get("/candidate/applications");
    return data;
}

export function subscribeToApplications(listener) {
    window.addEventListener(APPLICATION_EVENT, listener);
    return () => window.removeEventListener(APPLICATION_EVENT, listener);
}
