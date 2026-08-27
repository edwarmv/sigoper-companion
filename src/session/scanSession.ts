export const sessionStatuses = [
  "idle",
  "starting",
  "waitingForPhone",
  "phoneOpenedConnection",
  "phonePaired",
  "receivingScan",
  "processingPayload",
  "reviewingComplete",
  "reviewingIncomplete",
  "processingFailed",
  "phoneDisconnected",
  "reviewFinished",
  "confirmingNewSession",
] as const;

export type SessionStatus = (typeof sessionStatuses)[number];
export type ConfirmationAction = "end" | "new" | "cancel";

export type SessionConnection = {
  address: string;
  port: number;
  payload: string;
};

export type ScanSessionState = {
  status: SessionStatus;
  connection: SessionConnection | null;
  rawPayload: string | null;
  hasRecord: boolean;
  processingFailure: string | null;
  confirmation: ConfirmationAction | null;
  confirmationReturn: SessionStatus | null;
};

export type ScanSessionAction =
  | { type: "startSession" }
  | { type: "sessionStarted"; connection?: SessionConnection }
  | { type: "phoneOpenedConnection" }
  | { type: "phonePaired" }
  | { type: "receiveScan"; rawPayload?: string }
  | { type: "processingStarted" }
  | { type: "reviewComplete" }
  | { type: "reviewIncomplete" }
  | { type: "processingFailed"; message: string; recoverable?: boolean }
  | { type: "phoneDisconnected" }
  | { type: "retryProcessing" }
  | { type: "scanAgain" }
  | { type: "finishReview"; acknowledgeIncomplete?: boolean }
  | { type: "requestEndSession" }
  | { type: "requestNewSession" }
  | { type: "requestCancel" }
  | { type: "confirmDestructiveAction" }
  | { type: "dismissConfirmation" };

export const initialScanSessionState: ScanSessionState = {
  status: "idle",
  connection: null,
  rawPayload: null,
  hasRecord: false,
  processingFailure: null,
  confirmation: null,
  confirmationReturn: null,
};

const activeStatuses = new Set<SessionStatus>([
  "waitingForPhone",
  "phoneOpenedConnection",
  "phonePaired",
  "receivingScan",
  "processingPayload",
  "reviewingComplete",
  "reviewingIncomplete",
  "processingFailed",
  "phoneDisconnected",
]);

export function scanSessionReducer(
  state: ScanSessionState,
  action: ScanSessionAction,
): ScanSessionState {
  switch (action.type) {
    case "startSession":
      return state.status === "idle" || state.status === "reviewFinished"
        ? { ...initialScanSessionState, status: "starting" }
        : state;
    case "sessionStarted":
      return state.status === "starting"
        ? {
            ...state,
            status: "waitingForPhone",
            connection: action.connection ?? null,
          }
        : state;
    case "phoneOpenedConnection":
      return state.status === "waitingForPhone"
        ? { ...state, status: "phoneOpenedConnection" }
        : state;
    case "phonePaired":
      return state.status === "phoneOpenedConnection" ||
        state.status === "waitingForPhone" ||
        state.status === "phoneDisconnected"
        ? { ...state, status: "phonePaired" }
        : state;
    case "receiveScan":
      return state.status === "phonePaired"
        ? {
            ...state,
            status: "receivingScan",
            rawPayload: action.rawPayload ?? null,
          }
        : state;
    case "processingStarted":
      return state.status === "receivingScan"
        ? { ...state, status: "processingPayload" }
        : state;
    case "reviewComplete":
      return state.status === "processingPayload"
        ? {
            ...state,
            status: "reviewingComplete",
            hasRecord: true,
            processingFailure: null,
          }
        : state;
    case "reviewIncomplete":
      return state.status === "processingPayload"
        ? {
            ...state,
            status: "reviewingIncomplete",
            hasRecord: true,
            processingFailure: null,
          }
        : state;
    case "processingFailed":
      return state.status === "processingPayload" ||
        state.status === "receivingScan"
        ? {
            ...state,
            status: "processingFailed",
            processingFailure: action.message,
          }
        : state;
    case "phoneDisconnected":
      return [
        "waitingForPhone",
        "phoneOpenedConnection",
        "phonePaired",
        "receivingScan",
      ].includes(state.status)
        ? { ...state, status: "phoneDisconnected" }
        : state;
    case "retryProcessing":
      return state.status === "processingFailed" && state.rawPayload !== null
        ? { ...state, status: "processingPayload", processingFailure: null }
        : state;
    case "scanAgain":
      return state.status === "processingFailed"
        ? {
            ...state,
            status: "phonePaired",
            processingFailure: null,
            rawPayload: null,
          }
        : state;
    case "finishReview":
      return state.status === "reviewingComplete" ||
        (state.status === "reviewingIncomplete" &&
          action.acknowledgeIncomplete === true)
        ? { ...state, status: "reviewFinished" }
        : state;
    case "requestEndSession":
      return activeStatuses.has(state.status)
        ? {
            ...state,
            status: "confirmingNewSession",
            confirmation: "end",
            confirmationReturn: state.status,
          }
        : state;
    case "requestNewSession":
      return state.status === "reviewFinished" ||
        activeStatuses.has(state.status)
        ? {
            ...state,
            status: "confirmingNewSession",
            confirmation: "new",
            confirmationReturn: state.status,
          }
        : state;
    case "requestCancel":
      return state.status === "starting"
        ? initialScanSessionState
        : state.status === "processingPayload" ||
            state.status === "receivingScan"
          ? {
              ...state,
              status: "confirmingNewSession",
              confirmation: "cancel",
              confirmationReturn: state.status,
            }
          : state;
    case "confirmDestructiveAction":
      return state.status === "confirmingNewSession"
        ? initialScanSessionState
        : state;
    case "dismissConfirmation":
      return state.status === "confirmingNewSession"
        ? {
            ...state,
            status: state.confirmationReturn ?? "idle",
            confirmation: null,
            confirmationReturn: null,
          }
        : state;
    default:
      return state;
  }
}

export function sessionStatusLabel(status: SessionStatus): string {
  const labels: Record<SessionStatus, string> = {
    idle: "Idle",
    starting: "Starting session",
    waitingForPhone: "Waiting for phone",
    phoneOpenedConnection: "Phone opened connection",
    phonePaired: "Phone paired — ready to scan",
    receivingScan: "Receiving scan",
    processingPayload: "Processing payload",
    reviewingComplete: "Reviewing complete record",
    reviewingIncomplete: "Reviewing incomplete record",
    processingFailed: "Processing failed",
    phoneDisconnected: "Phone disconnected",
    reviewFinished: "Review finished",
    confirmingNewSession: "Confirming new session",
  };
  return labels[status];
}
