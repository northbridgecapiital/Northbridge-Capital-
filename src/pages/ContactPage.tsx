import { PublicLayout } from '../components/layout/PublicLayout';
import { ContactInquiryForm } from '../components/public/ContactInquiryForm';

export function ContactPage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Client Correspondence
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#111C2E] sm:text-5xl">
            Contact Northbridge Capital
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#3E4652]">
            Reach our London and Zurich private-client desks for onboarding inquiries, administrative documentation, or portal support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="border-b border-[#D8D1C4] pb-6">
              <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">United Kingdom</p>
              <h2 className="mt-2 font-serif text-2xl text-[#111C2E]">London Office</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
                18 St James&apos;s Square<br />
                London SW1Y 4JG<br />
                United Kingdom
              </p>
              <p className="mt-3 font-mono text-xs text-[#3E4652]">
                Mon–Fri · 08:30–17:30 GMT
              </p>
            </div>

            <div className="border-b border-[#D8D1C4] pb-6">
              <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">Switzerland</p>
              <h2 className="mt-2 font-serif text-2xl text-[#111C2E]">Zurich Office</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
                Bahnhofstrasse 42<br />
                8001 Zurich<br />
                Switzerland
              </p>
              <p className="mt-3 font-mono text-xs text-[#3E4652]">
                Mon–Fri · 08:30–17:30 CET
              </p>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">Client Email Desk</p>
              <p className="mt-2 font-mono text-sm text-[#111C2E]">northbridgecapiital@gmail.com</p>
              <p className="mt-2 text-sm text-[#3E4652]">
                Contact our desk directly by email or open a persistent support conversation inside the authenticated Client Portal.
              </p>
              <a
                href="mailto:northbridgecapiital@gmail.com?subject=Northbridge%20Capital%20Inquiry"
                className="mt-4 inline-flex items-center justify-center bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D]"
              >
                Email northbridgecapiital@gmail.com
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-10">
            <h2 className="font-serif text-2xl text-[#111C2E]">Send an Inquiry</h2>
            <p className="mt-2 mb-6 text-sm text-[#3E4652]">
              Please do not include passwords or sensitive account credentials in general contact correspondence.
            </p>
            <ContactInquiryForm source="contact_page" />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
