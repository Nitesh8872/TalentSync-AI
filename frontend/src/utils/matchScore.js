export function getMatchQuality(score) {
    const value = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
    if (value >= 90) return { label: "Excellent Match", tone: "excellent" };
    if (value >= 75) return { label: "Strong Match", tone: "strong" };
    if (value >= 50) return { label: "Moderate Match", tone: "moderate" };
    return { label: "Weak Match", tone: "weak" };
}
