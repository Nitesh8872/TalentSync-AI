export default function SkillTags({ skills = [], missing = false, emptyText = "No skills listed." }) {
    if (!Array.isArray(skills) || !skills.length) {
        return <p className="empty-state">{emptyText}</p>;
    }

    return (
        <div className={`tag-list ${missing ? "tag-list-missing" : ""}`.trim()}>
            {skills.map((skill) => (
                <span key={skill}>{skill}</span>
            ))}
        </div>
    );
}
