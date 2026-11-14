"use client";

import { useState } from "react";
import Link from "next/link";
import { LuGithub, LuMenu, LuX } from "react-icons/lu";
import ClientImage from "@/components/ClientImage";
import ThemeIconToggle from "./ThemeIconToggle";
import { GITHUB_LINK } from "./links";

const navLinks = [
  { name: "Pricing", href: "/pricing" },
  { name: "Use cases", href: "/use-cases" },
  { name: "Alternatives", href: "/alternatives" },
  { name: "Docs", href: "/docs" },
];

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-theme-background/90 dark:bg-theme-background/90 backdrop-blur border-b border-theme-card dark:border-theme-card">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <Link href="/" aria-label="Buzrr home">
          <ClientImage
            props={{
              src: "/images/logo.svg",
              darksrc: "/images/logo-dark.svg",
              alt: "Buzrr Logo",
              width: 72,
              height: 72,
            }}
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-theme-text dark:text-theme-muted hover:text-theme-primary dark:hover:text-theme-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <a
            href={GITHUB_LINK}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-theme-text dark:text-theme-muted hover:text-theme-primary dark:hover:text-theme-primary transition-colors"
          >
            <LuGithub size={16} />
            GitHub
          </a>
          <ThemeIconToggle />
        </div>

        <div className="flex md:hidden items-center gap-3">
          <ThemeIconToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center size-9 rounded-lg text-theme-text dark:text-theme-text"
          >
            {open ? <LuX size={22} /> : <LuMenu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-theme-card dark:border-theme-card bg-theme-background dark:bg-theme-background px-4 pb-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-theme-text dark:text-theme-muted border-b border-theme-card dark:border-theme-card"
            >
              {link.name}
            </Link>
          ))}
          <a
            href={GITHUB_LINK}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 py-3 text-sm font-medium text-theme-text dark:text-theme-muted"
          >
            <LuGithub size={16} />
            GitHub
          </a>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
