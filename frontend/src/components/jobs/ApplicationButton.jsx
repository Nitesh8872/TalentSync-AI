import { useState } from "react";
import { Check } from "lucide-react";

import {
    submitJobApplication,
} from "../../services/applicationService.js";
import { useApplications } from "../../context/ApplicationContext.jsx";
import Button from "../common/Button.jsx";

export default function ApplicationButton({
    candidateId,
    jobId,
    onMessage,
    size = "sm",
}) {
    const { appliedJobIds, refreshApplications } = useApplications();
    const [loading, setLoading] = useState(false);
    const applied = appliedJobIds.has(Number(jobId));

    const apply = async () => {
        setLoading(true);
        try {
            const response = await submitJobApplication(candidateId, jobId);
            refreshApplications();
            onMessage?.({
                type: "success",
                text: response.message || "Application submitted successfully",
            });
        } catch (error) {
            if (error.code === "DUPLICATE_APPLICATION") refreshApplications();
            onMessage?.({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size={size}
            loading={loading}
            disabled={applied}
            onClick={apply}
            type="button"
        >
            {applied ? <><Check size={15} /> Application Submitted</> : "Apply now"}
        </Button>
    );
}
