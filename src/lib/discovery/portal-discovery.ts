import { findVerifiedServices } from "@/lib/registry/verified-service-registry";
export function discoverGovernmentServices(query: string) { return findVerifiedServices(query).map((service) => ({ ...service, matchExplanation: "Matched only against the verified service registry; Seva Saarthi is not the application authority." })); }
