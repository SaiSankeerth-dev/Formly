import { StructuredGovernmentService } from "@/types/service-assistant";

/** Compatibility export for retired catalogue consumers. The production registry is in verified-service-registry. */
export const STRUCTURED_GOVERNMENT_SERVICES: StructuredGovernmentService[] = [];
export function getStructuredGovernmentService(_serviceId: string) { return undefined; }
