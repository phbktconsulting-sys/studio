'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from 'date-fns';

interface CustomCalendarProps {
  value?: Date;
  onChange: (date: Date) => void;
}

export function CustomCalendar({ value, onChange }: CustomCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 81 }, (_, i) => 1950 + i);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef]);

  const renderDaysGrid = () => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstDayIndex = startOfMonth(viewDate).getDay();
    const totalDays = getDaysInMonth(viewDate);

    const days = [];
    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="cursor-default"></div>);
    }
    // Day cells
    for (let i = 1; i <= totalDays; i++) {
      const dayDate = new Date(year, month, i);
      const isSelected = value && value.toDateString() === dayDate.toDateString();
      const isToday = new Date().toDateString() === dayDate.toDateString();

      let classes = 'h-9 w-9 flex items-center justify-center cursor-pointer rounded-full text-sm my-0.5';
      if (isSelected) {
        classes += ' bg-primary text-primary-foreground';
      } else if (isToday) {
        classes += ' border border-primary text-primary font-bold';
      } else {
        classes += ' hover:bg-muted';
      }

      days.push(
        <div key={i} className={classes} onClick={() => handleDateSelect(dayDate)}>
          {i}
        </div>
      );
    }
    return days;
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleMonthChange = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
  };
  
  const handleYearChange = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
  };

  const changeMonth = (step: number) => {
    setViewDate(prev => (step > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Wrapper */}
      <div className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          readOnly
          value={value ? format(value, 'dd/MM/yyyy') : ''}
          placeholder="Pick a date"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-80 rounded-xl bg-card p-4 shadow-lg border z-50">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1">
              <select
                value={viewDate.getMonth()}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="border-none bg-transparent text-sm font-bold cursor-pointer p-1 hover:bg-muted rounded-md"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="border-none bg-transparent text-sm font-bold cursor-pointer p-1 hover:bg-muted rounded-md"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-muted">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-muted-foreground mb-2">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 text-center">
            {renderDaysGrid()}
          </div>
        </div>
      )}
    </div>
  );
}
