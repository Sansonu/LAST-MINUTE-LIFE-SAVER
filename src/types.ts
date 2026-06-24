export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string; // ISO string or YYYY-MM-DDTHH:mm
  estimatedMinutes: number;
  actualMinutes?: number; // Tracks actual time vs estimated for AI learning
  importance: number; // 1 to 5
  isCompleted: boolean;
  completedAt?: string;
  subtasks: Subtask[];
  goalId?: string; // Linked Goal ID
  recurrence: RecurrenceRule;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  isCompleted: boolean;
}

export interface TimeBlock {
  id: string;
  startTime: string; // e.g., "09:00"
  endTime: string; // e.g., "10:30"
  taskTitle: string;
  type: 'focus' | 'break' | 'buffer' | 'personal';
  notes?: string;
  isCompleted?: boolean;
}

export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  rationale: string;
  timeBlocks: TimeBlock[];
}

export interface UserSettings {
  workingHourStart: string; // "09:00"
  workingHourEnd: string; // "22:00"
  energyPattern: 'morning' | 'afternoon' | 'evening' | 'flexible';
}

export interface StreakState {
  currentStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  totalCompletedCount: number;
}
