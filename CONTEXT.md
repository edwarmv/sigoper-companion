# Phone Connection Context

This context defines the language used when a Windows desktop shares a local connection with a phone.

## Network connection

**Connection address**:
The private IPv4 address and shared server port that a phone uses to reach the desktop.
_Avoid_: desktop address, local UI port

**Interface candidate**:
A Windows network interface/address that may be used as the connection address.
_Avoid_: adapter (when referring to the phone-facing address)

**Recommended address**:
The single connection address selected automatically for primary presentation when multiple interface candidates are available.
_Avoid_: active IP, default IP

**Shared server**:
The desktop-side service that accepts the phone connection on the dynamically allocated shared server port.
_Avoid_: app server, UI server

## Connection diagnosis

**Firewall diagnostic**:
An explanation of whether Windows Firewall may be preventing inbound phone traffic, without changing firewall rules by itself.
_Avoid_: firewall fix, firewall error

**Connection payload**:
The QR code or copyable URL containing the current connection address and any required phone connection data.
_Avoid_: link (when precision matters), invite

## Scan session

**Scan session**:
A bounded desktop workflow for receiving and processing one Estigia scan, ending when its result is finished or the user starts a new session.
_Avoid_: reusable session, scan queue

**Paired phone**:
A phone that has completed the local pairing flow and is ready to submit one Estigia raw payload.
_Avoid_: connected phone (when the phone has only opened the web app)

**Raw payload**:
The Estigia value decoded by the phone and received by the desktop before validation and extraction.
_Avoid_: dispatch record, scan result

**Normalized dispatch record**:
The typed dispatch data extracted from Estigia and presented for review, including provenance, completeness, and warnings.
_Avoid_: scraped result, edited record

**Finish review**:
The explicit action that accepts the current review state and stops the session from accepting another scan.
_Avoid_: submit, save

**Incomplete dispatch record**:
A normalized dispatch record that can be reviewed despite one or more missing required fields, with each omission represented as a warning.
_Avoid_: partial success, failed record

**Processing failure**:
A recoverable or terminal inability to validate, fetch, or extract a raw payload, distinct from a valid incomplete dispatch record.
_Avoid_: warning, incomplete result

**Session expiry**:
The point at which a scan session's pairing credentials are no longer valid and a new session is required.
_Avoid_: disconnect, logout
