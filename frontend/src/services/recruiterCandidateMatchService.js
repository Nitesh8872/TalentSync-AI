import axiosClient from "../api/axiosClient.js";

export async function getRecruiterApplications(recruiterId) {
    void recruiterId;
    const { data } = await axiosClient.get("/recruiter/applications");
    return data;
}

export async function getRecruiterCandidateMatches(recruiterId, jobId) {
    const [{ data: matches }, applications] = await Promise.all([
        axiosClient.get(
            `/recruiter/jobs/${Number(jobId)}/candidate-matches`,
        ),
        getRecruiterApplications(recruiterId).catch(() => ({ applications: [] })),
    ]);

    const applicationById = new Map(
        (applications.applications || []).map((application) => [
            Number(application.application_id),
            application,
        ]),
    );

    return {
        ...matches,
        candidates: (matches.candidates || [])
            .map((candidate) => {
                const application = applicationById.get(Number(candidate.application_id));
                return {
                    ...candidate,
                    application_status: application?.status || null,
                    applied_at: application?.applied_at || null,
                    candidate_email: application?.candidate_email || null,
                    job_title: application?.job_title || matches.job_title || null,
                };
            })
            .sort(
                (left, right) =>
                    Number(right.match_score || 0) -
                    Number(left.match_score || 0),
            ),
    };
}

export async function updateRecruiterApplicationStatus(applicationId, status) {
    const { data } = await axiosClient.patch(
        `/recruiter/applications/${Number(applicationId)}/status`,
        { status },
    );
    return data;
}
