import axiosClient from "../api/axiosClient.js";

export async function registerCandidate(payload) {
    const { data } = await axiosClient.post("/register", payload);
    return data;
}

export async function loginCandidate(payload) {
    const { data } = await axiosClient.post("/login", payload);
    return data;
}

export async function uploadCandidateProfilePhoto(formData) {
    const { data } = await axiosClient.post("/api/candidate/profile-photo", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return data;
}

export async function removeCandidateProfilePhoto() {
    const { data } = await axiosClient.delete("/api/candidate/profile-photo");
    return data;
}

export async function getCandidateProfilePhotoBlob(photoUrl) {
    const { data } = await axiosClient.get(photoUrl, { responseType: "blob" });
    return data;
}
