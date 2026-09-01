import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  format = 'dd/MM/yyyy',
  minDate,
  maxDate,
  disabledDates = [],
  error,
  className = '',
  disabled = false,
  clearable = true,
  range = false,
  startDate,
  endDate,
  onRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selecting, setSelecting] = useState('start'); // 'start' | 'end' for range
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize view date from value
  useEffect(() => {
    if (value) setViewDate(new Date(value));
    else if (startDate) setViewDate(new Date(startDate));
  }, [value, startDate]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isDateDisabled = (date) => {
    if (minDate && date < new Date(minDate.setHours(0,0,0,0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23,59,59,999))) return true;
    return disabledDates.some(d => isSameDay(new Date(d), date));
  };

  const isInRange = (date) => {
    if (!range || !startDate || !endDate) return false;
    const d = new Date(date);
    const s = new Date(startDate);
    const e = new Date(endDate);
    return d > s && d < e;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year);
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (isDateDisabled(clickedDate)) return;

    if (range) {
      if (selecting === 'start' || (startDate && endDate)) {
        onRangeChange?.({ startDate: clickedDate, endDate: null });
        setSelecting('end');
      } else {
        if (clickedDate < new Date(startDate)) {
          onRangeChange?.({ startDate: clickedDate, endDate: null });
          setSelecting('end');
        } else {
          onRangeChange?.({ startDate, endDate: clickedDate });
          setSelecting('start');
          setIsOpen(false);
        }
      }
    } else {
      onChange?.(clickedDate);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (range) {
      onRangeChange?.({ startDate: null, endDate: null });
      setSelecting('start');
    } else {
      onChange?.(null);
    }
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-9 h-9" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isSelected = range
        ? isSameDay(currentDate, startDate) || isSameDay(currentDate, endDate)
        : isSameDay(currentDate, value);
      const isRange = isInRange(currentDate);
      const isDisabled = isDateDisabled(currentDate);
      const isToday = isSameDay(currentDate, new Date());

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isDisabled}
          className={`
            w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150
            flex items-center justify-center
            ${isDisabled
              ? 'text-theme-text-disabled cursor-not-allowed'
              : isSelected
                ? 'bg-theme-primary text-theme-text-inverse shadow-lg shadow-theme-primary/30'
                : isRange
                  ? 'bg-theme-primary-light text-theme-primary'
                  : isToday
                    ? 'border border-theme-primary text-theme-primary hover:bg-theme-primary-light'
                    : 'text-theme-text-primary hover:bg-theme-bg-hover'
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const displayValue = range
    ? (startDate && endDate)
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : startDate
        ? `${formatDate(startDate)} - ...`
        : placeholder
    : value
      ? formatDate(value)
      : placeholder;

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-theme-text-secondary mb-1.5">
          {label}
          {range && <span className="text-theme-text-muted text-xs ml-1">(Range)</span>}
        </label>
      )}

      {/* Input Display */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer
          border transition-all duration-200
          ${disabled
            ? 'bg-theme-bg-base border-theme-border-default opacity-50 cursor-not-allowed'
            : error
              ? 'bg-theme-bg-input border-theme-error focus:border-theme-error'
              : 'bg-theme-bg-input border-theme-border-default hover:border-theme-border-subtle focus:border-theme-border-focus'
          }
        `}
      >
        <CalendarIcon className={`w-4 h-4 shrink-0 ${error ? 'text-theme-error' : 'text-theme-text-muted'}`} />
        <span className={`flex-1 text-sm truncate ${value || (range && startDate) ? 'text-theme-text-primary' : 'text-theme-text-muted'}`}>
          {displayValue}
        </span>
        {(value || (range && startDate)) && clearable && !disabled && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-theme-bg-hover text-theme-text-muted hover:text-theme-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-theme-error">{error}</p>}

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute z-[100] mt-2 bg-theme-bg-card border border-theme-border-default rounded-2xl shadow-theme-modal p-4 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold text-theme-text-primary">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="w-9 h-7 flex items-center justify-center text-[10px] font-bold text-theme-text-muted uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-theme-border-default flex justify-between items-center">
            <button
              onClick={() => {
                const today = new Date();
                if (range) {
                  onRangeChange?.({ startDate: today, endDate: today });
                  setIsOpen(false);
                } else {
                  onChange?.(today);
                  setIsOpen(false);
                }
              }}
              className="text-xs text-theme-primary hover:text-theme-primary-hover font-medium transition-colors"
            >
              Today
            </button>
            {range && selecting === 'end' && (
              <span className="text-[10px] text-theme-text-muted">Select end date</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;