export function validatePasswordStrength(password) {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/(\d|[^A-Za-z0-9])/.test(password)) {
        return "Password must contain at least one digit or special character.";
    }
    return "";
}
