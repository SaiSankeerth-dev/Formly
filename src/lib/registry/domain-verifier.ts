import { verifyOfficialUrl } from "@/lib/registry/official-domain-guard";
import { VERIFIED_SERVICES } from "@/lib/registry/verified-service-registry";

export interface OfficialDomainRecord { domain: string; authority: string; jurisdiction: "CENTRAL" | "STATE"; description: string; status: "VERIFIED"; verifiedAt: string; verificationSource: string; }
export interface DomainVerificationResult { isVerified: boolean; normalizedDomain: string; reason?: string; }
export const OFFICIAL_DOMAINS: OfficialDomainRecord[] = VERIFIED_SERVICES.map(s => ({ domain: s.officialDomain, authority: s.authority, jurisdiction: s.category.includes("Telangana") || s.authority.includes("Telangana") ? "STATE" : "CENTRAL", description: s.serviceName, status: "VERIFIED", verifiedAt: s.lastVerifiedAt, verificationSource: s.verificationNotes }));
export function verifyOfficialDomain(url: string): DomainVerificationResult { const result = verifyOfficialUrl(url); return { isVerified: result.allowed, normalizedDomain: result.normalizedDomain, reason: result.reason }; }
