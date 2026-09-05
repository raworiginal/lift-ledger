export function validateAuthForm({ mode, username, email, identifier, password, confirmPassword }) {
  if (mode === "sign-up" && !username.trim()) return "Username is required.";
  if (mode === "sign-in" && !identifier.trim()) return "Username or email is required.";
  if (mode === "sign-up" && !email.trim()) return "Email is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (mode === "sign-up" && password !== confirmPassword) return "Passwords do not match.";
  return "";
}
