import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { CandidateAuthProvider } from "./context/CandidateAuthContext.jsx";
import { RecruiterAuthProvider } from "./context/RecruiterAuthContext.jsx";
import { ResumeProvider } from "./context/ResumeContext.jsx";
import { initializeTheme, ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles/index.css";

initializeTheme();

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <CandidateAuthProvider>
                    <RecruiterAuthProvider>
                        <ResumeProvider>
                            <App />
                        </ResumeProvider>
                    </RecruiterAuthProvider>
                </CandidateAuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>,
);
