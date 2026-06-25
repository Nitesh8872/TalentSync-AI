import {
    Award,
    BookOpen,
    ExternalLink,
    FolderKanban,
    GraduationCap,
    HeartHandshake,
    Link as LinkIcon,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from "lucide-react";

import SkillTags from "../common/SkillTags.jsx";
import {
    categorizedResumeSkills,
    normalizeRecords,
    resumeDisplayName,
} from "../../utils/resumeData.js";

const hasValue = (value) =>
    value !== null && value !== undefined && String(value).trim() !== "";

const firstValue = (record, keys, fallback = "") => {
    for (const key of keys) {
        if (hasValue(record?.[key])) return String(record[key]).trim();
    }
    return fallback;
};

const toList = (value) => {
    if (!hasValue(value)) return [];
    return Array.isArray(value) ? value.filter(hasValue) : [value];
};

const safeUrl = (value) => {
    if (!hasValue(value)) return "";
    const url = String(value).trim();
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

function SectionHeading({ icon: Icon, title, count }) {
    return (
        <div className="resume-section-heading">
            <span className="resume-section-icon"><Icon size={18} /></span>
            <div>
                <h2>{title}</h2>
                {count !== undefined && <p>{count} {count === 1 ? "entry" : "entries"}</p>}
            </div>
        </div>
    );
}

function EmptyContent({ children }) {
    return <p className="resume-empty-content">{children}</p>;
}

function ContactItem({ icon: Icon, label, value, href }) {
    if (!hasValue(value)) return null;
    const content = (
        <>
            <Icon size={16} aria-hidden="true" />
            <span><small>{label}</small><strong>{value}</strong></span>
            {href && <ExternalLink size={14} className="resume-contact-arrow" aria-hidden="true" />}
        </>
    );
    return href ? (
        <a className="resume-contact-item" href={href} target="_blank" rel="noreferrer">{content}</a>
    ) : (
        <div className="resume-contact-item">{content}</div>
    );
}

function ExperienceCard({ item, isLast }) {
    const title = firstValue(item, ["job_title", "role", "position", "title"], "Professional experience");
    const company = firstValue(item, ["company_name", "company", "organization", "employer"]);
    const start = firstValue(item, ["start_date", "start_year", "from"]);
    const end = firstValue(item, ["end_date", "end_year", "to"], start ? "Present" : "");
    const location = firstValue(item, ["location", "city"]);
    const responsibilities = toList(item?.responsibilities || item?.achievements || item?.description);
    const technologies = toList(item?.technologies_used || item?.technologies || item?.skills);

    return (
        <article className={`experience-item ${isLast ? "last" : ""}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="experience-card">
                <div className="experience-card-head">
                    <div>
                        <h3>{title}</h3>
                        {company && <p>{company}</p>}
                    </div>
                    {(start || end) && <span className="date-pill">{[start, end].filter(Boolean).join(" – ")}</span>}
                </div>
                {location && <span className="resume-location"><MapPin size={14} />{location}</span>}
                {responsibilities.length > 0 && (
                    <ul>{responsibilities.map((item, index) => <li key={`${item}-${index}`}>{String(item)}</li>)}</ul>
                )}
                {technologies.length > 0 && <SkillTags skills={technologies.map(String)} />}
            </div>
        </article>
    );
}

function ProjectCard({ item }) {
    const name = firstValue(item, ["project_name", "name", "title"], "Project");
    const duration = firstValue(item, ["duration", "date", "year"]);
    const features = toList(item?.bullet_descriptions || item?.key_features || item?.highlights || item?.responsibilities);
    const description = firstValue(item, ["description", "summary", "overview"]);
    const technologies = toList(item?.technologies || item?.technologies_used || item?.skills);
    const link = firstValue(item, ["github_link", "url", "link", "github"]);
    const status = firstValue(item, ["status_type", "status", "type"]);
    const showDescription = description && !features.some((feature) => String(feature).trim() === description);

    return (
        <article className="project-card">
            <div className="project-card-top">
                <span className="project-glyph"><FolderKanban size={19} /></span>
                {(status || duration) && <span className="date-pill">{status || duration}</span>}
            </div>
            <h3>{name}</h3>
            {showDescription && <p>{description}</p>}
            {features.length > 0 && <ul>{features.map((feature, index) => <li key={`${feature}-${index}`}>{String(feature)}</li>)}</ul>}
            {technologies.length > 0 && <SkillTags skills={technologies.map(String)} />}
            {link && <a className="project-link" href={safeUrl(link)} target="_blank" rel="noreferrer">View project <ExternalLink size={14} /></a>}
        </article>
    );
}

function EducationCard({ item }) {
    const institution = firstValue(item, ["institution", "university", "school", "college"], "Education");
    const degree = firstValue(item, ["degree", "qualification", "course"]);
    const specialization = firstValue(item, ["specialization", "field_of_study", "major"]);
    const start = firstValue(item, ["start_year", "start_date"]);
    const end = firstValue(item, ["end_year", "end_date", "graduation_year"]);
    const grade = firstValue(item, ["cgpa_or_percentage", "gpa", "grade", "score"]);
    const location = firstValue(item, ["location", "city"]);
    const expectedYear = firstValue(item, ["expected_year"]);

    return (
        <article className="education-card">
            <span className="education-mark"><GraduationCap size={20} /></span>
            <div>
                <div className="education-title-row">
                    <div><h3>{institution}</h3>{degree && <p>{degree}</p>}</div>
                    {(start || end || expectedYear) && <span className="date-pill">{expectedYear ? `Expected ${expectedYear}` : [start, end].filter(Boolean).join(" – ")}</span>}
                </div>
                <div className="education-meta">
                    {specialization && <span>{specialization}</span>}
                    {grade && <span>Grade: {grade}</span>}
                    {location && <span>{location}</span>}
                </div>
            </div>
        </article>
    );
}

function SimpleListSection({ icon, title, items, emptyText }) {
    return (
        <section className="resume-card resume-content-section">
            <SectionHeading icon={icon} title={title} count={items.length} />
            {items.length ? <ul className="resume-detail-list">{items.map((item, index) => <li key={`${item}-${index}`}>{String(item)}</li>)}</ul> : <EmptyContent>{emptyText}</EmptyContent>}
        </section>
    );
}

export default function ParsedResumeView({ resume, candidate }) {
    if (!resume) return null;

    const parsed = resume.parsed_data && typeof resume.parsed_data === "object" ? resume.parsed_data : {};
    const personal = parsed.personal_information || parsed.contact || {};
    const name = resumeDisplayName(parsed) === "Not detected"
        ? candidate?.full_name || "Your professional profile"
        : resumeDisplayName(parsed);
    const summary = firstValue(parsed, ["summary", "professional_summary", "objective"]);
    const role = firstValue(parsed, ["professional_role", "job_title", "headline"]);
    const skillCategories = categorizedResumeSkills(parsed);
    const experience = normalizeRecords(parsed.work_experience || parsed.experience);
    const projects = normalizeRecords(parsed.project_details || parsed.projects || parsed.project_experience);
    const education = normalizeRecords(parsed.education);
    const combined = parsed.achievements_certifications && typeof parsed.achievements_certifications === "object"
        ? parsed.achievements_certifications
        : {};
    const achievements = normalizeRecords(parsed.achievements || combined.achievements).map(String);
    const certifications = normalizeRecords(parsed.certifications || combined.certifications).map((item) => {
        if (typeof item !== "object") return String(item);
        return [item.certification_name || item.name, item.organization, item.year].filter(hasValue).join(" — ");
    });
    const softSkills = normalizeRecords(parsed.soft_skills).map(String);
    const contacts = {
        email: firstValue(personal, ["email"], candidate?.email || ""),
        phone: firstValue(personal, ["phone", "phone_number"]),
        location: firstValue(personal, ["location", "address"]),
        linkedin: firstValue(personal, ["linkedin", "linkedin_url"]),
        github: firstValue(personal, ["github", "github_url"]),
        portfolio: firstValue(personal, ["portfolio", "portfolio_website", "website"]),
        leetcode: firstValue(personal, ["leetcode", "leetcode_url"]),
        codechef: firstValue(personal, ["codechef", "codechef_url"]),
    };

    return (
        <div className="resume-profile-content">
            <section className="resume-card profile-overview-card">
                <div className="profile-identity">
                    <span className="profile-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <div>
                        <span className="profile-label">Professional Profile</span>
                        <h2>{name}</h2>
                        {role && <p className="profile-role">{role}</p>}
                        {contacts.location && <span className="profile-location"><MapPin size={15} />{contacts.location}</span>}
                    </div>
                </div>
                {summary && <div className="profile-summary"><h3>Summary</h3><p>{summary}</p></div>}
                <h3 className="resume-subsection-title">Contact Links</h3>
                <div className="resume-contact-grid">
                    <ContactItem icon={Mail} label="Email" value={contacts.email} href={`mailto:${contacts.email}`} />
                    <ContactItem icon={Phone} label="Phone" value={contacts.phone} href={`tel:${contacts.phone}`} />
                    <ContactItem icon={LinkIcon} label="LinkedIn" value={contacts.linkedin} href={safeUrl(contacts.linkedin)} />
                    <ContactItem icon={LinkIcon} label="GitHub" value={contacts.github} href={safeUrl(contacts.github)} />
                    <ContactItem icon={LinkIcon} label="Portfolio" value={contacts.portfolio} href={safeUrl(contacts.portfolio)} />
                    <ContactItem icon={LinkIcon} label="LeetCode" value={contacts.leetcode} href={safeUrl(contacts.leetcode)} />
                    <ContactItem icon={LinkIcon} label="CodeChef" value={contacts.codechef} href={safeUrl(contacts.codechef)} />
                </div>
            </section>

            <section className="resume-card resume-content-section">
                <SectionHeading icon={BookOpen} title="Categorized Skills" count={skillCategories.length} />
                {skillCategories.length ? <div className="resume-skill-categories">{skillCategories.map(({ label, skills }) => <div key={label}><h3>{label}</h3><SkillTags skills={skills.map(String)} /></div>)}</div> : <EmptyContent>Add skills to your resume to improve job matching.</EmptyContent>}
            </section>

            <section className="resume-card resume-content-section">
                <SectionHeading icon={FolderKanban} title="Projects" count={projects.length} />
                {projects.length ? <div className="projects-grid">{projects.map((item, index) => <ProjectCard key={index} item={item} />)}</div> : <EmptyContent>No projects are listed in this resume.</EmptyContent>}
            </section>

            <section className="resume-card resume-content-section">
                <SectionHeading icon={GraduationCap} title="Education" count={education.length} />
                {education.length ? <div className="education-list">{education.map((item, index) => <EducationCard key={index} item={item} />)}</div> : <EmptyContent>No education details are listed in this resume.</EmptyContent>}
            </section>

            <SimpleListSection icon={Award} title="Achievements & Certifications" items={[...achievements, ...certifications]} emptyText="No achievements or certifications are listed in this resume." />

            <SimpleListSection icon={HeartHandshake} title="Soft Skills" items={softSkills} emptyText="No soft skills are listed in this resume." />

            <section className="resume-card resume-content-section">
                <SectionHeading icon={UserRound} title="Experience" count={experience.length} />
                {experience.length ? <div className="experience-timeline">{experience.map((item, index) => <ExperienceCard key={index} item={item} isLast={index === experience.length - 1} />)}</div> : <EmptyContent>No professional experience listed.</EmptyContent>}
            </section>

        </div>
    );
}
