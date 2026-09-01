import React from 'react';
import DatePicker from './DatePicker';

const DateRangePicker = ({
  label = 'Date Range',
  startDate,
  endDate,
  onChange,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      <DatePicker
        label={`${label} (From)`}
        value={startDate}
        onChange={(date) => onChange?.({ startDate: date, endDate })}
        maxDate={endDate || undefined}
        error={error}
        {...props}
      />
      <DatePicker
        label={`${label} (To)`}
        value={endDate}
        onChange={(date) => onChange?.({ startDate, endDate: date })}
        minDate={startDate || undefined}
        error={error}
        {...props}
      />
    </div>
  );
};

export default DateRangePicker;