import React from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function PublicLayout({
  children,
  darkHeader = false,
}: {
  children: React.ReactNode;
  darkHeader?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#111C2E]">
      <SiteHeader dark={darkHeader} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
