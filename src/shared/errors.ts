export const ERRORS = {
  auth: {
    EMAIL_NOT_SENT: "Unable to send email.",
    USER_NOT_CREATED: "Unable to create user.",
    SOMETHING_WENT_WRONG:
      "Something went wrong while trying to authenticate.",
  },
  onboarding: {
    USERNAME_ALREADY_EXISTS: "Username already exists.",
    SOMETHING_WENT_WRONG:
      "Something went wrong while trying to onboard.",
  },
  common: {
    UNKNOWN: "Unknown error.",
    ENVS_NOT_INITIALIZED: "Environment variables not initialized.",
    SOMETHING_WENT_WRONG: "Something went wrong.",
  },
  tasks: {
    NOT_FOUND: "Task not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
  projects: {
    NOT_FOUND: "Project not found.",
  },
  // Plugin errors go here:
  // admin: { ... }
  subtasks: {
    NOT_FOUND: "Subtask not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
  "work-logs": {
    NOT_FOUND: "Work Log not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
} as const;
