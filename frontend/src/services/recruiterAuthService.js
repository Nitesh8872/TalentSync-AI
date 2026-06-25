import axiosClient from "../api/axiosClient.js";

export async function registerRecruiter(payload) {
    const { data } = await axiosClient.post("/api/recruiter/register", payload);
    return data;
}

export async function loginRecruiter(payload) {
    const { data } = await axiosClient.post("/api/recruiter/login", payload);
    return data;
}
