/**
 * Versioned integration facts for Estigia URL validation and fetching.
 *
 * The path, query, and authentication fields intentionally remain unresolved
 * until the Estigia integration owner supplies production evidence. Keeping
 * them nullable prevents the validator from accepting guessed URLs.
 */
export const estigiaContract = {
 hostname: "estigia.ypfb.gob.bo",
 scheme: "https",
 defaultPort: 443,
 verificationPath: null,
 query: null,
 authentication: null,
 maxRedirects: 2,
 timeoutMs: 10_000,
 maxResponseBytes: 1_048_576,
 acceptedContentType: "text/html",
 maxEncodedLayersToDecode: 1,
} as const;

export type EstigiaFailureCode =
 | "malformed_input"
 | "unsupported_input"
 | "origin_rejected"
 | "contract_rejected"
 | "redirect_rejected"
 | "network_failure"
 | "http_failure"
 | "response_too_large"
 | "content_failure"
 | "parse_failure";

export function isProductionContractConfigured(): boolean {
 return (
  estigiaContract.verificationPath !== null &&
  estigiaContract.query !== null &&
  estigiaContract.authentication !== null
 );
}
