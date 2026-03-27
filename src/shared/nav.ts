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
    label: "Test Items",
    i18nKey: "test-gen.nav.test-gen",
    to: "/dashboard/test-gen",
  },
  {
    label: "Settings",
    i18nKey: "dashboard.nav.settings",
    to: "/dashboard/settings",
  },
  /* v8 ignore start -- import.meta.env.DEV is always true in test; production branch untestable */
  ...(import.meta.env.DEV
    ? [
        {
          label: "Dev Mailbox",
          i18nKey: "dashboard.nav.devMailbox",
          to: "/dev/mailbox",
        },
      ]
    : []),
  /* v8 ignore stop */
];
