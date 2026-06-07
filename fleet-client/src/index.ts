/**
 * Thin HTTP client for the IAG Fleet API via the platform API gateway.
 * Auth: obtain tokens from iag-authentication (`/api/v1/authentication/oauth/token`).
 * See services/operations/fleet/docs/FRONTEND_CONTRACT.md.
 */

export interface FleetClientOptions {
  /** e.g. http://localhost:8080/api/v1/fleet/api */
  baseUrl: string;
  /** Bearer access token from iag-authentication */
  getAccessToken: () => string | Promise<string>;
  fetch?: typeof fetch;
}

/** Static vehicle registry row (camelCase JSON from Fleet API). */
export interface FleetVehicle {
  id: string;
  plate: string;
  type: string;
  make: string;
  model: string;
  year: number;
  vehicleClass: string;
  ownership: string;
  vin?: string;
  color?: string;
  seatCapacity?: number;
  transmission?: string;
  engineCapacity?: string;
  driveHand?: string;
  purchaseDate?: string;
  /** Odometer at purchase / registration (distinct from live telemetry `odo`). */
  mileage?: number;
  driverId?: string;
  status: string;
  location: string;
  lat: number;
  lng: number;
  heading: number;
  fuel: number;
  odo: number;
  capacity: string;
  cargo?: string;
  lastSeen: string;
  telematics?: string;
  fuelTracker: boolean;
  dashcam?: boolean;
  nextServiceKm: number;
  speed: number;
  engineHours?: number;
  purpose?: string;
  mechStatus: string;
  alert?: string;
  tankCapacityLitres?: number;
}

export interface FleetUserMe {
  mode: "platform";
  user: {
    id: string;
    email: string;
    isStaff: boolean;
    isSuperuser: boolean;
    groups: string[];
  };
  permissions: string[];
}

export class FleetClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: FleetClientOptions["getAccessToken"];
  private readonly fetchFn: typeof fetch;

  constructor(options: FleetClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    if (!this.fetchFn) {
      throw new Error("fetch is not available; pass options.fetch");
    }
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Authorization", `Bearer ${token}`);

    const res = await this.fetchFn(url, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new FleetApiError(res.status, text);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  /** Register notification recipient + return profile (call once after login). */
  me(): Promise<FleetUserMe> {
    return this.request<FleetUserMe>("/users/me");
  }

  listVehicles(): Promise<FleetVehicle[]> {
    return this.request<FleetVehicle[]>("/vehicles");
  }

  markNotificationSeen(id: string): Promise<void> {
    return this.request(`/notifications/${encodeURIComponent(id)}/seen`, {
      method: "POST",
    });
  }
}

export class FleetApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Fleet API ${status}: ${body}`);
    this.name = "FleetApiError";
  }
}

/** Env helper for Next.js: NEXT_PUBLIC_FLEET_API_URL */
export function fleetApiBaseFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.NEXT_PUBLIC_FLEET_API_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_FLEET_API_URL is required");
  }
  return url.replace(/\/$/, "");
}
