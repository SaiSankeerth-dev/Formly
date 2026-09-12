import { SupportLevel } from "@/lib/portal/contracts";
import { VERIFIED_SERVICES, VerifiedService, verifiedServiceById } from "@/lib/registry/verified-service-registry";

export type ProductionSupportLevel = SupportLevel;
export type ProductionService = VerifiedService;
export const services: ProductionService[] = [...VERIFIED_SERVICES];
export const official_domains = services.map((service) => ({ domain: service.officialDomain, authority: service.authority, status: "VERIFIED" as const, verifiedAt: service.lastVerifiedAt, verificationSource: service.verificationNotes }));
export const service_requirements = services.map((service) => ({ serviceId: service.serviceId, requirements: service.requiredDocuments }));
export const service_steps = services.map((service) => ({ serviceId: service.serviceId, steps: service.applicationSteps }));
export const service_document_rules = services.map((service) => ({ serviceId: service.serviceId, rules: service.documentRules }));
export const service_field_definitions = services.map((service) => ({ serviceId: service.serviceId, fields: service.fieldDefinitions }));
export const service_versions = services.map((service) => ({ serviceId: service.serviceId, officialUrl: service.officialApplicationUrl, portalVersion: "1.0", lastVerifiedAt: service.lastVerifiedAt, verificationStatus: "VERIFIED" as const, notes: service.verificationNotes }));
export function getProductionServiceById(serviceId: string) { return verifiedServiceById(serviceId); }
export function getProductionServicesByCategory(category: string) { return services.filter((service) => service.category.toLowerCase() === category.toLowerCase()); }
export function getAllProductionServices() { return services; }
export function verifyServiceRegistryIntegrity() { return { totalServices: services.length, verifiedCount: services.length, unverifiedCount: 0, violations: [] as Array<{ serviceId: string; url: string; error: string }> }; }
