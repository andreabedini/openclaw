// Gateway bind URL helpers compute listener URLs from host and port settings.
import net from "node:net";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";

export type GatewayBindUrlResult =
  | {
      url: string;
      source: "gateway.bind=custom" | "gateway.bind=tailnet" | "gateway.bind=lan";
    }
  | {
      error: string;
    }
  | null;

/** Resolves the externally advertised gateway URL for non-loopback bind modes. */
export function resolveGatewayBindUrl(params: {
  bind?: string;
  customBindHost?: string;
  scheme: "ws" | "wss";
  port: number;
  pickTailnetHost: () => string | null;
  pickLanHost: () => string | null;
}): GatewayBindUrlResult {
  const formatHostForUrl = (host: string) =>
    net.isIP(host) === 6 && !host.startsWith("[") ? `[${host}]` : host;
  const bind = params.bind ?? "loopback";
  if (bind === "custom") {
    const host = normalizeOptionalString(params.customBindHost);
    if (host) {
      return {
        url: `${params.scheme}://${formatHostForUrl(host)}:${params.port}`,
        source: "gateway.bind=custom",
      };
    }
    return { error: "gateway.bind=custom requires gateway.customBindHost." };
  }

  if (bind === "tailnet") {
    const host = params.pickTailnetHost();
    if (host) {
      return {
        url: `${params.scheme}://${formatHostForUrl(host)}:${params.port}`,
        source: "gateway.bind=tailnet",
      };
    }
    return { error: "gateway.bind=tailnet set, but no tailnet IP was found." };
  }

  if (bind === "lan") {
    const host = params.pickLanHost();
    if (host) {
      return {
        url: `${params.scheme}://${formatHostForUrl(host)}:${params.port}`,
        source: "gateway.bind=lan",
      };
    }
    return { error: "gateway.bind=lan set, but no private LAN IP was found." };
  }

  // Loopback/default and unknown bind values do not need an advertised non-local URL.
  return null;
}
