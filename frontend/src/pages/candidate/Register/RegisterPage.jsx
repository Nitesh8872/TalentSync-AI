import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import AuthLayout from "../../../components/layouts/AuthLayout.jsx";
import { registerCandidate } from "../../../services/authService.js";
import { validatePasswordStrength } from "../../../utils/passwordValidation.js";

const initialForm = {
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function CandidateRegisterPage() {
    const [form, setForm] = useState(initialForm);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const submit = async (event) => {
        event.preventDefault();
        if (form.password !== form.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }
        const passwordError = validatePasswordStrength(form.password);
        if (passwordError) {
            setMessage({ type: "error", text: passwordError });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            await registerCandidate({
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                password: form.password,
                role: "candidate",
            });
            setMessage({ type: "success", text: "Account created. Redirecting to login..." });
            window.setTimeout(() => navigate("/candidate/login", { replace: true }), 500);
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const update = (event) =>
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

    return (
        <AuthLayout eyebrow="Candidate Registration" title="Create your account">
            <form className="form-card compact" onSubmit={submit}>
                <label>
                    Full name
                    <input className="field" name="full_name" value={form.full_name} onChange={update} required />
                </label>
                <label>
                    Email
                    <input className="field" name="email" type="email" value={form.email} onChange={update} required />
                </label>
                <div className="form-two">
                    <label>
                        Password
                        <input className="field" name="password" type="password" value={form.password} onChange={update} required />
                    </label>
                    <label>
                        Confirm password
                        <input className="field" name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required />
                    </label>
                </div>
                <p className="form-note">
                    Candidate and recruiter accounts are separate role workspaces; use the recruiter registration link for hiring-team access.
                </p>
                <Alert type={message?.type}>{message?.text}</Alert>
                <Button type="submit" loading={loading}>Create account</Button>
                <p className="form-note">
                    Already registered? <Link to="/candidate/login">Candidate login</Link>
                </p>
                <p className="form-note">
                    Hiring team? <Link to="/recruiter/register">Create recruiter account</Link>
                </p>
            </form>
        </AuthLayout>
    );
}
