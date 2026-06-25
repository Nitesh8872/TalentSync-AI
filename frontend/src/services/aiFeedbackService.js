import axiosClient from "../api/axiosClient.js";

export async function generateAIFeedback(payload) {
    const { data } = await axiosClient.post("/api/ai-feedback", payload);
    return data;
}
