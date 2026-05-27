/**
 * Canonical event envelope for the IAG platform event bus.
 * Domain payloads live in separate schema modules as services are built.
 */

export const EVENT_SPEC_VERSION = "1.0" as const;

export type EventSource =
  | "iag.erp"
  | "iag.users"
  | "iag.inventory"
  | "iag.warehouse"
  | "iag.notifications"
  | "iag.authentication"
  | "iag.pos"
  | "iag.fleet"
  | "iag.federation"
  | string;

export interface PlatformEvent<TPayload = Record<string, unknown>> {
  /** CloudEvents-compatible id */
  id: string;
  /** e.g. sale.completed, po.approved */
  type: string;
  /** ISO-8601 */
  time: string;
  /** Emitting service identifier */
  source: EventSource;
  /** Schema version for this event type */
  specversion: typeof EVENT_SPEC_VERSION;
  /** Optional correlation for tracing a business transaction */
  correlationId?: string;
  /** Optional causation link to upstream event */
  causationId?: string;
  data: TPayload;
}

export interface EventMetadata {
  topic: string;
  partition?: number;
  offset?: string;
  key?: string;
}

export function createEvent<TPayload>(
  input: Omit<PlatformEvent<TPayload>, "specversion" | "time"> & {
    time?: string;
  },
): PlatformEvent<TPayload> {
  return {
    ...input,
    specversion: EVENT_SPEC_VERSION,
    time: input.time ?? new Date().toISOString(),
  };
}

/** Topic naming: iag.<domain>.<aggregate> */
export const topics = {
  platform: "iag.platform",
  sales: "iag.sales",
  inventory: "iag.inventory",
  finance: "iag.finance",
  manufacturing: "iag.manufacturing",
  notifications: "iag.notifications",
  fleet: "iag.fleet",
  commercial: "iag.commercial",
} as const;

/** Project management domain events (publishers: iag-project-management). */
export const pmEventTypes = {
  requisitionSubmitted: "pm.requisition.submitted",
  taskAssigned: "pm.task.assigned",
  mentionCreated: "pm.mention.created",
} as const;

/** Procurement consumers on iag.commercial. */
export const procurementEventTypes = {
  pmRequisitionSubmitted: pmEventTypes.requisitionSubmitted,
} as const;

/** Contract management domain events (publishers: iag-contract-management). */
export const contractsEventTypes = {
  contractCreated: "contracts.contract.created",
  contractUpdated: "contracts.contract.updated",
  contractDeleted: "contracts.contract.deleted",
  contractStatusChanged: "contracts.contract.status_changed",
  assistanceRequested: "contracts.assistance.requested",
  milestoneDueSoon: "contracts.milestone.due_soon",
  alertRaised: "contracts.alert.raised",
} as const;

/** Fleet domain events (publishers: iag-fleet). */
export const fleetEventTypes = {
  vehicleStatusChanged: "fleet.vehicle.status_changed",
  jmpCompleted: "fleet.jmp.completed",
  cargoStageAdvanced: "fleet.cargo.stage_advanced",
  telemetryRefuelDetected: "fleet.telemetry.refuel_detected",
  telemetryFuelAnomaly: "fleet.telemetry.fuel_anomaly",
  complianceExpiring: "fleet.compliance.expiring",
  fuelRecorded: "fleet.fuel.recorded",
} as const;

/** Finance events consumed by iag-finance on iag.finance. */
export const financeEventTypes = {
  saleCompleted: "sale.completed",
  invoicePosted: "invoice.posted",
  fleetFuelRecorded: "fleet.fuel.recorded",
} as const;

/** Starter catalog — extend per service as APIs are implemented */
export const eventTypes = {
  notificationRequested: "notification.requested",
  notificationDelivered: "notification.delivered",
  notificationFailed: "notification.failed",
  userProvisioned: "user.provisioned",
  reportScheduled: "report.scheduled",
} as const;

/** Payload for notification.requested on iag.notifications (publish from any domain service). */
export interface NotificationRequestedPayload {
  channel: "sms" | "email" | "push" | "in_app";
  recipient: string;
  templateId: string;
  variables?: Record<string, string>;
}

export function createNotificationRequestedEvent(
  source: EventSource,
  payload: NotificationRequestedPayload,
  options?: { correlationId?: string; causationId?: string; id?: string },
): PlatformEvent<NotificationRequestedPayload> {
  return createEvent({
    id: options?.id,
    type: eventTypes.notificationRequested,
    source,
    correlationId: options?.correlationId,
    causationId: options?.causationId,
    data: payload,
  });
}
