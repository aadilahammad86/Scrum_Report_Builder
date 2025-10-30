import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CustomCheckbox = ({ checked, onCheckedChange, className }) => {
  return (
    <div
      className={cn(
        'h-4 w-4 border border-primary rounded-sm flex items-center justify-center cursor-pointer',
        {
          'bg-primary': checked,
        },
        className
      )}
      onClick={(e) => { e.stopPropagation(); onCheckedChange(); }}
    >
      {checked && <Check className="h-4 w-4 text-primary-foreground" />}
    </div>
  );
};

export { CustomCheckbox };
