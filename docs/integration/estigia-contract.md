# Estigia integration contract

Status: **contract recorded; production verification details blocked on Estigia integration owner**.

This document is the single source of truth for the Estigia value received from a phone. The desktop must validate a raw payload before it performs any network request. It must not infer missing production details from fixture URLs or from the hostname alone.

## Approved origin

| Property | Contract |
| --- | --- |
| Scheme | `https` only |
| Hostname | `estigia.ypfb.gob.bo` (exact, case-insensitive DNS comparison) |
| Port | Default HTTPS port only (`443` or omitted) |
| Credentials | Forbidden; user-info must be absent |
| Fragment | Forbidden |
| Path | **Unresolved prerequisite**: the exact verification path must be supplied by the Estigia integration owner |
| Query | **Unresolved prerequisite**: the complete query key/value contract and required-vs-optional keys must be supplied by the Estigia integration owner |
| Authentication | **Unresolved prerequisite**: confirm whether the verification URL is anonymous, requires a header/cookie, or uses another supported mechanism. Credentials must not be placed in a phone payload until this is explicitly approved. |

Until the path, query, and authentication rows are resolved, no production URL may be classified as accepted and no authentication behavior may be implemented by assumption. Bare tokens and non-URL payloads are unsupported.

A scanner may provide one URL-encoding layer around an otherwise absolute URL. The desktop may decode at most one layer, then applies this entire table again. It must not repeatedly decode or broaden the accepted grammar.

## Fetch policy

These are product safety bounds, not claims about Estigia server behavior:

- Request timeout: 10 seconds (including connection and body read).
- Maximum response body: 1 MiB, measured while reading; abort before retaining more.
- Redirects: at most 2 observed redirects. Each `Location` is resolved and checked against this contract before following it.
- Every final and intermediate URL must remain HTTPS, use the exact hostname, default port, and the approved verification path/query contract. Credentials and fragments remain forbidden.
- Only a successful (`2xx`) HTML response is a candidate for extraction. JSON, plain text, empty bodies, and non-HTML responses are content failures.
- Do not persist full HTML. Parsing failures are distinct from malformed input, policy rejection, redirect rejection, network/timeout failure, HTTP failure, and content failure.

If these bounds need to change after integration testing, update this document and the contract module together; do not silently loosen them in the fetcher.

## Input and error classification

| Vector | Expected outcome |
| --- | --- |
| Malformed URL | `malformed_input` before fetch |
| Bare token / relative URL | `unsupported_input` before fetch |
| HTTP, alternate hostname, credentials, fragment, non-default port | `origin_rejected` before fetch |
| Wrong path or query | `contract_rejected` before fetch; exact rule is pending prerequisite |
| Redirect outside the contract | `redirect_rejected` without following it |
| Timeout or transport error | `network_failure` |
| Non-2xx response | `http_failure` |
| Body over 1 MiB | `response_too_large` |
| Non-HTML or empty successful response | `content_failure` |
| Valid HTML with no required labels | `parse_failure` |

Errors must be machine-readable and must not echo the raw payload, token, private address, or response body.

## Production prerequisite

The following evidence is still required from an Estigia integration owner before ticket #13 can enable production fetching:

1. One current, redacted verification URL showing the exact path and query contract.
2. The authentication mechanism, including where any credential is obtained and its lifetime. No secret should be committed to this repository or embedded in a QR payload without a security review.
3. One redacted successful HTML response and one representative response for an invalid/expired verification URL.
4. Confirmation that the bounds above are compatible with the production endpoint, or an approved change to them.

The sanitized fixtures in [`fixtures/estigia`](../../fixtures/estigia) intentionally contain no production URL, credential, or copied production HTML. They exercise parser shape and policy rejection without filling this prerequisite by guesswork.

## Fixture inventory

- `fixtures/estigia/payload-vectors.json`: accepted-shape (pending configuration) and rejected vectors with expected categories.
- `fixtures/estigia/html/complete-dispatch.html`: representative sanitized labeled document.
- `fixtures/estigia/html/incomplete-dispatch.html`: representative document with missing values.
- `fixtures/estigia/html/aliases-and-entities.html`: representative formatting drift, aliases, accents, and HTML entities.
