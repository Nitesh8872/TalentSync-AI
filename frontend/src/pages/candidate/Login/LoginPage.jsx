import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import AuthLayout from "../../../components/layouts/AuthLayout.jsx";
import { useCandidateAuth } from "../../../context/CandidateAuthContext.jsx";
import { loginCandidate } from "../../../services/authService.js";

export default function CandidateLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { setSession } = useCandidateAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            const data = await loginCandidate({ email: email.trim(), password });
            setSession({
                access_token: data.access_token,
                user: {
                    id: data.user_id,
                    full_name: data.full_name,
                    email: data.email,
                    role: data.role,
                    profile_image_url: data.profile_image_url,
                },
                created_at: new Date().toISOString(),
            });
            navigate("/candidate/dashboard", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout eyebrow="Candidate Login" title="Open your workspace">
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
                    Need an account? <Link to="/candidate/register">Register</Link>
                </p>
                <p className="form-note">
                    Hiring team? <Link to="/recruiter/login">Recruiter login</Link>
                </p>
            </form>
        </AuthLayout>
    );
}
