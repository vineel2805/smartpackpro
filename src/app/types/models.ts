export type UserRole = 'student' | 'teacher' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  class?: string;
  school?: string;
  subject?: string;
  assignedClasses?: string[];
  isClassTeacher?: boolean;
  classTeacherOf?: string;
}

export interface PackingItem {
  id: string;
  name: string;
  subject?: string;
  type: 'bring' | 'do-not-bring';
  addedBy?: 'teacher' | 'student';
}

export interface StudentChecklistItem extends PackingItem {
  checked: boolean;
}

export interface HistoryEntry {
  id: string;
  date: string;
  class: string;
  itemsAdded: string[];
  itemsRemoved: string[];
  teacherName?: string;
}

export type EngagementStatus = 'completed' | 'in-progress' | 'not-seen' | 'inactive';

export interface StudentEngagement {
  id: string;
  name: string;
  class: string;
  status: EngagementStatus;
  lastSeen?: string;
}
