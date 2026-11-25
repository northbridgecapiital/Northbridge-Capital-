import { useEffect, useState } from 'react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ResilientImage } from '../components/ui/StateDisplay';
import { INSIGHT_ARTICLES, type InsightArticle } from '../data/insights';
import { fetchBroadcasts } from '../lib/portalApi';
import { formatDate } from '../lib/formatters';
import { isSupabaseConfigured } from '../lib/supabase';
import type { BroadcastRecord } from '../types/database';

const CATEGORIES: Array<'All' | InsightArticle['category']> = [
  'All',
  'Fixed Income',
  'Currency & Macro',
  'Governance',
  'Liquidity',
];

export function InsightsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | InsightArticle['category']>('All');
  const [activeArticle, setActiveArticle] = useState<InsightArticle>(INSIGHT_ARTICLES[0]);
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchBroadcasts().then((res) => {
      if (res.data && res.data.length > 0) {
        setBroadcasts(res.data);
      }
    });
  }, []);

  const filteredArticles =
    selectedCategory === 'All'
      ? INSIGHT_ARTICLES
      : INSIGHT_ARTICLES.filter((a) => a.category === selectedCategory);

  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Research &amp; Briefings
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium tracking-tight text-[#111C2E] sm:text-5xl">
            Market Insights
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#3E4652]">
            Institutional commentary on fixed income, multi-currency liquidity, and governance frameworks. Published strictly for informational purposes; nothing herein constitutes investment advice or a forecast of future returns.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter research notes by category">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedCategory(category);
                    const nextList =
                      category === 'All'
                        ? INSIGHT_ARTICLES
                        : INSIGHT_ARTICLES.filter((a) => a.category === category);
                    if (nextList.length > 0 && !nextList.some((a) => a.id === activeArticle.id)) {
                      setActiveArticle(nextList[0]);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0B1320] text-[#FCFBF8]'
                      : 'border border-[#D8D1C4] bg-[#F7F5F0] text-[#3E4652] hover:border-[#0B1320] hover:text-[#0B1320]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Article List */}
          <div className="lg:col-span-5 divide-y divide-[#D8D1C4] border-y border-[#D8D1C4] self-start">
            {filteredArticles.map((article) => {
              const isSelected = activeArticle.id === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setActiveArticle(article)}
                  className={`w-full text-left py-5 px-4 transition-colors ${
                    isSelected ? 'bg-[#FCFBF8]' : 'hover:bg-[#FCFBF8]/60'
                  }`}
                >
                  <p className="text-xs text-[#8F6F3E]">
                    {article.category} · {article.publishedAt} · {article.readTime}
                  </p>
                  <p className={`mt-1.5 font-serif text-lg ${isSelected ? 'text-[#0B1320] underline underline-offset-4 decoration-[#B08D57]' : 'text-[#111C2E]'}`}>
                    {article.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#3E4652] line-clamp-2">
                    {article.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Reading Pane */}
          <article className="lg:col-span-7 border border-[#D8D1C4] bg-[#FCFBF8]">
            <div className="h-56 overflow-hidden border-b border-[#D8D1C4]">
              <ResilientImage
                src="/src/assets/images/insights_financial_facade_1795357573004.jpg"
                alt="European financial district architecture"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-8 sm:p-10">
              <p className="text-xs text-[#8F6F3E]">
                {activeArticle.category} · {activeArticle.publishedAt} · {activeArticle.readTime}
              </p>
              <h2 className="mt-3 font-serif text-2xl font-medium text-[#111C2E] sm:text-3xl">
                {activeArticle.title}
              </h2>
              <p className="mt-2 text-xs text-[#3E4652]">{activeArticle.author}</p>

              <div className="mt-6 space-y-4 border-t border-[#EAE6DD] pt-6 text-sm leading-relaxed text-[#3E4652] sm:text-base">
                {activeArticle.body.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>
        </div>

        {/* Institutional Broadcast Notices if available in Supabase */}
        {broadcasts.length > 0 ? (
          <div className="mt-16 border-t border-[#D8D1C4] pt-12">
            <h2 className="font-serif text-2xl text-[#111C2E]">Institutional Announcements</h2>
            <p className="mt-1 text-sm text-[#3E4652]">
              Informational notices published by Northbridge Capital administration.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {broadcasts.map((item) => (
                <div key={item.id} className="border border-[#D8D1C4] bg-[#FCFBF8] p-6">
                  <p className="text-xs text-[#8F6F3E]">
                    {item.category || 'Notice'} · {formatDate(item.published_at || item.created_at)}
                  </p>
                  <h3 className="mt-2 font-serif text-lg text-[#111C2E]">
                    {item.title || 'Client Notice'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
                    {item.message || item.body || item.content || ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </PublicLayout>
  );
}
