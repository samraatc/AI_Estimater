'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderOpen, FileText, Quote, BarChart2,
  Tag, Users, Settings, Zap, LogOut, ChevronRight, Loader2,
  Menu, X
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/projects',       label: 'Projects',    icon: FolderOpen },
  { href: '/estimations',    label: 'Estimations', icon: FileText },
  { href: '/quotations',     label: 'Quotations',  icon: Quote },
  { href: '/analytics',      label: 'Analytics',   icon: BarChart2 },
  { href: '/pricing',        label: 'Pricing',     icon: Tag },
  { href: '/admin/users',    label: 'Users',       icon: Users },
  { href: '/admin/settings', label: 'Settings',    icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path   = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-blue-600"/>
    </div>
  );

  if (!user) return null;

  const currentNav = NAV.find(item => item.href === path || (item.href !== '/dashboard' && path.startsWith(item.href)));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap size={16} className="text-white"/>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight tracking-wide">EstimateOS</p>
            <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[130px] font-medium">{user.tenantName || 'Workspace'}</p>
          </div>
        </div>
        {/* Mobile close button inside drawer */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X size={18}/>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon size={17} className="flex-shrink-0"/>
              <span className="truncate">{label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-70 flex-shrink-0"/>}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="px-3 py-2 mb-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
          <p className="text-slate-400 text-xs truncate">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm transition-all"
        >
          <LogOut size={15} className="flex-shrink-0"/>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 overflow-hidden">
      {/* ── Mobile Top Header Bar (< lg) ── */}
      <header className="lg:hidden h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-30 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={20}/>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap size={14} className="text-white"/>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {currentNav?.label || 'EstimateOS'}
              </p>
              <p className="text-slate-400 text-[10px] leading-tight truncate">
                {user.tenantName || 'EstimateOS'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-semibold text-blue-200">
            {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Desktop Permanent Sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col flex-shrink-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* ── Mobile Slide-Over Drawer (< lg) ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main Scrollable Content Area ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
