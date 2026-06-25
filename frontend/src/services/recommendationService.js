import axiosClient from "../api/axiosClient.js";
import { getAvailableJob } from "./availableJobService.js";

export async function getRecommendedJobs(candidateId, limit = 20) {
    void candidateId;
    const { data } = await axiosClient.get(
        "/recommendations",
        { params: { limit: Number(limit) } },
    );
    const recommendations = Array.isArray(data.recommendations)
        ? data.recommendations
        : [];

    const enriched = await Promise.all(
        recommendations.map(async (recommendation) => {
            try {
                const response = await getAvailableJob(recommendation.job_id);
                return { ...(response.job || {}), ...recommendation };
            } catch {
                return recommendation;
            }
        }),
    );

    return {
        ...data,
        recommendations: enriched.sort(
            (left, right) =>
                Number(right.match_score || 0) - Number(left.match_score || 0),
        ),
    };
}
