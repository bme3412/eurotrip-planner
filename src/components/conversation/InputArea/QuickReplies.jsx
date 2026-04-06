'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * QuickReplies - Option buttons for quick responses
 */
export default function QuickReplies({
  options = [],
  allowMultiple = false,
  onSelect,
}) {
  const [selected, setSelected] = useState(new Set());

  const handleClick = (option) => {
    if (allowMultiple) {
      const newSelected = new Set(selected);
      if (newSelected.has(option.id)) {
        newSelected.delete(option.id);
      } else {
        newSelected.add(option.id);
      }
      setSelected(newSelected);
    } else {
      // Single select - immediately send
      onSelect(option);
    }
  };

  const handleConfirm = () => {
    const selectedOptions = options.filter(o => selected.has(o.id));
    onSelect(selectedOptions);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const isSelected = selected.has(option.id);

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: index * 0.05,
              }}
              onClick={() => handleClick(option)}
              className={`
                group relative px-4 py-2.5 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {option.emoji && (
                  <span className="text-lg">{option.emoji}</span>
                )}
                <div>
                  <span className="font-medium text-[15px]">{option.label}</span>
                  {option.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                  )}
                </div>
                {allowMultiple && isSelected && (
                  <Check className="w-4 h-4 text-blue-500 ml-2" />
                )}
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button for multi-select */}
      {allowMultiple && selected.size > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleConfirm}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          Continue with {selected.size} selected
        </motion.button>
      )}
    </div>
  );
}
