'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <span className="relative inline-flex items-center justify-center align-middle">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 margin-0 p-0 z-10"
          onChange={handleChange}
          {...props}
        />
        <span
          className={cn(
            'pointer-events-none h-5 w-5 shrink-0 rounded border-2 ring-offset-background',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'flex items-center justify-center transition-colors',
            checked
              ? 'bg-primary border-primary'
              : 'border-gray-400 bg-white',
            className
          )}
        >
          {checked && <Check className="h-4 w-4 text-white stroke-[3]" />}
        </span>
      </span>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
