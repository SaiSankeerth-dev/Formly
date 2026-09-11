"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  Lock,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useSevaSaarthi } from "@/lib/store/formly-store";
import {
  STRUCTURED_GOVERNMENT_SERVICES,
  getStructuredServiceById,
} from "@/lib/knowledge/meeseva-service-registry";
import { ServiceFinderAgent } from "@/lib/agents/meeseva-agents";
import { cn } from "@/lib/utils";

const SAFE_PROFILE_FIELDS = new Set([
  "full_name",
  "date_of_birth",
  "gender",
  "phone_number",
  "email",
  "location",
  "district",
  "mandal",
  "village",
  "annual_income",
  "father_name",
  "mother_name",
  "caste_category",
  "college_name",
  "education_degree",
  "roll_number",
]);

export function MeeSevaAssistantPage() {
  const searchParams = useSearchParams();
  const { profileFields, documents } = useSevaSaarthi();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(searchParams.get("serviceId") || "pan-card-new");

  const activeService =
    getStructuredServiceById(selectedId) || STRUCTURED_GOVERNMENT_SERVICES[0];
  const results = useMemo(
    () => (query.trim() ? ServiceFinderAgent.findServices(query).matchedServices : []),
    [query]
  );
  const permittedProfile = profileFields.filter(
    (field) => SAFE_PROFILE_FIELDS.has(field.field_name) && field.value
  );
  const verifiedDomain = activeService.officialLinks.some(
    (link) => link.domain === activeService.portalDomain
  );

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-md sm:p-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-200">
            <Bot className="h-3.5 w-3.5" />
            Live official-portal assistant
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Find a real service. Continue on the official website.
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Seva Saarthi never simulates a government form or submission. It verifies the
            registered official route, opens that site, and lets the browser extension read
            the live page after you sign in.
          </p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What government service do you need?"
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {results.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/10 p-2">
              {results.slice(0, 5).map(({ service, explanation }) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedId(service.id);
                    setQuery("");
                  }}
                  className="flex w-full items-start justify-between rounded-xl p-3 text-left hover:bg-white/10"
                >
                  <span>
                    <span className="block text-sm font-bold">{service.service}</span>
                    <span className="text-xs text-slate-300">{explanation}</span>
                  </span>
                  <span className="text-xs text-blue-200">{service.portalDomain}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1", "Discover", "Choose a verified service and official URL."],
          ["2", "Assist", "The extension reads the live page and fills permitted fields."],
          ["3", "Control", "You handle login, OTP, CAPTCHA, payment, declarations, and Submit."],
        ].map(([number, title, text]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                {number}
              </span>
              <span className="text-sm font-black text-slate-900">{title}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Verified service registry
              </span>
              <h2 className="mt-1 text-xl font-black text-slate-900">{activeService.service}</h2>
              <p className="mt-1 text-xs text-slate-500">{activeService.authority}</p>
            </div>
            <Globe2 className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{activeService.description}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official domain</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {activeService.portalDomain}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Support level</div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                {activeService.supportLevel || "GUIDED"}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            Open the official site below, sign in there yourself, and then use the
            Seva Saarthi browser extension. This app does not receive portal passwords or OTPs.
          </div>
          <a
            href={verifiedDomain ? activeService.officialLinks[0]?.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!verifiedDomain}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white",
              verifiedDomain ? "bg-blue-600 hover:bg-blue-700" : "pointer-events-none bg-slate-300"
            )}
          >
            Open Official Application
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900">Data shared with the agent</h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Only non-sensitive fields already present in your profile are eligible for this
            service. The extension maps them to live labels; it does not expose your full profile.
          </p>
          <div className="space-y-2">
            {permittedProfile.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Add profile information before starting assistance.
              </div>
            ) : (
              permittedProfile.slice(0, 8).map((field) => (
                <div key={field.field_name} className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {field.field_name}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              <FileText className="h-4 w-4 text-blue-600" />
              Document vault
            </div>
            {documents.length} citizen-selected document{documents.length === 1 ? "" : "s"} available.
            File preparation and upload status are reported only from the live portal.
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800">
            <Lock className="h-3.5 w-3.5" />
            OTP, CAPTCHA, payment, declarations, and final submission stay with you.
          </div>
        </div>
      </section>
    </div>
  );
}
