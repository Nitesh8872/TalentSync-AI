import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "theme";
const ThemeContext = createContext(null);

function storedTheme() {
    try {
        const value = localStorage.getItem(THEME_KEY);
        return value === "dark" ? "dark" : "light";
    } catch {
        return "light";
    }
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
    applyTheme(storedTheme());
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(storedTheme);

    useEffect(() => {
        applyTheme(theme);
        try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage may be unavailable */ }
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    }), [theme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used inside ThemeProvider");
    return context;
}
