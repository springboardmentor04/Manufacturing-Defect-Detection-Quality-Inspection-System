"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled 
          ? "bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg border-slate-200 dark:border-slate-800 py-3 shadow-sm" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-500 transition-colors">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            VisionInspect<span className="text-blue-600 dark:text-blue-500">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Workflow", "Analytics", "About"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md hover:shadow-lg">
            Get Started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-slate-600 dark:text-slate-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-6 shadow-xl"
        >
          <nav className="flex flex-col gap-4">
            {["Features", "Workflow", "Analytics", "About"].map((item) => (
              <Link 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="text-lg font-medium text-slate-900 dark:text-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
            <Link href="/login" className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Login
            </Link>
            <Link href="/dashboard" className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              Get Started
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
