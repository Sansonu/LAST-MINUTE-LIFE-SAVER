import React, { useState } from 'react';
import { Settings, Clock, Flame, ShieldAlert, Check } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export default function SettingsPanel({ settings, onSaveSettings }: SettingsPanelProps) {
  const [startHour, setStartHour] = useState(settings.workingHourStart);
  const [endHour, setEndHour] = useState(settings.workingHourEnd);
  const [energyPattern, setEnergyPattern] = useState(settings.energyPattern);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      workingHourStart: startHour,
      workingHourEnd: endHour,
      energyPattern
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-xl animate-fade-in">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
        <Settings className="h-5 w-5 text-emerald-500" />
        Productivity Preferences
      </h3>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold p-3 rounded-lg mb-4 flex items-center gap-1.5 animate-bounce">
          <Check className="h-4 w-4" />
          Preferences updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Day Starts At
            </label>
            <input
              type="time"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              id="settings-start-hour"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Day Ends At
            </label>
            <input
              type="time"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              id="settings-end-hour"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-slate-400" />
            Energy Peak Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { key: 'morning', label: 'Morning Peak' },
              { key: 'afternoon', label: 'Afternoon Peak' },
              { key: 'evening', label: 'Evening Peak' },
              { key: 'flexible', label: 'Flexible / Calm' }
            ] as const).map((pattern) => (
              <button
                key={pattern.key}
                type="button"
                onClick={() => setEnergyPattern(pattern.key)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                  energyPattern === pattern.key
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                id={`settings-energy-mode-${pattern.key}`}
              >
                {pattern.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs text-slate-500 leading-relaxed font-medium flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            These settings customize how the Day Planner schedules focus sessions. Selecting a morning peak places difficult items earlier, while evening peak reserves those slots for late hours.
          </span>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          id="save-settings-button"
        >
          Update Preferences
        </button>
      </form>
    </div>
  );
}
