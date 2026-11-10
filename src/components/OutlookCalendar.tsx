import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Trash2 } from 'lucide-react';
import { Visit } from '../types';

interface OutlookCalendarProps {
  visits: Visit[];
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit?: (visit: Visit) => void;
}

const OutlookCalendar: React.FC<OutlookCalendarProps> = ({ visits, onEditVisit, onDeleteVisit }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  const getVisitsForDayAndHour = (day: Date, hour: number) => {
    const dayStr = day.toISOString().split('T')[0];
    return visits.filter(v => {
      const vHour = parseInt(v.time.split(':')[0]);
      return v.date === dayStr && vHour === hour;
    });
  };

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-1">
            <button onClick={prevWeek} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[800px]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-100 dark:border-slate-700 h-16"></div>
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 h-16 flex flex-col items-center justify-center ${isToday ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-lg font-black ${isToday ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}

          {/* Time Slots */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="h-20 border-b border-r border-slate-100 dark:border-slate-800 flex items-start justify-center pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </span>
              </div>
              {weekDays.map((day, i) => {
                const dayVisits = getVisitsForDayAndHour(day, hour);
                return (
                  <div key={i} className="h-20 border-b border-slate-100 dark:border-slate-800 relative group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {dayVisits.map(visit => (
                      <motion.div
                        key={visit.id}
                        layoutId={visit.id}
                        onClick={() => onEditVisit(visit)}
                        className={`absolute inset-1 rounded-xl p-2 cursor-pointer shadow-sm border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md z-20 ${
                          visit.status === 'Visited' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' :
                          visit.status === 'Postponed' ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800' :
                          visit.status === 'Cancelled' ? 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800' :
                          'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex flex-col h-full relative group/visit">
                          {onDeleteVisit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteVisit(visit);
                              }}
                              className="absolute -top-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 opacity-0 group-hover/visit:opacity-100 transition-opacity hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[9px] font-black uppercase tracking-tight truncate pr-4">{visit.targetName}</span>
                          <div className="flex items-center gap-1 mt-0.5 opacity-70">
                            <Clock className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-bold">{visit.time}</span>
                          </div>
                          <div className="mt-auto flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              visit.status === 'Visited' ? 'bg-emerald-500' :
                              visit.status === 'Postponed' ? 'bg-amber-500' :
                              visit.status === 'Cancelled' ? 'bg-rose-500' :
                              'bg-blue-500'
                            }`} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{visit.status}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OutlookCalendar;
