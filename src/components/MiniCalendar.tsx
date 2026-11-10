import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  events: { date: string; title: string }[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  themeColor?: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ events, onDateSelect, selectedDate, themeColor = 'blue' }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const hasEvent = (day: Date) => {
    return events.some(event => isSameDay(new Date(event.date), day));
  };

  return (
    <div className="bg-white/10 rounded-3xl p-4 border border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black uppercase tracking-widest text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        <div className="flex gap-1">
          <button 
            onClick={prevMonth}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[10px] font-black text-white/40 text-center uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayHasEvent = hasEvent(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={i}
              onClick={() => onDateSelect?.(day)}
              className={`
                relative h-8 w-full rounded-xl flex items-center justify-center text-[11px] font-bold transition-all
                ${!isCurrentMonth ? 'text-white/20' : 'text-white'}
                ${isSelected ? 'bg-white text-blue-600 shadow-lg' : 'hover:bg-white/10'}
                ${isToday && !isSelected ? 'border border-white/40' : ''}
              `}
            >
              {format(day, 'd')}
              {dayHasEvent && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
