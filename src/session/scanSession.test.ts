import { describe, expect, it } from "vitest";
import {
  initialScanSessionState,
  scanSessionReducer,
  sessionStatusLabel,
} from "./scanSession";

const transition = (state: typeof initialScanSessionState, ...actions: Parameters<typeof scanSessionReducer>[1][]) =>
  actions.reduce(scanSessionReducer, state);

describe("scan-session boundary", () => {
  it("starts idle and walks the phone connection lifecycle", () => {
    const state = transition(initialScanSessionState,
      { type: "startSession" },
      { type: "sessionStarted" },
      { type: "phoneOpenedConnection" },
      { type: "phonePaired" },
    );

    expect(state.status).toBe("phonePaired");
    expect(sessionStatusLabel(state.status)).toBe("Phone paired — ready to scan");
  });

  it("preserves an acknowledged raw payload while processing", () => {
    const state = transition(initialScanSessionState,
      { type: "startSession" },
      { type: "sessionStarted" },
      { type: "phonePaired" },
      { type: "receiveScan", rawPayload: "https://estigia.example/scan" },
      { type: "processingStarted" },
      { type: "phoneDisconnected" },
    );

    expect(state.status).toBe("processingPayload");
    expect(state.rawPayload).toBe("https://estigia.example/scan");
  });

  it("allows incomplete review but requires explicit acknowledgement to finish", () => {
    const incomplete = transition(initialScanSessionState,
      { type: "startSession" },
      { type: "sessionStarted" },
      { type: "phonePaired" },
      { type: "receiveScan" },
      { type: "processingStarted" },
      { type: "reviewIncomplete" },
    );

    expect(incomplete.status).toBe("reviewingIncomplete");
    expect(scanSessionReducer(incomplete, { type: "finishReview" }).status).toBe("reviewingIncomplete");
    expect(scanSessionReducer(incomplete, { type: "finishReview", acknowledgeIncomplete: true }).status).toBe("reviewFinished");
  });

  it("confirms destructive transitions and does not discard on dismissal", () => {
    const review = transition(initialScanSessionState,
      { type: "startSession" },
      { type: "sessionStarted" },
      { type: "phonePaired" },
      { type: "receiveScan", rawPayload: "payload" },
      { type: "processingStarted" },
      { type: "reviewComplete" },
    );
    const confirming = scanSessionReducer(review, { type: "requestNewSession" });

    expect(confirming.status).toBe("confirmingNewSession");
    expect(scanSessionReducer(confirming, { type: "dismissConfirmation" })).toMatchObject({
      status: "reviewingComplete",
      rawPayload: "payload",
    });
    expect(scanSessionReducer(confirming, { type: "confirmDestructiveAction" })).toEqual(initialScanSessionState);
  });

  it("keeps review and failure available when the phone disconnects", () => {
    const review = transition(initialScanSessionState,
      { type: "startSession" }, { type: "sessionStarted" }, { type: "phonePaired" },
      { type: "receiveScan", rawPayload: "payload" }, { type: "processingStarted" }, { type: "reviewComplete" },
    );
    expect(scanSessionReducer(review, { type: "phoneDisconnected" }).status).toBe("reviewingComplete");

    const failed = transition(initialScanSessionState,
      { type: "startSession" }, { type: "sessionStarted" }, { type: "phonePaired" },
      { type: "receiveScan", rawPayload: "payload" }, { type: "processingStarted" },
      { type: "processingFailed", message: "network" },
    );
    expect(scanSessionReducer(failed, { type: "phoneDisconnected" }).status).toBe("processingFailed");
  });

  it("rejects submissions unless the phone is paired and prevents replacement after review", () => {
    const idleSubmission = scanSessionReducer(initialScanSessionState, { type: "receiveScan", rawPayload: "bad" });
    expect(idleSubmission).toEqual(initialScanSessionState);

    const finished = transition(initialScanSessionState,
      { type: "startSession" },
      { type: "sessionStarted" },
      { type: "phonePaired" },
      { type: "receiveScan", rawPayload: "first" },
      { type: "processingStarted" },
      { type: "reviewComplete" },
      { type: "finishReview" },
    );
    expect(scanSessionReducer(finished, { type: "receiveScan", rawPayload: "second" })).toEqual(finished);
  });
});
