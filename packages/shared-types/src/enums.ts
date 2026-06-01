export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LaneType = {
  LOGGED: "LOGGED",
  PLANNED: "PLANNED",
  EVENTS: "EVENTS",
  CUSTOM: "CUSTOM",
} as const;
export type LaneType = (typeof LaneType)[keyof typeof LaneType];

export const EntrySource = {
  WEB: "WEB",
  CLI: "CLI",
  MOBILE: "MOBILE",
  DESKTOP: "DESKTOP",
  AI: "AI",
} as const;
export type EntrySource = (typeof EntrySource)[keyof typeof EntrySource];

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
