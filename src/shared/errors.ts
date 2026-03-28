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
  subtasks: {
    NOT_FOUND: "Subtask not found.",
    ALREADY_PROMOTED: "Subtask has already been promoted.",
  },
  workLogs: {
    NOT_FOUND: "Work log not found.",
    NOT_OWNER: "You can only edit your own work logs.",
  },
  // Plugin errors go here:
  // admin: { ... }
  activityLogs: {
    NOT_FOUND: "Activity log not found.",
  },
  todos: {
    NOT_FOUND: "Todo not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
  tickets: {
    NOT_FOUND: "Ticket not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
  contacts: {
    NOT_FOUND: "Contact not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },
} as const;
