import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  isPassword?: boolean;
  variant?: 'default' | 'centered';
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, label, error, icon, rightIcon, isPassword, variant = 'default', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1.5 sm:space-y-2">
        {label && (
          <label className="block text-[11px] sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-150">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={actualType}
            autoComplete={isPassword ? "new-password" : props.autoComplete}
            className={cn(
              "relative w-full rounded-lg sm:rounded-xl",
              "h-11 sm:h-14 px-3 sm:px-4",
              icon && "pl-10 sm:pl-12",
              (rightIcon || isPassword) && "pr-10 sm:pr-12",
              "bg-slate-800/80",
              "border-2 border-slate-700/80",
              "focus:border-blue-500/70 focus:ring-0 focus:outline-none focus:transition-colors focus:duration-150",
              "text-white text-base sm:text-lg placeholder:text-slate-500",
              variant === 'centered' && "text-center font-mono tracking-widest text-lg sm:text-xl",
              error && "border-red-500/50 focus:border-red-500/70",
              className
            )}
            {...props}
          />


            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            )}
            {rightIcon && !isPassword && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {rightIcon}
              </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-400 font-medium">{error}</p>
        )}

      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
