import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Alert from "../../../components/common/Alert.jsx";
import Button from "../../../components/common/Button.jsx";
import AuthLayout from "../../../components/layouts/AuthLayout.jsx";
import { registerRecruiter } from "../../../services/recruiterAuthService.js";

const initialForm = {
    company_name: "",
    recruiter_name: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function RecruiterRegisterPage() {
    const [form, setForm] = useState(initialForm);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const update = (event) =>
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        if (form.password !== form.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            await registerRecruiter({
                company_name: form.company_name.trim(),
                recruiter_name: form.recruiter_name.trim(),
                email: form.email.trim(),
                password: form.password,
            });
            setMessage({ type: "success", text: "Recruiter account created. Redirecting to login..." });
            window.setTimeout(() => navigate("/recruiter/login", { replace: true }), 500);
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout eyebrow="Recruiter Registration" title="Create recruiter account">
            <form className="form-card compact" onSubmit={submit}>
                <label>
                    Company name
                    <input className="field" name="company_name" value={form.company_name} onChange={update} required />
                </label>
                <label>
                    Recruiter name
                    <input className="field" name="recruiter_name" value={form.recruiter_name} onChange={update} required />
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
                    Recruiter and candidate accounts are separate role workspaces; create a candidate account separately for job seeking.
                </p>
                <Alert type={message?.type}>{message?.text}</Alert>
                <Button type="submit" loading={loading}>Create recruiter account</Button>
                <p className="form-note">
                    Already registered? <Link to="/recruiter/login">Recruiter login</Link>
                </p>
                <p className="form-note">
                    Candidate? <Link to="/candidate/register">Candidate registration</Link>
                </p>
            </form>
        </AuthLayout>
    );
}
