export interface NavItem {
  label: string;
  i18nKey: string;
  to: string;
  icon?: React.ComponentType;
  authRequired?: boolean;
}

/**
 * Data-driven navigation items.
 * Plugins append to this array to add their own nav entries.
 */
export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    i18nKey: "dashboard.nav.dashboard",
    to: "/dashboard",
  },
  {
    label: "My Tasks",
    i18nKey: "tasks.nav.myTasks",
    to: "/dashboard/tasks",
  },
  {
    label: "Team Pool",
    i18nKey: "tasks.nav.teamPool",
    to: "/dashboard/team-pool",
  },
  {
    label: "Projects",
    i18nKey: "projects.nav.projects",
    to: "/dashboard/projects",
  },
    {
    label: "Todos",
    i18nKey: "todos.nav.todos",
    to: "/dashboard/todos",
  },
    {
    label: "Tickets",
    i18nKey: "tickets.nav.tickets",
    to: "/dashboard/tickets",
  },
    {
    label: "Contacts",
    i18nKey: "contacts.nav.contacts",
    to: "/dashboard/contacts",
  },
    {
        label: "Subtasks",
        i18nKey: "subtasks.nav.subtasks",
        to: "/dashboard/subtasks",
      },
    {
        label: "Work Logs",
        i18nKey: "workLogs.nav.workLogs",
        to: "/dashboard/workLogs",
      },
    {
        label: "Activity Logs",
        i18nKey: "activityLogs.nav.activityLogs",
        to: "/dashboard/activityLogs",
      },
    {
    label: "Imports",
    i18nKey: "imports.nav.imports",
    to: "/dashboard/imports",
  },
    {
    label: "Settings",
    i18nKey: "dashboard.nav.settings",
    to: "/dashboard/settings",
  },
  /* v8 ignore next -- import.meta.env.DEV is compile-time true in Vite test mode; production branch unreachable */
  ...(import.meta.env.DEV
    ? [
        {
          label: "Dev Mailbox",
          i18nKey: "dashboard.nav.devMailbox",
          to: "/dev/mailbox",
        },
      ]
    : []),
];
