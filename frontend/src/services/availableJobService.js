import axiosClient from "../api/axiosClient.js";

export async function listAvailableJobs(filters = {}) {
    const params = Object.fromEntries(
        Object.entries(filters).filter(
            ([, value]) =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== "",
        ),
    );
    const { data } = await axiosClient.get("/jobs", { params });
    return data;
}

export async function getAvailableJob(jobId) {
    const { data } = await axiosClient.get(`/jobs/${Number(jobId)}`);
    return data;
}
