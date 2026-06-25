import axiosClient from "../api/axiosClient.js";

export async function createRecruiterJob(payload, recruiterId) {
    void recruiterId;
    const { data } = await axiosClient.post("/api/recruiter/jobs", toRecruiterJobPayload(payload));
    return {
        ...data,
        job: normalizeRecruiterJob(data.job),
    };
}

export async function listRecruiterJobs(recruiterId) {
    void recruiterId;
    const { data } = await axiosClient.get("/api/recruiter/jobs");
    return Array.isArray(data) ? data.map(normalizeRecruiterJob) : [];
}

function toRecruiterJobPayload(payload) {
    return {
        job_title: payload.title?.trim(),
        company_name: payload.company_name?.trim() || "TalentSync Recruiter",
        job_description: payload.description?.trim(),
        required_skills: Array.isArray(payload.skills)
            ? payload.skills.join(", ")
            : String(payload.skills || "").trim(),
        experience_required: payload.experience?.trim(),
        employment_type: payload.employment_type || "Full-time",
        location: payload.location?.trim() || "Not specified",
        salary_range: payload.salary_range?.trim() || null,
        application_deadline: payload.application_deadline || null,
    };
}

function normalizeRecruiterJob(job = {}) {
    const skills = Array.isArray(job.skills)
        ? job.skills
        : String(job.required_skills || "")
            .split(/[\n,;]+/)
            .map((skill) => skill.trim())
            .filter(Boolean);

    return {
        ...job,
        job_id: Number(job.job_id || job.id),
        title: job.title || job.job_title || "Untitled job",
        skills,
        experience: job.experience || job.experience_required || "Not specified",
        description: job.description || job.job_description || "",
        created_at: job.created_at,
    };
}
