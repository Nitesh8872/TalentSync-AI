import axiosClient from "../api/axiosClient.js";

export async function uploadResume(file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axiosClient.post("/api/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    window.dispatchEvent(new Event("talentsync:resume-updated"));
    return data;
}

export async function listResumes() {
    const { data } = await axiosClient.get("/api/resumes");
    return data;
}

export async function getResume(resumeId) {
    const { data } = await axiosClient.get(`/api/resumes/${Number(resumeId)}`);
    return data;
}

export async function getParsedResume(resumeId) {
    const { data } = await axiosClient.get(
        `/api/resumes/${Number(resumeId)}/parsed`,
    );
    return data;
}

export async function getLatestResume() {
    const { data } = await axiosClient.get("/api/resumes/latest");
    return data;
}
