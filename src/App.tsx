import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, CheckSquare, Flame, Calendar, Target, Settings, ShieldAlert, Award } from 'lucide-react';
import { Task, Goal, DailyPlan, UserSettings, StreakState } from './types';
import {
  getInitialTasks,
  getInitialGoals,
  getInitialDailyPlan,
  getInitialSettings,
  getInitialStreak,
  saveTasks,
  saveGoals,
  saveDailyPlan,
  saveSettings,
  saveStreak,
  processTaskCompletion
} from './utils/storage';

// Component imports
import Dashboard from './components/Dashboard';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import PanicMode from './components/PanicMode';
import DailyPlanner from './components/DailyPlanner';
import GoalTracker from './components/GoalTracker';
import SettingsPanel from './components/SettingsPanel';
import VoiceAssistant from './components/VoiceAssistant';

type TabId = 'dashboard' | 'tasks' | 'panic' | 'plan' | 'goals' | 'settings';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  
  // App States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    workingHourStart: '09:00',
    workingHourEnd: '21:00',
    energyPattern: 'flexible'
  });
  const [streak, setStreak] = useState<StreakState>({ currentStreak: 0, totalCompletedCount: 0 });

  // Voice assistant drafts
  const [voiceDraftTask, setVoiceDraftTask] = useState<{ title: string; deadline: string; estimatedMinutes: number; importance: number } | null>(null);

  // Load state on mount
  useEffect(() => {
    setTasks(getInitialTasks());
    setGoals(getInitialGoals());
    setCurrentPlan(getInitialDailyPlan());
    setSettings(getInitialSettings());
    setStreak(getInitialStreak());
  }, []);

  // Update lists
  const handleSaveTask = (taskData: Omit<Task, 'id' | 'isCompleted' | 'subtasks'> & { subtaskTitles?: string[] }) => {
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      deadline: taskData.deadline,
      estimatedMinutes: taskData.estimatedMinutes,
      importance: taskData.importance,
      isCompleted: false,
      goalId: taskData.goalId,
      recurrence: taskData.recurrence,
      subtasks: (taskData.subtaskTitles || []).map((title, index) => ({
        id: `s-${Date.now()}-${index}`,
        title,
        isCompleted: false
      }))
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleToggleTask = (taskId: string, isCompleted: boolean, actualMinutes?: number) => {
    const { updatedTasks, streakUpdated } = processTaskCompletion(tasks, taskId, isCompleted, actualMinutes);
    setTasks(updatedTasks);
    if (streakUpdated) {
      setStreak(getInitialStreak()); // refresh streak count
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string, isCompleted: boolean) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(sub => 
            sub.id === subtaskId ? { ...sub, isCompleted } : sub
          )
        };
      }
      return task;
    });
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const filtered = tasks.filter(t => t.id !== taskId);
    setTasks(filtered);
    saveTasks(filtered);
  };

  // Goals operations
  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'isCompleted'>) => {
    const newGoal: Goal = {
      id: `g-${Date.now()}`,
      title: goalData.title,
      description: goalData.description,
      targetDate: goalData.targetDate,
      isCompleted: false
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const handleToggleGoal = (id: string, isCompleted: boolean) => {
    const updatedGoals = goals.map(g => g.id === id ? { ...g, isCompleted } : g);
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const handleDeleteGoal = (id: string) => {
    const filtered = goals.filter(g => g.id !== id);
    setGoals(filtered);
    saveGoals(filtered);

    // Unlink any tasks linked to deleted goal
    const unlinkedTasks = tasks.map(t => t.goalId === id ? { ...t, goalId: undefined } : t);
    setTasks(unlinkedTasks);
    saveTasks(unlinkedTasks);
  };

  // Plan actions
  const handleSavePlan = (plan: DailyPlan) => {
    setCurrentPlan(plan);
    saveDailyPlan(plan);
  };

  const handleClearPlan = () => {
    setCurrentPlan(null);
    saveDailyPlan(null);
  };

  // Settings action
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Add AI Subtasks (called from PanicMode)
  const handleAddTaskSubtasks = (taskId: string, subtaskTitles: string[]) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const existingSubtasks = task.subtasks || [];
        const newSubtasks = subtaskTitles.map((title, idx) => ({
          id: `s-ai-${Date.now()}-${idx}`,
          title,
          isCompleted: false
        }));
        return {
          ...task,
          subtasks: [...existingSubtasks, ...newSubtasks]
        };
      }
      return task;
    });
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  // Handling Voice Assistant draft
  const handleVoiceDraftTask = (draft: { title: string; deadline: string; estimatedMinutes: number; importance: number }) => {
    setVoiceDraftTask(draft);
    setCurrentTab('tasks');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 font-sans flex flex-col">
      {/* Dynamic Voice Assistant floating widget */}
      <VoiceAssistant
        tasks={tasks}
        goals={goals}
        onAddTaskDraft={handleVoiceDraftTask}
        onNavigateToTab={(tab) => setCurrentTab(tab as TabId)}
        onClearPlan={handleClearPlan}
        onAddGoal={handleAddGoal}
      />

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="h-9 w-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm shadow-emerald-500/20">
              ✓
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">The Last-Minute</h1>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider block mt-0.5 uppercase">Life Saver</span>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1">
            {([
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'tasks', label: 'Actions List', icon: CheckSquare },
              { id: 'panic', label: 'Panic Prioritizer', icon: Flame },
              { id: 'plan', label: 'Daily Planner', icon: Calendar },
              { id: 'goals', label: 'Long-Term Goals', icon: Target },
              { id: 'settings', label: 'Settings', icon: Settings }
            ] as const).map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <IconComponent className={`h-4 w-4 ${currentTab === tab.id ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Streak Indicator Widget */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-1.5">
            <Flame className="h-4 w-4 text-orange-500 fill-current animate-pulse" />
            <span className="font-mono text-xs font-black text-slate-700">
              {streak.currentStreak} Day Streak
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            tasks={tasks}
            goals={goals}
            currentPlan={currentPlan}
            streak={streak}
            onNavigateToTab={(tab) => setCurrentTab(tab as TabId)}
            onCompleteTask={(id) => handleToggleTask(id, true)}
            onStartFocusTimer={(taskId, recommendedDuration) => {
              // Automatically switch to Panic Mode and start timer!
              setCurrentTab('panic');
              // Delay slightly so tab content renders
              setTimeout(() => {
                const triggerBtn = document.getElementById(`start-timer-${taskId}`);
                if (triggerBtn) triggerBtn.click();
              }, 100);
            }}
          />
        )}

        {currentTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TaskForm
                goals={goals}
                onSaveTask={handleSaveTask}
                draftTask={voiceDraftTask}
                onClearDraft={() => setVoiceDraftTask(null)}
              />
            </div>
            <div className="lg:col-span-2">
              <TaskList
                tasks={tasks}
                goals={goals}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                onDeleteTask={handleDeleteTask}
                onTriggerPanic={() => setCurrentTab('panic')}
              />
            </div>
          </div>
        )}

        {currentTab === 'panic' && (
          <PanicMode
            tasks={tasks}
            onUpdateTasks={(updated) => { setTasks(updated); saveTasks(updated); }}
            onAddTaskSubtasks={handleAddTaskSubtasks}
          />
        )}

        {currentTab === 'plan' && (
          <DailyPlanner
            tasks={tasks}
            settings={settings}
            currentPlan={currentPlan}
            onSavePlan={handleSavePlan}
            onClearPlan={handleClearPlan}
          />
        )}

        {currentTab === 'goals' && (
          <GoalTracker
            goals={goals}
            tasks={tasks}
            onAddGoal={handleAddGoal}
            onToggleGoal={handleToggleGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>

      {/* Footer info banner */}
      <footer className="border-t border-slate-100 pt-5 pb-20 md:pb-5 bg-white text-center text-xs text-slate-400 font-medium">
        <span>The Last-Minute Life Saver. Powered by Gemini Flash 3.5 — Stop reminding, start doing.</span>
      </footer>

      {/* Responsive Bottom Navigation Bar for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-150 h-16 z-40 px-3 flex items-center justify-around shadow-2xl">
        {([
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'tasks', label: 'List', icon: CheckSquare },
          { id: 'panic', label: 'Panic', icon: Flame },
          { id: 'plan', label: 'Planner', icon: Calendar },
          { id: 'goals', label: 'Goals', icon: Target }
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer ${
                currentTab === tab.id ? 'text-emerald-600 font-bold' : 'text-slate-400'
              }`}
              id={`mobile-nav-${tab.id}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] uppercase font-black tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
