"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-3",
  lg: "px-6 py-4",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary disabled:bg-theme-border dark:disabled:bg-theme-border",
  outline:
    "border-2 border-theme-primary dark:border-theme-primary text-theme-primary dark:text-theme-primary bg-transparent",
  ghost: "text-theme-text dark:text-theme-text bg-transparent",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
}

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  loadingText = "Loading...",
  disabled,
  leftIcon,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      className={clsx(
        "rounded-xl font-bold transition-all duration-300 ease-in-out disabled:cursor-default",
        "inline-flex items-center justify-center gap-2",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        !isDisabled && "hover:cursor-pointer",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {leftIcon}
      {isLoading ? loadingText : children}
    </button>
  );
}

export default Button;
