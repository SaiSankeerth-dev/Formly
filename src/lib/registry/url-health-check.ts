import { VERIFIED_SERVICES } from "@/lib/registry/verified-service-registry";

export interface HealthCheckResult {
  serviceId: string;
  url: string;
  lastCheckedAt: string;
  httpStatus: number | null;
  finalUrl: string | null;
  redirectChain: string[];
  verificationStatus: "VERIFIED" | "NEEDS_REVIEW" | "UNREACHABLE";
}

export async function checkRegistryUrls(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  
  for (const service of VERIFIED_SERVICES) {
    const url = service.officialApplicationUrl;
    const result: HealthCheckResult = {
      serviceId: service.serviceId,
      url,
      lastCheckedAt: new Date().toISOString(),
      httpStatus: null,
      finalUrl: null,
      redirectChain: [],
      verificationStatus: "UNREACHABLE"
    };

    try {
      // In a real environment, we'd use a server-side fetch with redirect tracking (like node-fetch or similar)
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      result.httpStatus = res.status;
      result.finalUrl = res.url;
      // Fetch API doesn't expose the full redirect chain, but in a real node env we could track it.
      
      const expectedDomain = new URL(url).hostname;
      const actualDomain = new URL(res.url).hostname;
      
      if (res.ok && expectedDomain === actualDomain) {
        result.verificationStatus = "VERIFIED";
      } else {
        result.verificationStatus = "NEEDS_REVIEW";
      }
    } catch (e) {
      result.verificationStatus = "UNREACHABLE";
    }
    
    results.push(result);
  }
  
  return results;
}
