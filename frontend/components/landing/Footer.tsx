"use client";

import { Eye, Code, Briefcase, MessageCircle } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2 lg:col-span-2 pr-8">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                VisionInspect<span className="text-blue-600 dark:text-blue-500">AI</span>
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Empowering manufacturers with state-of-the-art computer vision to eliminate defects, ensure quality, and accelerate production.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Briefcase className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Code className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Integrations</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Changelog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Documentation</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">API Reference</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Case Studies</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} VisionInspect AI Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
