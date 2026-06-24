import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Sparkles, Check, Mic, MicOff } from 'lucide-react';
import { Task, Goal, RecurrenceRule } from '../types';

interface TaskFormProps {
  goals: Goal[];
  onSaveTask: (task: Omit<Task, 'id' | 'isCompleted' | 'subtasks'> & { subtaskTitles?: string[] }) => void;
  draftTask?: { title: string; deadline: string; estimatedMinutes: number; importance: number } | null;
  onClearDraft?: () => void;
}

export default function TaskForm({ goals, onSaveTask, draftTask, onClearDraft }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [importance, setImportance] = useState(3);
  const [goalId, setGoalId] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('none');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Pre-fill from voice assistant draft if any
  useEffect(() => {
    if (draftTask) {
      setTitle(draftTask.title);
      setDeadline(draftTask.deadline);
      setEstimatedMinutes(draftTask.estimatedMinutes);
      setImportance(draftTask.importance);
      if (onClearDraft) onClearDraft();
    }
  }, [draftTask]);

  // Set default deadline to +2 hours
  useEffect(() => {
    if (!deadline) {
      const defaultDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setDeadline(defaultDate.toISOString().slice(0, 16)); // Format YYYY-MM-DDTHH:MM
    }
  }, []);

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, subtaskInput.trim()]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!deadline) {
      setError('A target deadline is required.');
      return;
    }

    onSaveTask({
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: new Date(deadline).toISOString(),
      estimatedMinutes: Number(estimatedMinutes) || 15,
      importance,
      goalId: goalId || undefined,
      recurrence,
      subtaskTitles: subtasks
    });

    // Reset state
    setTitle('');
    setDescription('');
    setEstimatedMinutes(30);
    setImportance(3);
    setGoalId('');
    setRecurrence('none');
    setSubtasks([]);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          Add New Action Plan
        </h3>
        {draftTask && (
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full animate-pulse">
            Drafted by Voice
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Task Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">What needs to be done?</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g., Complete chemistry equations homework..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
          id="task-title-input"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes / Context (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any specific details, URLs, or study reminders..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none h-20"
          id="task-desc-input"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Deadline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Deadline Target
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            id="task-deadline-input"
          />
        </div>

        {/* Estimated Duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Time Estimate
          </label>
          <div className="relative">
            <input
              type="number"
              min="5"
              max="480"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="w-full pl-4 pr-16 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              id="task-duration-input"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">mins</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Importance */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Importance Priority</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setImportance(level)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  importance === level
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                id={`task-importance-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Recurrence (AF-10: Recurring Tasks!) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recurrence Rule</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none cursor-pointer"
            id="task-recurrence-select"
          >
            <option value="none">One-time Task</option>
            <option value="daily">Daily Auto-repeat</option>
            <option value="weekly">Weekly Auto-repeat</option>
            <option value="monthly">Monthly Auto-repeat</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Optional Link to Long-Term Goal (AF-7: Goal Tracking!) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link to Long-Term Goal</label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none cursor-pointer"
            id="task-goal-select"
          >
            <option value="">No Goal Linked</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>

        {/* Subtasks / Checklist Creator (AF-9: Subtasks!) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtasks / Checklist</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              placeholder="E.g., Open textbook..."
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              id="task-subtask-input"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              id="add-subtask-button"
            >
              Add
            </button>
          </div>
          {subtasks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {subtasks.map((st, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200"
                >
                  {st}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
        id="submit-task-button"
      >
        <Check className="h-4.5 w-4.5" />
        Save Action Plan
      </button>
    </form>
  );
}
