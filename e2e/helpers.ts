import type { Session } from "feather-testing-core/playwright";

/**
 * Reusable sign-up helper: creates a new account, completes onboarding,
 * and ends on /dashboard.
 */
export function signUp(
  session: Session,
  email: string,
  password: string,
  username: string,
): Session {
  return session
    .visit("/login")
    .click("Create an account")
    .fillIn("Email", email)
    .fillIn("Password", password)
    .clickButton("Sign Up")
    .fillIn("Username", username)
    .clickButton("Continue")
    .assertPath("/dashboard");
}

/**
 * Create a task from the My Tasks page.
 * Assumes the user is already on /dashboard/tasks.
 */
export function createTask(session: Session, title: string): Session {
  return session
    .fillIn("Add a task...", title)
    .clickButton("Add")
    .assertText(title);
}

/**
 * Navigate to the Projects page and create a project.
 * Assumes the user is authenticated and on /dashboard/*.
 */
export function createProject(session: Session, name: string): Session {
  return session
    .visit("/dashboard/projects")
    .fillIn("New project name...", name)
    .clickButton("Create")
    .assertText(name);
}

function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export { uniqueEmail };
