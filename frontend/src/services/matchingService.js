import axiosClient from "../api/axiosClient.js";

export async function matchResumeToJob(payload) {
    const { data } = await axiosClient.post("/match", payload);
    return data;
}
