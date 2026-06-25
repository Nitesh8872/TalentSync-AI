import { BrainCircuit, Sparkles } from "lucide-react";

import AnalysisWorkspace from "../../../components/matching/AnalysisWorkspace.jsx";

export default function MatchingPage() {
    return (
        <div className="career-coach-page">
            <header className="coach-page-header">
                <div>
                    <p className="eyebrow"><Sparkles size={14} /> Personalized career guidance</p>
                    <h1>AI Career Coach</h1>
                    <p>Turn your latest resume and active career target into a focused plan for stronger applications.</p>
                </div>
                <span className="coach-ai-badge"><BrainCircuit size={18} /><span><strong>Always personalized</strong><small>Latest resume · Active target</small></span></span>
            </header>
            <AnalysisWorkspace />
        </div>
    );
}
