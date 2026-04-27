export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer',
}

export enum PeriodState {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum WorkItemType {
  TASK = 'task',
  BUG = 'bug',
  FEATURE = 'feature',
  EPIC = 'epic',
  STORY = 'story',
  SUBTASK = 'subtask',
}
