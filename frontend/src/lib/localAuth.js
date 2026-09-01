export const LANDING_PATH = "/";
export const LOGIN_PATH = "/login";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidWorkEmail(email) {
  return emailPattern.test(email.trim());
}

export function validateDemoRequest({ name, company, email, inspection }) {
  const errors = {};

  if (!name.trim()) errors.name = "Enter your name.";
  if (!company.trim()) errors.company = "Enter your company name.";
  if (!isValidWorkEmail(email)) errors.email = "Enter a valid work email address.";
  if (!inspection.trim()) errors.inspection = "Tell us what you would like to inspect.";

  return { errors };
}

export function validateLocalSignIn({ email, password }) {
  const errors = {};
  const cleanEmail = email.trim();

  if (!cleanEmail) errors.email = "Enter your work email address.";
  else if (!isValidWorkEmail(cleanEmail)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Enter your password to continue.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";

  return { errors, cleanEmail };
}

export function validateLocalSignUp({ name, email, password, confirmPassword, role }) {
  const errors = {};
  const cleanEmail = email.trim();

  if (!name.trim()) errors.name = "Enter your full name.";
  if (!isValidWorkEmail(cleanEmail)) errors.email = "Enter a valid work email address.";
  if (!password || password.length < 8) errors.password = "Use at least 8 characters.";
  if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
  if (!["quality-engineer", "factory-supervisor"].includes(role)) errors.role = "Choose an inspection role.";

  return { errors, cleanEmail };
}

export async function createLocalSession(email, details = {}) {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  const session = { email, mode: "credential-demo", signedInAt: new Date().toISOString(), ...details };
  window.localStorage.setItem("visioninspect.demo.session", JSON.stringify(session));
  return session;
}
