import { Task, Goal, DailyPlan, UserSettings, StreakState, Subtask, RecurrenceRule } from '../types';

const TASKS_KEY = 'life_saver_tasks';
const GOALS_KEY = 'life_saver_goals';
const PLAN_KEY = 'life_saver_daily_plan';
const SETTINGS_KEY = 'life_saver_settings';
const STREAK_KEY = 'life_saver_streak';

export const getInitialSettings = (): UserSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  return {
    workingHourStart: '09:00',
    workingHourEnd: '21:00',
    energyPattern: 'flexible'
  };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getInitialStreak = (): StreakState => {
  const stored = localStorage.getItem(STREAK_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  return {
    currentStreak: 0,
    totalCompletedCount: 0
  };
};

export const saveStreak = (streak: StreakState): void => {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
};

export const getInitialGoals = (): Goal[] => {
  const stored = localStorage.getItem(GOALS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  // Default Seed Goals
  const seedGoals: Goal[] = [
    {
      id: 'g-1',
      title: 'Academics Mastery',
      description: 'Ace my upcoming semester examinations and stay on top of daily study schedules.',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isCompleted: false
    },
    {
      id: 'g-2',
      title: 'Healthy Work-Life Routine',
      description: 'Balance intense productivity with fitness and healthy rest habits.',
      targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isCompleted: false
    }
  ];
  localStorage.setItem(GOALS_KEY, JSON.stringify(seedGoals));
  return seedGoals;
};

export const saveGoals = (goals: Goal[]): void => {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
};

export const getInitialTasks = (): Task[] => {
  const stored = localStorage.getItem(TASKS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  
  // Seed sample tasks
  const seedTasks: Task[] = [
    {
      id: 't-1',
      title: 'Compile Physics Lab Report',
      description: 'Write summary, format graphs, and list references for the Electromagnetism lab.',
      deadline: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
      estimatedMinutes: 60,
      importance: 5,
      isCompleted: false,
      subtasks: [
        { id: 's-1-1', title: 'Plot current-voltage graphs in Python/Excel', isCompleted: false },
        { id: 's-1-2', title: 'Write error-margin analysis paragraph', isCompleted: false },
        { id: 's-1-3', title: 'Compile everything into a PDF', isCompleted: false }
      ],
      goalId: 'g-1',
      recurrence: 'none'
    },
    {
      id: 't-2',
      title: 'Renew Gym Membership',
      description: 'Complete online renewal or pay at the desk to maintain streak.',
      deadline: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // ~1 day from now
      estimatedMinutes: 15,
      importance: 2,
      isCompleted: false,
      subtasks: [],
      goalId: 'g-2',
      recurrence: 'monthly'
    },
    {
      id: 't-3',
      title: 'Daily Coding Prep',
      description: 'Solve at least two algorithms tasks on LeetCode to practice daily coding.',
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
      estimatedMinutes: 45,
      importance: 4,
      isCompleted: false,
      subtasks: [],
      goalId: 'g-1',
      recurrence: 'daily'
    }
  ];
  localStorage.setItem(TASKS_KEY, JSON.stringify(seedTasks));
  return seedTasks;
};

export const saveTasks = (tasks: Task[]): void => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const getInitialDailyPlan = (): DailyPlan | null => {
  const stored = localStorage.getItem(PLAN_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  return null;
};

export const saveDailyPlan = (plan: DailyPlan | null): void => {
  if (plan) {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } else {
    localStorage.removeItem(PLAN_KEY);
  }
};

// Helper: Shift ISO date by recurrence rule
export const calculateNextOccurrenceDate = (currentIso: string, recurrence: RecurrenceRule): string => {
  const date = new Date(currentIso);
  if (recurrence === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
};

// Helper: Handle task completion recurrence & streaks
export const processTaskCompletion = (
  tasks: Task[],
  completedTaskId: string,
  isCompleted: boolean,
  actualMinutes?: number
): { updatedTasks: Task[]; streakUpdated: boolean } => {
  let streakUpdated = false;
  const updatedTasks = tasks.map(task => {
    if (task.id === completedTaskId) {
      const completedAt = isCompleted ? new Date().toISOString() : undefined;
      return {
        ...task,
        isCompleted,
        completedAt,
        actualMinutes: isCompleted ? (actualMinutes ?? task.estimatedMinutes) : undefined
      };
    }
    return task;
  });

  const completedTask = tasks.find(t => t.id === completedTaskId);
  if (!completedTask) return { updatedTasks, streakUpdated };

  // 1. Recurrence handling: Auto-generate next instance of recurring task
  if (isCompleted && completedTask.recurrence !== 'none') {
    const nextDeadline = calculateNextOccurrenceDate(completedTask.deadline, completedTask.recurrence);
    // Double check we don't already have an uncompleted task of the exact same title & recurrence scheduled for the future
    const alreadyExists = tasks.some(t => 
      t.title === completedTask.title && 
      !t.isCompleted && 
      t.recurrence === completedTask.recurrence &&
      new Date(t.deadline).getTime() >= new Date(completedTask.deadline).getTime()
    );

    if (!alreadyExists) {
      const nextTask: Task = {
        id: `t-recurring-${Date.now()}`,
        title: completedTask.title,
        description: completedTask.description,
        deadline: nextDeadline,
        estimatedMinutes: completedTask.estimatedMinutes,
        importance: completedTask.importance,
        isCompleted: false,
        subtasks: completedTask.subtasks.map(s => ({ ...s, id: `s-recurring-${Date.now()}-${Math.random()}`, isCompleted: false })),
        goalId: completedTask.goalId,
        recurrence: completedTask.recurrence
      };
      updatedTasks.push(nextTask);
    }
  }

  // 2. Habit Streaks / Gamification handling
  if (isCompleted) {
    const todayStr = new Date().toISOString().split('T')[0];
    const streak = getInitialStreak();
    
    let currentStreak = streak.currentStreak;
    const lastDate = streak.lastCompletedDate;
    
    if (!lastDate) {
      currentStreak = 1;
      streakUpdated = true;
    } else if (lastDate === todayStr) {
      // Already completed a task today, streak remains unchanged
    } else {
      const lastCompletedObj = new Date(lastDate);
      const todayObj = new Date(todayStr);
      const diffTime = Math.abs(todayObj.getTime() - lastCompletedObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        currentStreak += 1;
        streakUpdated = true;
      } else {
        // Streak broken
        currentStreak = 1;
        streakUpdated = true;
      }
    }

    const updatedStreakState: StreakState = {
      currentStreak,
      lastCompletedDate: todayStr,
      totalCompletedCount: streak.totalCompletedCount + 1
    };
    saveStreak(updatedStreakState);
  }

  saveTasks(updatedTasks);
  return { updatedTasks, streakUpdated };
};
