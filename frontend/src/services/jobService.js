import axiosClient from "../api/axiosClient.js";

export async function createJobDescription(payload) {
    const { data } = await axiosClient.post("/job-description", payload);
    return data;
}

export async function listJobDescriptions() {
    const { data } = await axiosClient.get("/job-descriptions");
    return data;
}

export async function deleteCareerGoal(goalId) {
    const { data } = await axiosClient.delete(`/candidate/career-goals/${goalId}`);
    return data;
}
