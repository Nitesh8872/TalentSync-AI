export function collectResumeSkills(parsed = {}) {
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const values = [];
    if (Array.isArray(source.all_skills_flat)) values.push(...source.all_skills_flat);

    [source.categorized_skills, source.technical_skills].forEach((technical) => {
        if (Array.isArray(technical)) {
            values.push(...technical);
        } else if (technical && typeof technical === "object") {
            Object.values(technical).forEach((items) => {
                if (Array.isArray(items)) values.push(...items);
                else if (hasValue(items)) values.push(items);
            });
        }
    });

    if (Array.isArray(source.skills)) values.push(...source.skills);

    return [...new Map(
        values
            .map((value) => String(value).trim())
            .filter(Boolean)
            .map((value) => [value.toLowerCase(), value]),
    ).values()];
}

const SKILL_CATEGORY_LABELS = {
    languages: "Languages",
    programming_languages: "Languages",
    backend: "Backend",
    backend_technologies: "Backend",
    web_technologies: "Web Technologies",
    frontend_technologies: "Web Technologies",
    databases: "Databases",
    core_concepts: "Core Concepts",
    cloud_and_devops: "Tools",
    tools: "Tools",
};

export function categorizedResumeSkills(parsed = {}) {
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const rich = source.categorized_skills;
    const technical = rich && typeof rich === "object" && Object.values(rich).some((value) => hasValue(value))
        ? rich
        : source.technical_skills;
    if (!technical || Array.isArray(technical) || typeof technical !== "object") return [];

    const categories = new Map();
    Object.entries(technical).forEach(([key, value]) => {
        const label = SKILL_CATEGORY_LABELS[key];
        if (!label) return;
        const values = Array.isArray(value) ? value : [value];
        const existing = categories.get(label) || [];
        values.filter(hasValue).forEach((item) => {
            if (!existing.some((current) => String(current).toLowerCase() === String(item).toLowerCase())) {
                existing.push(item);
            }
        });
        if (existing.length) categories.set(label, existing);
    });
    return [...categories.entries()].map(([label, skills]) => ({ label, skills }));
}

export function resumeDisplayName(parsed = {}) {
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return (
        source.personal_information?.full_name ||
        source.contact?.full_name ||
        source.full_name ||
        source.name ||
        "Not detected"
    );
}

export function normalizeRecords(value) {
    if (!hasValue(value)) return [];
    return Array.isArray(value) ? value : [value];
}

export function flattenRecord(record) {
    if (!record || typeof record !== "object") return String(record || "");
    return Object.values(record)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(hasValue)
        .map((value) =>
            typeof value === "object" ? JSON.stringify(value) : String(value),
        )
        .join(" | ");
}

function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
}
