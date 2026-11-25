import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface PortalNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  isSignOut?: boolean;
  badgeCount?: number;
}

function renderGroupedNav(
  navItems: PortalNavItem[],
  activeSection: string,
  onSelect: (item: PortalNavItem) => void,
  mobile = false,
  collapsed = false
) {
  let lastGroup: string | undefined;

  return navItems.map((item, idx) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    const showGroupHeading = !collapsed && item.group && item.group !== lastGroup;
    lastGroup = item.group;
    const hasBadge = typeof item.badgeCount === 'number' && item.badgeCount > 0;

    return (
      <React.Fragment key={item.id}>
        {showGroupHeading ? (
          <p
            className={`px-3 text-[11px] font-medium tracking-[0.14em] uppercase text-[#C6A46E]/80 ${
              idx === 0 ? 'pt-1 pb-1.5' : 'pt-4 pb-1.5 border-t border-[#18263D] mt-3'
            }`}
          >
            {item.group}
          </p>
        ) : null}
        <button
          type="button"
          title={collapsed ? item.label : undefined}
          aria-label={item.label}
          onClick={() => onSelect(item)}
          className={`flex w-full items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3'
          } ${
            mobile ? 'min-h-[44px] py-2.5' : 'min-h-[40px] py-2'
          } text-sm font-medium transition-colors text-left focus-visible:outline-2 focus-visible:outline-[#B08D57] ${
            item.isSignOut
              ? 'mt-2 border-t border-[#18263D] pt-3 text-[#D8D1C4] hover:bg-[#111C2E] hover:text-[#FCFBF8]'
              : active
              ? 'bg-[#18263D] text-[#FCFBF8]'
              : 'text-[#D8D1C4] hover:bg-[#111C2E] hover:text-[#FCFBF8]'
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active && !item.isSignOut ? 'text-[#C6A46E]' : 'text-[#D8D1C4]/70'
              }`}
              aria-hidden="true"
            />
            {!collapsed ? <span className="truncate whitespace-nowrap">{item.label}</span> : null}
          </span>
          {!collapsed && hasBadge ? (
            <span className="font-mono text-[11px] font-semibold text-[#C6A46E] tabular-nums shrink-0">
              {item.badgeCount}
            </span>
          ) : null}
        </button>
      </React.Fragment>
    );
  });
}

export function PortalShell({
  title,
  subtitle,
  navItems,
  activeSection,
  onSelectSection,
  onSignOut,
  isAdminMode = false,
  collapsible = true,
  roleLabel,
  children,
}: {
  title: string;
  subtitle: string;
  navItems: PortalNavItem[];
  activeSection: string;
  onSelectSection: (id: string) => void;
  onSignOut: () => Promise<void>;
  isAdminMode?: boolean;
  collapsible?: boolean;
  roleLabel?: string | null;
  children: React.ReactNode;
}) {
  const { user, profile, isAdmin } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isCollapsedDesktop = collapsible && sidebarCollapsed;

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Client';

  function handleNavClick(item: PortalNavItem) {
    setMobileDrawerOpen(false);
    if (item.isSignOut || item.id === 'logout') {
      void onSignOut();
      return;
    }
    onSelectSection(item.id);
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B1320] text-[#D8D1C4] border-r border-[#18263D] transition-[width] duration-200 ${
          isCollapsedDesktop ? 'lg:w-20' : 'lg:w-68'
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-[#18263D] shrink-0 ${
            isCollapsedDesktop ? 'justify-center px-3' : 'justify-between px-5'
          }`}
        >
          {!isCollapsedDesktop ? (
            <Link to="/" className="font-serif text-lg font-semibold text-[#FCFBF8] whitespace-nowrap truncate">
              Northbridge Capital
            </Link>
          ) : null}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
              className="inline-flex h-9 w-9 items-center justify-center border border-[#18263D] text-[#D8D1C4] hover:border-[#C6A46E]/50 hover:text-[#FCFBF8] shrink-0"
            >
              {isCollapsedDesktop ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>

        {!isCollapsedDesktop ? (
          <div className="px-6 py-4 border-b border-[#18263D] shrink-0">
            <p className="text-xs uppercase tracking-wider text-[#C6A46E]">
              {isAdminMode ? roleLabel || 'Administrator Console' : 'Private Client Portal'}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[#FCFBF8]">{displayName}</p>
            {user?.email ? (
              <p className="truncate text-xs text-[#D8D1C4]/70">{user.email}</p>
            ) : null}
          </div>
        ) : null}

        <nav aria-label="Portal Navigation" className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto">
          {renderGroupedNav(navItems, activeSection, handleNavClick, false, isCollapsedDesktop)}
        </nav>

        <div className="border-t border-[#18263D] p-3 space-y-1.5 shrink-0">
          {isAdmin ? (
            <Link
              to={isAdminMode ? '/dashboard' : '/admin'}
              title={isAdminMode ? 'Switch to Client View' : 'Open Admin Console'}
              className={`flex w-full items-center ${
                isCollapsedDesktop ? 'justify-center px-2' : 'gap-2.5 px-3'
              } border border-[#C6A46E]/40 py-2 text-xs font-medium text-[#C6A46E] hover:bg-[#18263D] transition-colors whitespace-nowrap`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop ? (
                <span>{isAdminMode ? 'Switch to Client View' : 'Open Admin Console'}</span>
              ) : null}
            </Link>
          ) : null}

          <Link
            to="/"
            title="Public Website"
            className={`flex w-full items-center ${
              isCollapsedDesktop ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-2 text-xs font-medium text-[#D8D1C4] hover:text-[#FCFBF8] transition-colors whitespace-nowrap`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!isCollapsedDesktop ? <span>Public Website</span> : null}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`portal-main-frame flex flex-1 flex-col min-w-0 transition-[padding] duration-200 ${
          isCollapsedDesktop ? 'lg:pl-20' : 'lg:pl-68'
        }`}
      >
        {/* Top Context Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center border border-[#CBD5E1] text-[#0B1320] lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg sm:text-xl font-medium text-[#0B1320]">
                {title}
              </h1>
              <p className="hidden sm:block truncate text-xs text-[#475569]">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isAdminMode && roleLabel ? (
              <span className="hidden md:inline-block text-xs font-medium text-[#8F6F3E] whitespace-nowrap">
                {roleLabel}
              </span>
            ) : null}
            {isAdmin ? (
              <Link
                to={isAdminMode ? '/dashboard' : '/admin'}
                className="hidden sm:inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#8F6F3E]" />
                <span>{isAdminMode ? 'Client Portal' : 'Admin Console'}</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex min-h-[40px] items-center gap-1.5 border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:bg-[#F1F5F9] whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileDrawerOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#0B1320]/60"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-76 max-w-[85vw] flex-col bg-[#0B1320] text-[#D8D1C4]">
              <div className="flex h-16 items-center justify-between px-5 border-b border-[#18263D] shrink-0">
                <span className="font-serif text-lg font-semibold text-[#FCFBF8]">
                  Northbridge Capital
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="inline-flex h-11 w-11 items-center justify-center text-[#D8D1C4]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 border-b border-[#18263D] shrink-0">
                <p className="text-xs uppercase tracking-wider text-[#C6A46E]">
                  {isAdminMode ? roleLabel || 'Administrator Console' : 'Client Portal'}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-[#FCFBF8]">{displayName}</p>
                {user?.email ? (
                  <p className="truncate text-xs text-[#D8D1C4]/70">{user.email}</p>
                ) : null}
              </div>
              <nav aria-label="Mobile Portal Navigation" className="flex-1 space-y-0.5 p-3 overflow-y-auto">
                {renderGroupedNav(navItems, activeSection, handleNavClick, true, false)}
              </nav>
              <div className="border-t border-[#18263D] p-4 space-y-2 shrink-0">
                {isAdmin ? (
                  <Link
                    to={isAdminMode ? '/dashboard' : '/admin'}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex w-full min-h-[44px] items-center gap-2 border border-[#C6A46E]/40 px-3 py-2 text-xs font-medium text-[#C6A46E]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{isAdminMode ? 'Client View' : 'Admin Console'}</span>
                  </Link>
                ) : null}
                <Link
                  to="/"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs text-[#D8D1C4]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Public Website</span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 w-full mx-auto max-w-[1440px]">
          {children}
        </main>
      </div>
    </div>
  );
}
