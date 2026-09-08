import React, { useMemo, useCallback } from 'react';
import Select from 'react-select';

const customStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--theme-bg-input, #fff)',
    borderColor: state.isFocused ? 'var(--theme-primary, #2563EB)' : 'var(--theme-border-default, #CBD5E1)',
    borderRadius: '0.75rem',
    padding: '2px 8px',
    minHeight: '42px',
    boxShadow: state.isFocused ? '0 0 0 3px var(--theme-primary-light, rgba(37,99,235,0.2))' : 'none',
    '&:hover': { borderColor: 'var(--theme-border-focus, #2563EB)' }
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? 'var(--theme-primary, #2563EB)' 
      : state.isFocused 
        ? 'var(--theme-bg-hover, #F1F5F9)' 
        : 'transparent',
    color: state.isSelected ? 'var(--theme-text-inverse, #fff)' : 'var(--theme-text-primary, #1A1A1A)',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.875rem'
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--theme-bg-card, #fff)',
    borderRadius: '0.75rem',
    border: '1px solid var(--theme-border-default, #CBD5E1)',
    boxShadow: 'var(--theme-shadow-dropdown, 0 4px 20px rgba(0,0,0,0.1))',
    zIndex: 100
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--theme-text-primary, #1A1A1A)',
    fontSize: '0.875rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--theme-text-muted, #9CA3AF)',
    fontSize: '0.875rem'
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? 'var(--theme-primary, #2563EB)' : 'var(--theme-text-muted, #9CA3AF)',
    '&:hover': { color: 'var(--theme-primary, #2563EB)' }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--theme-text-muted, #9CA3AF)',
    '&:hover': { color: '#EF4444' }
  })
};

export default function ReactSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...', 
  isSearchable = true, 
  isClearable = true,
  isDisabled = false,
  isLoading = false,
  isMulti = false,
  menuPlacement = 'auto',
  className,
  classNamePrefix = 'react-select',
  noOptionsMessage = () => 'No options available'
}) {
  
  const selectedOption = useMemo(() => {
    if (!options || !Array.isArray(options)) return null;
    if (isMulti && Array.isArray(value)) {
      return options.filter(opt => value.includes(opt.value));
    }
    return options.find(opt => opt.value === value) || null;
  }, [options, value, isMulti]);

  const handleChange = useCallback((option) => {
    if (isMulti) {
      onChange(option ? option.map(o => o.value) : []);
    } else {
      onChange(option ? option.value : null);
    }
  }, [onChange, isMulti]);

  // SSR-safe document check
  const menuPortalTarget = typeof window !== 'undefined' ? document.body : null;

  return (
    <Select
      value={selectedOption}
      onChange={handleChange}
      options={options || []}
      placeholder={placeholder}
      styles={customStyles}
      isSearchable={isSearchable}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isMulti={isMulti}
      menuPlacement={menuPlacement}
      menuPortalTarget={menuPortalTarget}
      className={className}
      classNamePrefix={classNamePrefix}
      noOptionsMessage={noOptionsMessage}
      closeMenuOnSelect={!isMulti}
      hideSelectedOptions={false}
    />
  );
}