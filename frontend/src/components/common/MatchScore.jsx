import { Link } from "react-router-dom";

import { getMatchQuality } from "../../utils/matchScore.js";

export default function MatchScore({ score, matchedCount, missingCount, onExplain, explainTo, compact = false, className = "" }) {
    const value = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
    const quality = getMatchQuality(value);
    const hasEvidence = Number.isFinite(matchedCount) || Number.isFinite(missingCount);

    return (
        <div className={`match-score-summary ${quality.tone} ${compact ? "compact" : ""} ${className}`.trim()}>
            <div className="match-score-value"><strong>{value}%</strong><span>Match</span></div>
            <div className="match-score-context">
                <b className="match-score-label">{quality.label}</b>
                {hasEvidence && <small className="match-score-meta">{matchedCount || 0} skills matched <span aria-hidden="true">·</span> {missingCount || 0} skills missing</small>}
                {onExplain && <button className="match-score-explain-btn" type="button" onClick={onExplain}>Why this score?</button>}
                {!onExplain && explainTo && <Link className="match-score-explain-btn" to={explainTo}>Why this score?</Link>}
            </div>
        </div>
    );
}
