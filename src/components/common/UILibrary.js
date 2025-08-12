'use client';

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Search, Filter, X } from 'lucide-react';

/**
 * Unified UI component library for consistent styling across the app
 */

// Button variants
export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  ...props 
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300'
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Input field with consistent styling
export const Input = forwardRef(({ 
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  className = '',
  containerClassName = '',
  ...props 
}, ref) => {
  const inputClasses = `block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  } ${icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''} ${className}`;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
          readOnly={props.readOnly ?? (props.onChange ? false : (props.value !== undefined))}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Select dropdown
export const Select = forwardRef(({ 
  label,
  error,
  hint,
  children,
  className = '',
  containerClassName = '',
  ...props 
}, ref) => {
  const selectClasses = `block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  } ${className}`;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <select ref={ref} className={selectClasses} {...props}>
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Card component
export const Card = ({ 
  children, 
  hover = false,
  padding = 'medium',
  className = '',
  ...props 
}) => {
  const paddingClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
    none: ''
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
        hover ? 'hover:shadow-md transition-shadow duration-200' : ''
      } ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Badge component
export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  className = '' 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800'
  };

  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

// Modal component
export const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  children,
  size = 'medium',
  className = '' 
}) => {
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizes[size]} sm:w-full sm:p-6 ${className}`}>
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

// Tooltip component
export const Tooltip = ({ 
  content, 
  children, 
  position = 'top',
  show = false 
}) => {
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      {children}
      {show && (
        <div className={`absolute z-10 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg ${positions[position]}`}>
          {content}
        </div>
      )}
    </div>
  );
};

// Tabs component
export const Tabs = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: {
      container: 'border-b border-gray-200',
      tab: 'py-2 px-4 border-b-2 font-medium text-sm transition-colors',
      active: 'border-blue-500 text-blue-600',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    },
    pills: {
      container: 'flex space-x-1 bg-gray-100 p-1 rounded-lg',
      tab: 'px-4 py-2 text-sm font-medium rounded-md transition-colors',
      active: 'bg-white text-blue-600 shadow-sm',
      inactive: 'text-gray-500 hover:text-gray-700'
    }
  };

  const config = variants[variant];

  return (
    <div className={`${config.container} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`${config.tab} ${
            activeTab === tab.id ? config.active : config.inactive
          }`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// Search input with built-in functionality
export const SearchInput = ({ 
  value, 
  onChange, 
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props 
}) => (
  <div className="relative">
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      icon={<Search className="h-4 w-4" />}
      className={`pr-10 ${className}`}
      {...props}
    />
    {value && onClear && (
      <button
        onClick={onClear}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

// Filter button with active state
export const FilterButton = ({ 
  active = false, 
  children, 
  onClick,
  className = '' 
}) => (
  <Button
    variant={active ? 'primary' : 'outline'}
    size="small"
    onClick={onClick}
    icon={<Filter className="h-3 w-3" />}
    className={className}
  >
    {children}
  </Button>
);

// Collapsible section
export const Collapsible = ({ 
  title, 
  children, 
  defaultOpen = false,
  icon = null,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <span className="font-medium">{title}</span>
        </div>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="py-2">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// View mode toggle
export const ViewModeToggle = ({ 
  mode, 
  onModeChange, 
  options = [
    { value: 'grid', label: 'Grid', icon: '⊞' },
    { value: 'list', label: 'List', icon: '☰' }
  ],
  className = '' 
}) => (
  <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onModeChange(option.value)}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          mode === option.value 
            ? 'bg-white shadow text-blue-600' 
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <span className="mr-1">{option.icon}</span>
        {option.label}
      </button>
    ))}
  </div>
);

export default {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  Tooltip,
  Tabs,
  SearchInput,
  FilterButton,
  Collapsible,
  ViewModeToggle
};