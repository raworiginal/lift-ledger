export function validateAuthForm({ mode, name, email, password, confirmPassword }) {
  if (mode === "sign-up" && !name.trim()) return "Name is required.";
  if (!email.trim()) return "Email is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (mode === "sign-up" && password !== confirmPassword) return "Passwords do not match.";
  return "";
}
