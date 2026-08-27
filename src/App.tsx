import { useEffect, useReducer, useState, type Dispatch } from "react";
import { QRCodeSVG } from "qrcode.react";
import { invoke } from "@tauri-apps/api/core";
import {
    chooseRecommendedAddress,
    createConnection,
    type InterfaceCandidate,
} from "./connection/connection";
import {
    initialScanSessionState,
    scanSessionReducer,
    sessionStatusLabel,
    type ScanSessionAction,
} from "./session/scanSession";
import "./App.css";

function App() {
    const [state, dispatch] = useReducer(
        scanSessionReducer,
        initialScanSessionState,
    );
    const [announcement, setAnnouncement] = useState(
        sessionStatusLabel(state.status),
    );
    const [showDetails, setShowDetails] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    useEffect(() => {
        setAnnouncement(sessionStatusLabel(state.status));
    }, [state.status]);

    useEffect(() => {
        if (state.status !== "starting") return;
        const timer = window.setTimeout(() => {
            void startConnectionSession(dispatch);
        }, 500);
        return () => window.clearTimeout(timer);
    }, [state.status]);

    useEffect(() => {
        if (state.status !== "receivingScan") return;
        const timer = window.setTimeout(
            () => dispatch({ type: "processingStarted" }),
            350,
        );
        return () => window.clearTimeout(timer);
    }, [state.status]);

    useEffect(() => {
        if (state.status !== "processingPayload") return;
        const timer = window.setTimeout(
            () => dispatch({ type: "reviewComplete" }),
            700,
        );
        return () => window.clearTimeout(timer);
    }, [state.status]);

    const send = (action: ScanSessionAction) => dispatch(action);
    const isReview =
        state.status === "reviewingComplete" ||
        state.status === "reviewingIncomplete";
    const needsIncompleteAcknowledgement =
        state.status === "reviewingIncomplete";

    return (
        <main className="app-shell">
            <header className="app-header">
                <div>
                    <p className="eyebrow">SIGOPER COMPANION</p>
                    <h1>Estigia scan session</h1>
                </div>
                <span
                    className="status-chip"
                    aria-label={`Current status: ${sessionStatusLabel(state.status)}`}
                >
                    {sessionStatusLabel(state.status)}
                </span>
            </header>

            <p className="sr-only" role="status" aria-live="polite">
                {announcement}
            </p>

            {state.status === "idle" && (
                <section className="hero-card" aria-labelledby="idle-title">
                    <div className="icon-circle" aria-hidden="true">
                        ○
                    </div>
                    <p className="eyebrow">READY WHEN YOU ARE</p>
                    <h2 id="idle-title">No active phone connection</h2>
                    <p>
                        Start a scan session when you are ready to transfer one
                        Estigia dispatch from your phone.
                    </p>
                    <button
                        className="primary-button"
                        onClick={() => send({ type: "startSession" })}
                    >
                        Start session
                    </button>
                </section>
            )}

            {state.status === "starting" && (
                <ProgressCard
                    title="Starting session"
                    detail="Preparing a secure, one-scan connection…"
                    actionLabel="Cancel"
                    onAction={() => send({ type: "requestCancel" })}
                />
            )}

            {(state.status === "waitingForPhone" ||
                state.status === "phoneOpenedConnection" ||
                state.status === "phonePaired") && (
                <section
                    className="content-card"
                    aria-labelledby="connection-title"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">ONE SCAN PER SESSION</p>
                            <h2 id="connection-title">Connect a phone</h2>
                        </div>
                        <span className="step">1 of 3</span>
                    </div>
                    <div className="connection-layout">
                        {state.connection ? (
                            <div className="qr-placeholder">
                                <QRCodeSVG
                                    value={state.connection.payload}
                                    size={158}
                                    bgColor="#ffffff"
                                    fgColor="#18232d"
                                    aria-label="Scan connection QR code"
                                />
                                <small>Scan with your phone</small>
                            </div>
                        ) : (
                            <div className="qr-placeholder">
                                <small>Preparing connection…</small>
                            </div>
                        )}
                        <div className="connection-copy">
                            <p className="state-message">
                                {state.status === "waitingForPhone"
                                    ? "Waiting for your phone to open the connection."
                                    : state.status === "phoneOpenedConnection"
                                      ? "Your phone opened the connection. Complete pairing to continue."
                                      : "Phone paired — ready to scan one Estigia code."}
                            </p>
                            <p id="payload-label" className="payload-label">
                                Connection payload
                            </p>
                            <div className="copy-row">
                                <code
                                    id="payload"
                                    aria-labelledby="payload-label"
                                >
                                    {state.connection?.payload ??
                                        "Preparing current connection payload…"}
                                </code>
                                <button
                                    className="secondary-button"
                                    disabled={!state.connection}
                                    onClick={() => {
                                        if (!state.connection) return;
                                        void copyConnectionPayload(
                                            state.connection.payload,
                                        ).then((message) =>
                                            setCopyFeedback(message),
                                        );
                                    }}
                                >
                                    Copy
                                </button>
                                {copyFeedback && (
                                    <span
                                        className="copy-feedback"
                                        role="status"
                                    >
                                        {copyFeedback}
                                    </span>
                                )}
                            </div>
                            {state.status === "waitingForPhone" && (
                                <button
                                    className="secondary-button"
                                    onClick={() =>
                                        send({ type: "phoneOpenedConnection" })
                                    }
                                >
                                    Phone opened connection
                                </button>
                            )}
                            {state.status === "phoneOpenedConnection" && (
                                <button
                                    className="primary-button"
                                    onClick={() =>
                                        send({ type: "phonePaired" })
                                    }
                                >
                                    Complete pairing
                                </button>
                            )}
                            {state.status === "phonePaired" && (
                                <button
                                    className="primary-button"
                                    onClick={() =>
                                        send({
                                            type: "receiveScan",
                                            rawPayload:
                                                "Manual raw payload pending",
                                        })
                                    }
                                >
                                    Enter raw payload
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        className="details-button"
                        aria-expanded={showDetails}
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails
                            ? "Hide connection details"
                            : "Show connection details"}
                    </button>
                    {showDetails && (
                        <div className="details-panel">
                            <p>
                                <strong>Connection status:</strong>{" "}
                                {connectionReadinessLabel(
                                    state.connectionDiagnostics?.listening,
                                )}
                            </p>
                            <p>
                                <strong>Recommended address:</strong>{" "}
                                {state.connection?.address ?? "Selecting…"}
                            </p>
                            <p>
                                <strong>Shared server:</strong> HTTPS, port{" "}
                                {state.connection?.port ??
                                    "assigned at session start"}
                            </p>
                            <p>
                                <strong>Firewall diagnostic:</strong> Listening
                                readiness is separate from phone reachability.
                            </p>
                            {state.connectionDiagnostics?.alternatives
                                .length ? (
                                <p>
                                    <strong>Eligible alternatives:</strong>{" "}
                                    {state.connectionDiagnostics.alternatives
                                        .map(
                                            (candidate) =>
                                                `${candidate.displayName} (${candidate.address})`,
                                        )
                                        .join(", ")}
                                </p>
                            ) : null}
                            {state.connectionDiagnostics?.excluded.length ? (
                                <div>
                                    <strong>Excluded addresses:</strong>
                                    <ul>
                                        {state.connectionDiagnostics.excluded.map(
                                            (candidate) => (
                                                <li
                                                    key={`${candidate.interfaceId}-${candidate.address}`}
                                                >
                                                    {candidate.address} —{" "}
                                                    {candidate.reason}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    )}
                    <button
                        className="text-button"
                        onClick={() => send({ type: "requestEndSession" })}
                    >
                        End session
                    </button>
                </section>
            )}

            {state.status === "receivingScan" && (
                <ProgressCard
                    title="Receiving scan"
                    detail="The raw payload was acknowledged. Preparing processing…"
                    actionLabel="Cancel"
                    onAction={() => send({ type: "requestCancel" })}
                />
            )}
            {state.status === "processingPayload" && (
                <ProgressCard
                    title="Processing payload"
                    detail="Validating payload · fetching Estigia · preparing review"
                    actionLabel="Cancel"
                    onAction={() => send({ type: "requestCancel" })}
                />
            )}

            {state.status === "processingFailed" && (
                <section
                    className="content-card"
                    aria-labelledby="failure-title"
                >
                    <p className="eyebrow">PROCESSING FAILURE</p>
                    <h2 id="failure-title">We could not prepare a dispatch</h2>
                    <p>{state.processingFailure}</p>
                    <p className="muted">
                        Your acknowledged raw payload is preserved for retry.
                    </p>
                    <div className="action-row">
                        <button
                            className="primary-button"
                            onClick={() => send({ type: "retryProcessing" })}
                        >
                            Retry processing
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => send({ type: "scanAgain" })}
                        >
                            Scan again
                        </button>
                    </div>
                    <button
                        className="text-button"
                        onClick={() => send({ type: "requestEndSession" })}
                    >
                        End session
                    </button>
                </section>
            )}

            {isReview && (
                <section
                    className="content-card"
                    aria-labelledby="review-title"
                >
                    <p className="eyebrow">READ-ONLY REVIEW</p>
                    <h2 id="review-title">
                        {needsIncompleteAcknowledgement
                            ? "Incomplete dispatch record"
                            : "Dispatch record ready"}
                    </h2>
                    <p>
                        {needsIncompleteAcknowledgement
                            ? "Some required fields are missing. Review the warnings before finishing."
                            : "The normalized dispatch record is ready for your review."}
                    </p>
                    <dl className="record-list">
                        <div>
                            <dt>Document</dt>
                            <dd>Estigia dispatch · number pending</dd>
                        </div>
                        <div>
                            <dt>Conductor</dt>
                            <dd>Not supplied</dd>
                        </div>
                        <div>
                            <dt>Quantity</dt>
                            <dd>Not supplied</dd>
                        </div>
                    </dl>
                    {needsIncompleteAcknowledgement && (
                        <p className="warning" role="alert">
                            Warning: required fields are missing. Finish review
                            will acknowledge these omissions.
                        </p>
                    )}
                    <button
                        className="primary-button"
                        onClick={() =>
                            send({
                                type: "finishReview",
                                acknowledgeIncomplete:
                                    needsIncompleteAcknowledgement,
                            })
                        }
                    >
                        {needsIncompleteAcknowledgement
                            ? "Finish with missing fields"
                            : "Finish review"}
                    </button>
                    <button
                        className="text-button"
                        onClick={() => send({ type: "requestNewSession" })}
                    >
                        Start new session
                    </button>
                </section>
            )}

            {state.status === "phoneDisconnected" && (
                <section className="content-card">
                    <p className="eyebrow">PHONE DISCONNECTED</p>
                    <h2>Session is still available</h2>
                    <p>
                        Reconnect using the current connection payload.
                        Processing already acknowledged data will continue.
                    </p>
                    <button
                        className="primary-button"
                        onClick={() => send({ type: "phonePaired" })}
                    >
                        Reconnect phone
                    </button>
                    <button
                        className="text-button"
                        onClick={() => send({ type: "requestEndSession" })}
                    >
                        End session
                    </button>
                </section>
            )}
            {state.status === "reviewFinished" && (
                <section className="content-card">
                    <p className="eyebrow">REVIEW FINISHED</p>
                    <h2>Dispatch accepted</h2>
                    <p>
                        This scan session is closed and can no longer accept
                        another scan.
                    </p>
                    <button
                        className="primary-button"
                        onClick={() => send({ type: "startSession" })}
                    >
                        Start new session
                    </button>
                </section>
            )}
            {state.status === "confirmingNewSession" && (
                <div className="modal-backdrop">
                    <section
                        className="confirmation"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                    >
                        <p className="eyebrow">CONFIRMATION REQUIRED</p>
                        <h2 id="confirm-title">Discard this scan session?</h2>
                        <p>
                            Ending this session discards its pairing connection
                            and any uncompleted review. This cannot be undone.
                        </p>
                        <div className="action-row">
                            <button
                                className="secondary-button"
                                onClick={() =>
                                    send({ type: "dismissConfirmation" })
                                }
                            >
                                Keep session
                            </button>
                            <button
                                className="danger-button"
                                onClick={() =>
                                    send({ type: "confirmDestructiveAction" })
                                }
                            >
                                Discard and end session
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}

const interfaceCandidates: InterfaceCandidate[] = [
    {
        id: "wifi-primary",
        displayName: "Wi-Fi",
        kind: "wifi",
        addresses: ["192.168.1.42"],
        routeMetric: 25,
    },
    {
        id: "ethernet-secondary",
        displayName: "Ethernet",
        kind: "ethernet",
        addresses: ["10.0.0.8"],
        routeMetric: 40,
    },
    {
        id: "vpn",
        displayName: "Work VPN",
        kind: "vpn",
        addresses: ["10.8.0.2"],
        routeMetric: 1,
    },
];

async function startConnectionSession(
    dispatch: Dispatch<ScanSessionAction>,
): Promise<void> {
    const selection = chooseRecommendedAddress(interfaceCandidates);
    const recommended = selection.recommended;
    const diagnostics = {
        recommended: recommended
            ? {
                  interfaceId: recommended.interfaceId,
                  displayName: recommended.displayName,
                  address: recommended.address,
              }
            : null,
        alternatives: selection.alternatives.map((candidate) => ({
            interfaceId: candidate.interfaceId,
            displayName: candidate.displayName,
            address: candidate.address,
        })),
        excluded: selection.excluded,
        listening: "unavailable" as const,
    };
    if (!recommended) {
        dispatch({ type: "sessionStarted", diagnostics });
        return;
    }

    try {
        const port = await invoke<number>("start_shared_server", {
            address: recommended.address,
        });
        dispatch({
            type: "sessionStarted",
            connection: createConnection(
                recommended.address,
                port,
                window.crypto.randomUUID(),
            ),
            diagnostics: { ...diagnostics, listening: "ready" },
        });
    } catch {
        dispatch({
            type: "sessionStarted",
            diagnostics: { ...diagnostics, listening: "unknown" },
        });
    }
}

function connectionReadinessLabel(
    readiness: "ready" | "unknown" | "unavailable" | undefined,
): string {
    if (readiness === "ready") return "Shared server is listening locally";
    if (readiness === "unknown") return "Shared server readiness is unknown";
    return "No eligible connection address is available";
}

async function copyConnectionPayload(payload: string): Promise<string> {
    if (!navigator.clipboard)
        return "Clipboard unavailable — select and copy the text.";
    try {
        await navigator.clipboard.writeText(payload);
        return "Copied";
    } catch {
        return "Copy was denied — select and copy the text.";
    }
}

function ProgressCard({
    title,
    detail,
    actionLabel,
    onAction,
}: {
    title: string;
    detail: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <section className="content-card progress-card" aria-busy="true">
            <span className="spinner" aria-hidden="true" />{" "}
            <div>
                <p className="eyebrow">IN PROGRESS</p>
                <h2>{title}</h2>
                <p>{detail}</p>
                {actionLabel && onAction && (
                    <button className="text-button" onClick={onAction}>
                        {actionLabel}
                    </button>
                )}
            </div>
        </section>
    );
}

export default App;
