import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/insights', label: 'Insights' },
  { to: '/risk-disclosure', label: 'Risk' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryCtaTo = user ? (isAdmin ? '/admin' : '/dashboard') : '/login';
  const primaryCtaLabel = user ? (isAdmin ? 'Admin Console' : 'Client Portal') : 'Client Login';

  const headerClasses = dark
    ? 'border-b border-[#EAE6DD]/15 bg-[#0B1320]/95 text-[#F7F5F0]'
    : 'border-b border-[#D8D1C4] bg-[#FCFBF8]/95 text-[#111C2E]';

  const linkText = dark
    ? 'text-[#D8D1C4] hover:text-[#FCFBF8]'
    : 'text-[#3E4652] hover:text-[#0B1320]';

  const activeLinkText = dark ? 'text-[#C6A46E]' : 'text-[#0B1320] underline underline-offset-8 decoration-[#B08D57]';

  const buttonClass = dark
    ? 'bg-[#B08D57] text-[#0B1320] hover:bg-[#C6A46E]'
    : 'bg-[#0B1320] text-[#FCFBF8] hover:bg-[#18263D]';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md transition-colors ${headerClasses}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="font-serif text-xl font-semibold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57]"
        >
          Northbridge Capital
        </Link>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV_LINKS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57] ${
                  isActive ? activeLinkText : linkText
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile drawer toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={primaryCtaTo}
            className={`hidden sm:inline-flex items-center justify-center px-5 py-2 text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57] ${buttonClass}`}
          >
            {primaryCtaLabel}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center md:hidden focus-visible:outline-2 focus-visible:outline-[#B08D57]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen ? (
        <div className={`border-t px-6 py-5 md:hidden ${dark ? 'border-[#EAE6DD]/15 bg-[#0B1320]' : 'border-[#EAE6DD] bg-[#FCFBF8]'}`}>
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-3">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-sm font-medium"
            >
              Home
            </Link>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="py-1.5 text-sm font-medium"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-current/15 flex flex-col gap-2.5">
              <Link
                to={primaryCtaTo}
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium ${buttonClass}`}
              >
                {primaryCtaLabel}
              </Link>
              {!user ? (
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center border border-current/25 px-4 py-2.5 text-sm font-medium"
                >
                  Open Client Account
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
