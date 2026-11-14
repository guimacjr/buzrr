"use client";

import clsx from "clsx";
import { setGridListToggle } from "@/state/admin/gridListSlice";
import { IoGridOutline } from "react-icons/io5";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { FaListUl } from "react-icons/fa6";

export default function GridListToggle() {
  const view = useAppSelector((state) => state.gridListToggle.view);
  const dispatch = useAppDispatch();

  const options = [
    { value: "grid", label: "Grid", icon: <IoGridOutline size={15} /> },
    { value: "list", label: "List", icon: <FaListUl size={15} /> },
  ] as const;

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex gap-1 p-1 md:p-[5px] h-fit shrink-0 rounded-[13px] bg-theme-surface dark:bg-theme-card border border-theme-primary/15 dark:border-theme-border/10"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-label={`${opt.label} view`}
          aria-pressed={view === opt.value}
          onClick={() => dispatch(setGridListToggle(opt.value))}
          className={clsx(
            "flex items-center gap-[7px] rounded-[9px] px-2.5 md:px-4 py-2 md:py-[9px] text-sm md:text-[14.5px] font-semibold cursor-pointer transition-colors",
            view === opt.value
              ? "bg-theme-primary text-theme-onPrimary dark:bg-theme-primary dark:text-theme-onPrimary"
              : "text-theme-muted dark:text-theme-muted hover:text-theme-text dark:hover:text-theme-onPrimary",
          )}
        >
          {opt.icon}
          <span className="hidden md:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
