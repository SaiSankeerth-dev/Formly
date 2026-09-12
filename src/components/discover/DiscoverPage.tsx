"use client";

import { FormEvent, useState, useEffect } from "react";
import { ArrowUpRight, BadgeCheck, Compass, ExternalLink, Search, ShieldCheck } from "lucide-react";

type Service = {
  serviceId: string; serviceName: string; authority: string; category: string;
  officialDomain: string; officialDomains: string[]; officialApplicationUrl: string; officialInformationUrl: string;
  eligibility: string; requiredDocuments: string[]; supportLevel: string;
  lastVerifiedAt: string; verificationNotes: string;
};

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search(event?: FormEvent, overrideQuery?: string) {
    event?.preventDefault();
    setBusy(true);
    setSearched(true);
    const q = overrideQuery !== undefined ? overrideQuery : query;
    try {
      const response = await fetch(`/api/services/discover?q=${encodeURIComponent(q)}`);
      const body = await response.json();
      setServices(body.data || []);
    } catch {
      setServices([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const initialQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
    if (initialQuery) {
      setQuery(initialQuery);
    }
    search(undefined, initialQuery);
  }, []);

  const handleApplyNow = (service: Service) => {
    try {
      const url = new URL(service.officialApplicationUrl);
      if (!service.officialDomains.includes(url.hostname)) {
        alert("Seva Saarthi cannot verify this page as an approved official service source. Assistance is paused.");
        return;
      }
    } catch {
      return;
    }
    
    document.dispatchEvent(new CustomEvent("SEVA_SAARTHI_ACTIVATE_SERVICE", {
      detail: {
        serviceId: service.serviceId,
        officialDomain: service.officialDomain,
        applicationUrl: service.officialApplicationUrl,
        supportLevel: service.supportLevel,
        authority: service.authority
      }
    }));
    
    window.open(service.officialApplicationUrl, "_blank");
  };

  return <main className="mx-auto max-w-6xl space-y-8 pb-16">
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-200"><Compass className="h-4 w-4" /> Verified service discovery</div>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">What government service do you need?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Seva Saarthi helps you find an official service and opens the authority’s real website. The official portal remains the application channel.</p>
        <form onSubmit={search} className="mt-8 flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row">
          <label className="sr-only" htmlFor="service-query">Government service needed</label>
          <div className="flex flex-1 items-center gap-3 px-3"><Search className="h-5 w-5 text-slate-400" /><input id="service-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Example: I want to update my Aadhaar address" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" /></div>
          <button disabled={busy} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">{busy ? "Searching…" : "Find official service"}</button>
        </form>
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-400 mb-3">POPULAR SERVICES</p>
          <div className="flex flex-wrap gap-2">
            {["PAN", "Aadhaar", "Voter Services", "Passport", "Driving Licence", "Income Certificate", "Caste Certificate", "Scholarships"].map(tag => (
              <button key={tag} type="button" onClick={() => { setQuery(tag); search(undefined, tag); }} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>

    <aside className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><p><strong>Citizen-controlled assistance.</strong> Seva Saarthi never receives portal passwords, OTPs, CAPTCHA answers, payment credentials, declarations, or your final submission action.</p></aside>

    {searched && <section aria-live="polite" className="space-y-4">
      <div className="flex items-baseline justify-between"><h2 className="text-xl font-bold text-slate-900">Verified service matches</h2><span className="text-sm text-slate-500">{services.length} result{services.length === 1 ? "" : "s"}</span></div>
      {services.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">No verified match is available yet. Seva Saarthi will not guess a government portal or offer an unverified link.</div> : services.map((service) => <article key={service.serviceId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"><BadgeCheck className="mr-1 inline h-3.5 w-3.5" />Official domain verified</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{service.supportLevel.replace("_", " ")}</span></div>
            <h3 className="text-xl font-bold text-slate-950">{service.serviceName}</h3>
            <p className="mt-1 text-sm text-slate-600"><strong>Authority:</strong> {service.authority} <br/> <strong>Source:</strong> {service.officialDomain}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700">{service.eligibility}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={() => handleApplyNow(service)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">APPLY NOW <ArrowUpRight className="h-4 w-4" /></button>
            <a href={service.officialInformationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Official information <ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-600"><strong>Requirements:</strong> {service.requiredDocuments.join(" ")}<br /><strong>Last verified:</strong> {service.lastVerifiedAt}. {service.verificationNotes}</div>
      </article>)}</section>}
  </main>;
}
