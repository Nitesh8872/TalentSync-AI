import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import AuthLayout from "../../../components/layouts/AuthLayout.jsx";
import { useRecruiterAuth } from "../../../context/RecruiterAuthContext.jsx";
import { loginRecruiter } from "../../../services/recruiterAuthService.js";

export default function RecruiterLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { setSession } = useRecruiterAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            const data = await loginRecruiter({ email: email.trim(), password });
            setSession({
                access_token: data.access_token,
                recruiter: {
                    id: data.recruiter_id,
                    company_name: data.company_name,
                    recruiter_name: data.recruiter_name,
                    email: email.trim(),
                },
                created_at: new Date().toISOString(),
            });
            navigate("/recruiter/dashboard", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout eyebrow="Recruiter Login" title="Access your recruiter account">
            <form className="form-card compact" onSubmit={submit}>
                <label>
                    Email
                    <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                    Password
                    <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </label>
                <Alert type="info">{location.state?.authNotice}</Alert>
                <Alert type="error">{error}</Alert>
                <Button type="submit" loading={loading}>Login</Button>
                <p className="form-note">
                    Need an account? <Link to="/recruiter/register">Create recruiter account</Link>
                </p>
                <p className="form-note">
                    Candidate? <Link to="/candidate/login">Candidate login</Link>
                </p>
            </form>
        </AuthLayout>
    );
}
