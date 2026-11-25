import { Link } from 'react-router-dom';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#18263D] bg-[#0B1320] text-[#D8D1C4]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-serif text-xl font-semibold text-[#FCFBF8]">Northbridge Capital</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#D8D1C4]/80">
              A structured digital environment for institutional financial reporting, multi-currency ledger records, and private-client account administration.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-[#D8D1C4]/75">
              <div>
                <p className="font-medium text-[#FCFBF8]">London Office</p>
                <p className="mt-1 leading-relaxed">18 St James&apos;s Square<br />London SW1Y 4JG</p>
              </div>
              <div>
                <p className="font-medium text-[#FCFBF8]">Zurich Office</p>
                <p className="mt-1 leading-relaxed">Bahnhofstrasse 42<br />8001 Zurich, Switzerland</p>
              </div>
            </div>
            <div className="mt-5">
              <a
                href="mailto:northbridgecapiital@gmail.com"
                className="inline-flex items-center border border-[#C6A46E]/50 px-3.5 py-2 text-xs font-medium text-[#FCFBF8] transition-colors hover:bg-[#B08D57] hover:text-[#0B1320]"
              >
                Email: northbridgecapiital@gmail.com
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium tracking-wider uppercase text-[#C6A46E]">Firm</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-[#FCFBF8] transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-[#FCFBF8] transition-colors">About Us</Link></li>
              <li><Link to="/services" className="hover:text-[#FCFBF8] transition-colors">Services</Link></li>
              <li><Link to="/insights" className="hover:text-[#FCFBF8] transition-colors">Market Insights</Link></li>
              <li><Link to="/contact" className="hover:text-[#FCFBF8] transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium tracking-wider uppercase text-[#C6A46E]">Client Portal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/login" className="hover:text-[#FCFBF8] transition-colors">Client Login</Link></li>
              <li><Link to="/register" className="hover:text-[#FCFBF8] transition-colors">Client Registration</Link></li>
              <li><Link to="/forgot-password" className="hover:text-[#FCFBF8] transition-colors">Forgot Password</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#FCFBF8] transition-colors">Client Dashboard</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-medium tracking-wider uppercase text-[#C6A46E]">Governance &amp; Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/risk-disclosure" className="hover:text-[#FCFBF8] transition-colors">Investment Risk Disclosure</Link></li>
              <li><Link to="/privacy" className="hover:text-[#FCFBF8] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#FCFBF8] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-[#18263D] pt-8 text-xs leading-relaxed text-[#D8D1C4]/70">
          <p>
            Important Information: All information presented on this platform is provided solely for informational and administrative client-reporting purposes. Nothing herein constitutes investment, tax, or legal advice, nor an offer or solicitation to buy or sell any financial instrument. Capital is at risk, and Northbridge Capital makes no guarantee regarding future performance or investment returns.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} Northbridge Capital. All rights reserved.</p>
            <p>London · Zurich</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
