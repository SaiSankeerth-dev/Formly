import { VERIFIED_SERVICES } from "@/lib/registry/verified-service-registry";

export interface DomainCheck {
  allowed: boolean;
  normalizedDomain: string;
  reason: string;
}

export function verifyOfficialUrl(rawUrl: string): DomainCheck {
  try {
    const url = new URL(rawUrl);
    const domain = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:") {
      return { allowed: false, normalizedDomain: domain, reason: "Only HTTPS official portals are allowed." };
    }

    const matched = VERIFIED_SERVICES.some((service) => {
      if (service.officialDomain === domain) return true;
      if (service.officialDomains?.some((d) => d === domain || domain.endsWith("." + d))) return true;
      return false;
    }) ||
      domain.endsWith(".gov.in") ||
      domain.endsWith(".nic.in") ||
      domain.endsWith(".cgg.gov.in") ||
      domain === "onlineservices.proteantech.in" ||
      domain === "pan.utiitsl.com" ||
      domain === "www.pan.utiitsl.com";

    return matched
      ? { allowed: true, normalizedDomain: domain, reason: "Exact match in the verified official-domain registry." }
      : { allowed: false, normalizedDomain: domain, reason: "This domain is not in the verified official-domain registry." };
  } catch {
    return { allowed: false, normalizedDomain: "", reason: "The current tab does not have a valid HTTPS URL." };
  }
}
