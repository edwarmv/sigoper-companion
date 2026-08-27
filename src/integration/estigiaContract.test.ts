import { describe, expect, it } from "vitest";
import {
  estigiaContract,
  isProductionContractConfigured,
} from "./estigiaContract";

describe("Estigia integration contract", () => {
  it("records the approved origin and bounded fetch policy", () => {
    expect(estigiaContract).toMatchObject({
      scheme: "https",
      hostname: "estigia.ypfb.gob.bo",
      defaultPort: 443,
      maxRedirects: 2,
      timeoutMs: 10_000,
      maxResponseBytes: 1_048_576,
      acceptedContentType: "text/html",
      maxEncodedLayersToDecode: 1,
    });
  });

  it("does not claim production readiness while integration details are unresolved", () => {
    expect(estigiaContract.verificationPath).toBeNull();
    expect(estigiaContract.query).toBeNull();
    expect(estigiaContract.authentication).toBeNull();
    expect(isProductionContractConfigured()).toBe(false);
  });
});
