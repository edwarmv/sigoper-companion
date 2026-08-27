import type { SessionConnection } from "../session/scanSession";

export type InterfaceKind = "ethernet" | "wifi" | "vpn" | "virtual" | "other";

export type InterfaceCandidate = {
  id: string;
  displayName: string;
  kind: InterfaceKind;
  addresses: string[];
  routeMetric?: number;
  metered?: boolean;
  operational?: boolean;
};

export type AddressCandidate = {
  interfaceId: string;
  displayName: string;
  kind: InterfaceKind;
  address: string;
  routeMetric?: number;
};

export type ExcludedAddress = AddressCandidate & { reason: string };

export type AddressSelection = {
  recommended: AddressCandidate | null;
  alternatives: AddressCandidate[];
  excluded: ExcludedAddress[];
};

const privateRanges = [
  (value: number) => value >= 0x0a000000 && value <= 0x0affffff,
  (value: number) => value >= 0xac100000 && value <= 0xac1fffff,
  (value: number) => value >= 0xc0a80000 && value <= 0xc0a8ffff,
];

function ipv4Value(address: string): number | null {
  const octets = address.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d+$/.test(octet))) {
    return null;
  }
  const numbers = octets.map(Number);
  if (numbers.some((octet) => octet > 255)) return null;
  return (
    ((numbers[0] * 256 + numbers[1]) * 256 + numbers[2]) * 256 + numbers[3]
  );
}

function exclusionReason(
  candidate: InterfaceCandidate,
  address: string,
): string | null {
  const value = ipv4Value(address);
  if (value === null) return "not a valid IPv4 address";
  if (candidate.kind !== "ethernet" && candidate.kind !== "wifi") {
    return "VPN or virtual interface";
  }
  if (candidate.operational === false) return "interface is not operational";
  if (!privateRanges.some((range) => range(value)))
    return "not an RFC 1918 private address";
  return null;
}

function finiteMetric(metric: number | undefined): number {
  return metric !== undefined && Number.isFinite(metric)
    ? metric
    : Number.MAX_SAFE_INTEGER;
}

function compareCandidates(a: AddressCandidate, b: AddressCandidate): number {
  const metricA = finiteMetric(a.routeMetric);
  const metricB = finiteMetric(b.routeMetric);
  if (metricA !== metricB) return metricA - metricB;
  const kindA = a.kind === "ethernet" ? 0 : 1;
  const kindB = b.kind === "ethernet" ? 0 : 1;
  if (kindA !== kindB) return kindA - kindB;
  const left = `${a.interfaceId}\0${a.address}`;
  const right = `${b.interfaceId}\0${b.address}`;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function chooseRecommendedAddress(
  interfaces: InterfaceCandidate[],
): AddressSelection {
  const eligible: AddressCandidate[] = [];
  const excluded: ExcludedAddress[] = [];

  for (const candidate of interfaces) {
    for (const address of candidate.addresses) {
      const item = {
        interfaceId: candidate.id,
        displayName: candidate.displayName,
        kind: candidate.kind,
        address,
        routeMetric: candidate.routeMetric,
      };
      const reason = exclusionReason(candidate, address);
      if (reason) excluded.push({ ...item, reason });
      else eligible.push(item);
    }
  }

  eligible.sort(compareCandidates);
  const [recommended = null, ...alternatives] = eligible;
  return { recommended, alternatives, excluded };
}

export function createConnection(
  address: string,
  port: number,
  pairingToken: string,
): SessionConnection {
  const encodedToken = encodeURIComponent(pairingToken);
  return {
    address,
    port,
    payload: `https://${address}:${port}/?token=${encodedToken}`,
  };
}
