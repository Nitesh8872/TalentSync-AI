#!/usr/bin/env node
/* Verify React/Vite imports, architecture boundaries, and route coverage. */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "frontend", "src");
const extensions = new Set([".js", ".jsx"]);
const errors = [];

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(target) : [target];
    });
}

const files = walk(src).filter((file) => extensions.has(path.extname(file)));
const importPattern = /(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;

for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
        const specifier = match[1];
        if (!specifier.startsWith(".")) continue;
        const resolved = path.resolve(path.dirname(file), specifier);
        if (!fs.existsSync(resolved)) {
            errors.push(
                `Broken import in ${path.relative(root, file)}: ${specifier}`,
            );
        }
    }
}

const canonicalRoutes = [
    "/",
    "/candidate/register",
    "/candidate/login",
    "/candidate/dashboard",
    "/candidate/resume-upload",
    "/candidate/resume-parser",
    "/candidate/job-description",
    "/candidate/matching",
    "/candidate/ai-feedback",
    "/candidate/browse-jobs",
    "/candidate/recommended-jobs",
    "/candidate/applications",
    "/recruiter/register",
    "/recruiter/login",
    "/recruiter/dashboard",
    "/recruiter/create-job",
    "/recruiter/candidate-matches",
];

const routeSource = fs.readFileSync(
    path.join(src, "routes", "AppRoutes.jsx"),
    "utf8",
);
for (const route of canonicalRoutes) {
    if (!routeSource.includes(`"${route}"`)) {
        errors.push(`Canonical route is not registered: ${route}`);
    }
}

for (const name of ["components", "services", "context", "utils"]) {
    const duplicate = path.join(src, "pages", name);
    if (fs.existsSync(duplicate)) {
        errors.push(`Forbidden duplicate directory: ${path.relative(root, duplicate)}`);
    }
}

const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, "frontend", "package.json"), "utf8"),
);
for (const dependency of ["react", "react-dom", "react-router-dom", "axios"]) {
    if (!packageJson.dependencies?.[dependency]) {
        errors.push(`Missing frontend dependency: ${dependency}`);
    }
}

const apiConfigPath = path.join(src, "config", "apiConfig.js");
const apiConfig = fs.readFileSync(apiConfigPath, "utf8");
if (!apiConfig.includes('"http://127.0.0.1:8000"') && !apiConfig.includes('"http://localhost:8000"')) {
    errors.push("API base URL must be http://127.0.0.1:8000 or http://localhost:8000 in apiConfig.js");
}

const hardcodedApiPattern = /https?:\/\/(?:localhost|127\.0\.0\.1):8000/g;
for (const file of files) {
    if (file === apiConfigPath) continue;
    const source = fs.readFileSync(file, "utf8");
    if (hardcodedApiPattern.test(source)) {
        errors.push(
            `Hardcoded backend URL outside apiConfig.js: ${path.relative(root, file)}`,
        );
    }
    hardcodedApiPattern.lastIndex = 0;
}

for (const legacyFile of ["app.js", "style.css"]) {
    const target = path.join(root, "frontend", legacyFile);
    if (fs.existsSync(target)) {
        errors.push(`Legacy static frontend file remains: frontend/${legacyFile}`);
    }
}

console.log(`Frontend modules checked: ${files.length}`);
console.log(`Canonical routes checked: ${canonicalRoutes.length}`);
console.log("React/Vite architecture checks: enabled");

if (errors.length) {
    console.log("\nFRONTEND AUDIT: FAIL");
    errors.forEach((error) => console.log(`- ${error}`));
    process.exit(1);
}

console.log("\nFRONTEND AUDIT: PASS");
