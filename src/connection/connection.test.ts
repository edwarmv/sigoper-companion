import { describe, expect, it } from "vitest";
import {
  chooseRecommendedAddress,
  createConnection,
  type InterfaceCandidate,
} from "./connection";

const candidates: InterfaceCandidate[] = [
  {
    id: "wifi",
    displayName: "Wi-Fi",
    kind: "wifi",
    addresses: ["192.168.1.42"],
    routeMetric: 25,
  },
  {
    id: "ethernet",
    displayName: "Ethernet",
    kind: "ethernet",
    addresses: ["10.0.0.8"],
    routeMetric: 10,
  },
  {
    id: "vpn",
    displayName: "VPN",
    kind: "vpn",
    addresses: ["10.8.0.2"],
    routeMetric: 1,
  },
  {
    id: "loopback",
    displayName: "Loopback",
    kind: "virtual",
    addresses: ["127.0.0.1"],
  },
];

describe("connection advertisement", () => {
  it("selects one deterministic eligible private address and retains alternatives", () => {
    const result = chooseRecommendedAddress(candidates);

    expect(result.recommended).toMatchObject({
      interfaceId: "ethernet",
      address: "10.0.0.8",
    });
    expect(result.alternatives).toHaveLength(1);
    expect(result.excluded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interfaceId: "vpn", address: "10.8.0.2" }),
        expect.objectContaining({
          interfaceId: "loopback",
          address: "127.0.0.1",
        }),
      ]),
    );
  });

  it("creates a tokenized HTTPS payload from the current connection facts", () => {
    const connection = createConnection("192.168.1.42", 43127, "pairing-token");

    expect(connection).toEqual({
      address: "192.168.1.42",
      port: 43127,
      payload: "https://192.168.1.42:43127/?token=pairing-token",
    });
  });

  it("never recommends non-private or special-use addresses", () => {
    const result = chooseRecommendedAddress([
      {
        id: "public",
        displayName: "Public",
        kind: "ethernet",
        addresses: ["8.8.8.8"],
      },
      {
        id: "link",
        displayName: "Link",
        kind: "wifi",
        addresses: ["169.254.1.2"],
      },
    ]);

    expect(result.recommended).toBeNull();
    expect(result.alternatives).toEqual([]);
  });
});
