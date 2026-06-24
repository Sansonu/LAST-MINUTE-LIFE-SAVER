import React from 'react';
import { Sparkles, Calendar, Clock, AlertCircle, Play, CheckCircle2, TrendingUp, Award, Flame, Layers, LayoutDashboard, PlusCircle, Check } from 'lucide-react';
import { Task, Goal, DailyPlan, StreakState } from '../types';

interface DashboardProps {
  tasks: Task[];
  goals: Goal[];
  currentPlan: DailyPlan | null;
  streak: StreakState;
  onNavigateToTab: (tab: string) => void;
  onCompleteTask: (id: string) => void;
  onStartFocusTimer: (taskId: string, recommendedDuration: number) => void;
}

export default function Dashboard({
  tasks,
  goals,
  currentPlan,
  streak,
  onNavigateToTab,
  onCompleteTask,
  onStartFocusTimer
}: DashboardProps) {
  const activeTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  // 1. Calculate Core "Do This Now" Recommendation
  const getDoThisNowTask = (): Task | null => {
    if (activeTasks.length === 0) return null;
    // Sort active tasks: earliest deadline and higher importance first
    const sorted = [...activeTasks].sort((a, b) => {
      const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (Math.abs(diff) < 2 * 60 * 60 * 1000) { // If deadlines are within 2 hours, prioritize importance
        return b.importance - a.importance;
      }
      return diff;
    });
    return sorted[0];
  };

  const topTask = getDoThisNowTask();

  // 2. Stats Calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = completedTasks.length;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const onTimeCount = completedTasks.filter(t => {
    if (!t.completedAt) return true;
    return new Date(t.completedAt).getTime() <= new Date(t.deadline).getTime();
  }).length;
  const onTimeRate = completedTasksCount > 0 ? Math.round((onTimeCount / completedTasksCount) * 100) : 100;

  // Streak Badge Level (AF-2)
  const getStreakLevelBadge = (streakCount: number) => {
    if (streakCount >= 30) return { title: "Grandmaster Monk Badge", desc: "30+ Days Streak reached! Mind-blowing consistency.", color: "from-purple-600 to-indigo-600" };
    if (streakCount >= 10) return { title: "Daily Warrior Badge", desc: "10+ Days Streak reached! You're crushing standard limits.", color: "from-blue-600 to-cyan-500" };
    if (streakCount >= 5) return { title: "Consistent Catalyst Badge", desc: "5-day Streak achieved! consistent habits are locked in.", color: "from-emerald-500 to-teal-500" };
    if (streakCount > 0) return { title: "Habit Pioneer Badge", desc: `${streakCount} Day Streak active! Keep the momentum alive.`, color: "from-amber-500 to-orange-500" };
    return { title: "Initiate Status", desc: "Mark your first task completed to launch your daily streak!", color: "from-slate-400 to-slate-500" };
  };

  const badgeInfo = getStreakLevelBadge(streak.currentStreak);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* 1. Habit Streaks / Gamification Hero Panel (AF-2) */}
      <div className={`bg-gradient-to-r ${badgeInfo.color} rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md shadow-emerald-500/5`}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 relative">
            <Flame className="h-9 w-9 fill-current animate-pulse text-amber-200" />
            {streak.currentStreak > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-xs h-5.5 w-5.5 rounded-full flex items-center justify-center border border-white">
                {streak.currentStreak}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-white/70 block mb-0.5">HABIT GAMIFICATION ACTIVE</span>
            <h3 className="text-xl font-black flex items-center gap-1.5">
              <Award className="h-5 w-5 text-amber-200" />
              {badgeInfo.title}
            </h3>
            <p className="text-xs text-white/90 font-medium max-w-md mt-1">{badgeInfo.desc}</p>
          </div>
        </div>

        {/* Subtle gamification counters */}
        <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-around md:justify-start">
          <div>
            <span className="text-[10px] font-bold text-white/75 uppercase tracking-wide">Daily Streak</span>
            <p className="text-2xl font-black">{streak.currentStreak} Days</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/75 uppercase tracking-wide">Total Cleared</span>
            <p className="text-2xl font-black">{streak.totalCompletedCount} Tasks</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. "DO THIS NOW" RECOMMENDATION HERO (US-5.1) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-emerald-500" />
            AI Peak Focus Recommendation
          </h4>

          {topTask ? (
            <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-md shadow-emerald-500/5 relative overflow-hidden flex flex-col gap-4.5">
              <div className="absolute right-0 top-0 translate-y-[-20%] translate-x-[20%] opacity-[0.03] pointer-events-none">
                <Sparkles className="h-48 w-48" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  DO THIS NOW
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Estimated: {topTask.estimatedMinutes} mins
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">
                  {topTask.title}
                </h3>
                {topTask.description && (
                  <p className="text-sm text-slate-500 font-medium">
                    {topTask.description}
                  </p>
                )}
              </div>

              {/* Subtask micro-checklist preview if exists */}
              {topTask.subtasks.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Micro steps</span>
                  <div className="flex flex-col gap-1.5">
                    {topTask.subtasks.slice(0, 2).map((st) => (
                      <div key={st.id} className="flex items-center gap-2">
                        <Check className={`h-3.5 w-3.5 ${st.isCompleted ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className={`text-xs font-semibold ${st.isCompleted ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                    {topTask.subtasks.length > 2 && (
                      <span className="text-[10px] font-bold text-emerald-600 ml-5">
                        +{topTask.subtasks.length - 2} more steps. Trigger Panic mode to view breakdown!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* AI-derived calming reminder */}
              <div className="text-xs font-semibold text-slate-500 border-t border-slate-100/70 pt-3.5 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  Due soonest. Starting takes only 2 minutes — just open the first file or page to beat friction.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => onStartFocusTimer(topTask.id, topTask.estimatedMinutes)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  id="dashboard-start-focus"
                >
                  <Play className="h-4 w-4 fill-current text-emerald-400" />
                  Start Focus Block
                </button>

                <button
                  onClick={() => onCompleteTask(topTask.id)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 font-bold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  id="dashboard-complete-now"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <h4 className="text-lg font-bold text-slate-700">All caught up!</h4>
              <p className="text-sm text-slate-400 max-w-xs">
                Your priority schedule is fully cleared. Add some messy tasks or ask the voice assistant to build a plan!
              </p>
            </div>
          )}
        </div>

        {/* 3. QUICK ACTIONS GRID & HISTORIC STATS (US-5.2) */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4 text-emerald-500" />
            Quick Navigation Actions
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigateToTab('tasks')}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm text-left flex flex-col justify-between h-28 hover:shadow-md cursor-pointer group transition-all"
              id="dashboard-action-tasks"
            >
              <PlusCircle className="h-6 w-6 text-emerald-500 group-hover:scale-110 transition-transform" />
              <div>
                <h5 className="text-xs font-bold text-slate-800 block">Manage List</h5>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">{activeTasks.length} Active plans</span>
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab('panic')}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm text-left flex flex-col justify-between h-28 hover:shadow-md cursor-pointer group transition-all"
              id="dashboard-action-panic"
            >
              <Flame className="h-6 w-6 text-rose-500 group-hover:scale-110 transition-transform animate-pulse" />
              <div>
                <h5 className="text-xs font-bold text-slate-800 block">Panic Mode</h5>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Gemini prioritizing</span>
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab('plan')}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm text-left flex flex-col justify-between h-28 hover:shadow-md cursor-pointer group transition-all"
              id="dashboard-action-plan"
            >
              <Calendar className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <div>
                <h5 className="text-xs font-bold text-slate-800 block">Daily Planner</h5>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                  {currentPlan ? 'Plan Active' : 'No schedule today'}
                </span>
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab('goals')}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm text-left flex flex-col justify-between h-28 hover:shadow-md cursor-pointer group transition-all"
              id="dashboard-action-goals"
            >
              <Layers className="h-6 w-6 text-purple-500 group-hover:scale-110 transition-transform" />
              <div>
                <h5 className="text-xs font-bold text-slate-800 block">Long-Term Goals</h5>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">{goals.length} Active targets</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. PLAN PREVIEW & ANALYTICS BAR (US-5.3 & US-5.4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Today's Schedule Timeline Preview */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Today's Schedule Preview
            </h4>
            {currentPlan && (
              <button
                onClick={() => onNavigateToTab('plan')}
                className="text-xs text-emerald-600 font-extrabold hover:text-emerald-700 cursor-pointer"
                id="dashboard-view-full-plan"
              >
                View Full Timeline
              </button>
            )}
          </div>

          {currentPlan ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              {currentPlan.timeBlocks.slice(0, 3).map((block) => (
                <div key={block.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-50 bg-slate-50/45">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                      {block.startTime} – {block.endTime}
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                      {block.taskTitle}
                    </h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    block.type === 'focus' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {block.type}
                  </span>
                </div>
              ))}
              {currentPlan.timeBlocks.length > 3 && (
                <p className="text-[11px] font-bold text-slate-400 text-center mt-1">
                  +{currentPlan.timeBlocks.length - 3} more schedule blocks planned for today.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-xs sm:text-sm text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center gap-2">
              <span>No schedule generated today.</span>
              <button
                onClick={() => onNavigateToTab('plan')}
                className="text-xs text-emerald-600 font-extrabold hover:underline"
                id="dashboard-generate-plan-shortcut"
              >
                Generate schedule plan
              </button>
            </div>
          )}
        </div>

        {/* Real Productivity Analytics Stats Panel */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Productivity Analytics
          </h4>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4.5">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Completed Rate</span>
                <span className="text-xl font-black text-slate-800">{taskCompletionRate}%</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-sm">
                ✓
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">On-Time Completion</span>
                <span className="text-xl font-black text-slate-800">{onTimeRate}%</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                ⚡
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
