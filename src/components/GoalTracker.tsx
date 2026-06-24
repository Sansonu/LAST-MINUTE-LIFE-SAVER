import React, { useState } from 'react';
import { Layers, Calendar, Plus, Sparkles, CheckCircle, Target, TrendingUp, HelpCircle, Loader2 } from 'lucide-react';
import { Task, Goal } from '../types';

interface GoalTrackerProps {
  goals: Goal[];
  tasks: Task[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'isCompleted'>) => void;
  onToggleGoal: (id: string, isCompleted: boolean) => void;
  onDeleteGoal: (id: string) => void;
}

export default function GoalTracker({ goals, tasks, onAddGoal, onToggleGoal, onDeleteGoal }: GoalTrackerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [coachingText, setCoachingText] = useState('');
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateGoalProgress = (goalId: string) => {
    const linkedTasks = tasks.filter(t => t.goalId === goalId);
    if (linkedTasks.length === 0) return 0;
    const completedCount = linkedTasks.filter(t => t.isCompleted).length;
    return Math.round((completedCount / linkedTasks.length) * 100);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Goal title is required.');
      return;
    }

    onAddGoal({
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate: targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    setTitle('');
    setDescription('');
    setTargetDate('');
  };

  const handleFetchWeeklyReview = async () => {
    setIsCoachingLoading(true);
    setCoachingText('');
    try {
      const response = await fetch('/api/weekly-goal-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, tasks })
      });

      if (!response.ok) throw new Error('Failed to fetch review');
      const data = await response.json();
      setCoachingText(data.reviewText);
    } catch (err) {
      console.error(err);
      setCoachingText('Could not contact Gemini. Take a moment to reflect on your progress and write down one major achievement today!');
    } finally {
      setIsCoachingLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Goal Form */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 shadow-sm h-fit">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Target className="h-5 w-5 text-emerald-500" />
          Define Long-Term Goal
        </h3>

        {error && <span className="text-xs font-bold text-red-500">{error}</span>}

        <form onSubmit={handleSubmitGoal} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Semester Exams Grade A"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              id="goal-title-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are the main milestones or motivation?"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-16"
              id="goal-desc-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Completion Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              id="goal-date-input"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 mt-2"
            id="save-goal-button"
          >
            <Plus className="h-4 w-4" />
            Establish Goal
          </button>
        </form>
      </div>

      {/* Goal Progress Tracker List */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {/* Gemini Weekly Review Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white p-6 shadow-md shadow-emerald-500/10 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-y-10 translate-x-10">
            <Sparkles className="h-40 w-40" />
          </div>

          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-100 animate-pulse" />
                <h3 className="text-base font-extrabold tracking-tight">AI Goal Coaching Review</h3>
              </div>
              <button
                onClick={handleFetchWeeklyReview}
                disabled={isCoachingLoading}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                id="fetch-coaching-review"
              >
                {isCoachingLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reviewing progress...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trigger Weekly Coaching
                  </>
                )}
              </button>
            </div>

            {coachingText ? (
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl text-emerald-50 animate-fade-in">
                {coachingText}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
                Get a comprehensive review of your active milestones and academic performance. Gemini will cross-analyze completed vs lagging tasks, and offer two specific tactical tips.
              </p>
            )}
          </div>
        </div>

        {/* Goals Listing */}
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Your Milestone Goals
          </h4>

          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm font-semibold">
              No long-term milestones established yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {goals.map((goal) => {
                const progress = calculateGoalProgress(goal.id);
                const isCompleted = progress === 100 && goal.isCompleted;

                return (
                  <div
                    key={goal.id}
                    className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-3.5 shadow-sm"
                    id={`goal-card-${goal.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleGoal(goal.id, !goal.isCompleted)}
                          className={`mt-0.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                            goal.isCompleted
                              ? 'text-emerald-500 hover:text-emerald-600'
                              : 'text-slate-300 hover:text-emerald-500'
                          }`}
                          id={`toggle-goal-checkbox-${goal.id}`}
                        >
                          <CheckCircle className="h-5 w-5 fill-current bg-white" />
                        </button>

                        <div className="flex flex-col">
                          <span className={`text-base font-bold leading-tight ${goal.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {goal.title}
                          </span>
                          {goal.description && (
                            <p className="text-xs text-slate-500 mt-1">
                              {goal.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="text-slate-350 hover:text-red-500 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                        id={`delete-goal-${goal.id}`}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Progress Bar (AF-7) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Task Completion Progress:</span>
                        <span className="text-emerald-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold border-t border-slate-50 pt-2.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Target Date: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                        {tasks.filter(t => t.goalId === goal.id).length} Linked Tasks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
