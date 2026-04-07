import Constants from "expo-constants";
import * as FileSystemLegacy from "expo-file-system/legacy";
import PostHog from "posthog-react-native";

type AnalyticsValue = boolean | number | string | null;
type AnalyticsProperties = Record<string, AnalyticsValue>;
type AnalyticsJsonValue =
  | boolean
  | number
  | string
  | null
  | AnalyticsJsonValue[]
  | { [key: string]: AnalyticsJsonValue };
type AnalyticsExceptionProperties = Record<string, AnalyticsJsonValue>;

interface AnalyticsUser {
  email?: string | null;
  id: string;
}

interface PostHogExtra {
  appVariant?: "beta" | "development" | "production";
  posthogHost?: string;
  posthogProjectToken?: string;
}

type PostHogLogLevel = "debug" | "error" | "info" | "warn";
type PostHogLogAttributes = Record<string, AnalyticsJsonValue | undefined>;
type ConsoleMethod = "error" | "info" | "log" | "warn";
type OtlpAnyValue =
  | { boolValue: boolean }
  | { doubleValue: number }
  | { stringValue: string };
interface OtlpAttribute {
  key: string;
  value: OtlpAnyValue;
}

const extra = (Constants.expoConfig?.extra ?? {}) as PostHogExtra;
const apiKey = extra.posthogProjectToken?.trim();
const appVariant = extra.appVariant ?? "production";
const host = extra.posthogHost?.trim();
const isPostHogConfigured = Boolean(apiKey);
const isDevelopmentVariant = appVariant === "development";
const appName = Constants.expoConfig?.name ?? "Ironkor";
const appVersion = Constants.expoConfig?.version ?? "unknown";
const otlpLogsUrl = host ? `${host.replace(/\/$/, "")}/i/v1/logs` : null;
const nativeConsole = globalThis.console;
const otlpSeverityByLevel: Record<PostHogLogLevel, number> = {
  debug: 5,
  error: 17,
  info: 9,
  warn: 13,
};
const originalConsole: Pick<Console, ConsoleMethod> = {
  error: nativeConsole.error.bind(nativeConsole),
  info: nativeConsole.info.bind(nativeConsole),
  log: nativeConsole.log.bind(nativeConsole),
  warn: nativeConsole.warn.bind(nativeConsole),
};

let consoleCaptureInstalled = false;
let currentAnalyticsDistinctId: string | null = null;

function getStorageUri(key: string) {
  if (!FileSystemLegacy.documentDirectory) {
    return null;
  }

  return `${FileSystemLegacy.documentDirectory}${key}`;
}

const posthogStorage = {
  async getItem(key: string) {
    const uri = getStorageUri(key);
    if (!uri) {
      return null;
    }

    try {
      return await FileSystemLegacy.readAsStringAsync(uri);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    const uri = getStorageUri(key);
    if (!uri) {
      return;
    }

    await FileSystemLegacy.writeAsStringAsync(uri, value);
  },
};

export const posthog = new PostHog(apiKey ?? "disabled-posthog-client", {
  ...(host ? { host } : {}),
  captureAppLifecycleEvents: true,
  customStorage: posthogStorage,
  disabled: !isPostHogConfigured,
  errorTracking: {
    autocapture: {
      console: ["error", "warn"],
      uncaughtExceptions: true,
      unhandledRejections: true,
    },
  },
  flushAt: 20,
  flushInterval: 10000,
  maxQueueSize: 1000,
  maxBatchSize: 100,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

function safeSerializeLogValue(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({
      message: value.message,
      name: value.name,
      stack: value.stack,
    });
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toOtlpValue(value: AnalyticsJsonValue): OtlpAnyValue | null {
  if (typeof value === "boolean") {
    return { boolValue: value };
  }

  if (typeof value === "number") {
    return { doubleValue: value };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (value === null) {
    return { stringValue: "null" };
  }

  return { stringValue: safeSerializeLogValue(value) };
}

function pushOtlpAttribute(
  attributes: OtlpAttribute[],
  key: string,
  value: AnalyticsJsonValue | undefined,
) {
  if (value === undefined) {
    return;
  }

  const otlpValue = toOtlpValue(value);
  if (!otlpValue) {
    return;
  }

  attributes.push({
    key,
    value: otlpValue,
  });
}

function formatConsoleArguments(args: unknown[]) {
  const formatted = args.map((value) => safeSerializeLogValue(value));
  const body = formatted.join(" ").trim() || "(empty console message)";
  const rawPayload =
    args.length > 1
      ? formatted.slice(1).join(" ").trim() || undefined
      : undefined;

  return {
    body,
    rawPayload,
  };
}

function createBaseResourceAttributes() {
  const attributes: OtlpAttribute[] = [];

  pushOtlpAttribute(attributes, "app.name", appName);
  pushOtlpAttribute(attributes, "app.version", appVersion);
  pushOtlpAttribute(attributes, "execution.environment", Constants.executionEnvironment);
  pushOtlpAttribute(attributes, "service.name", "ironkor-mobile");

  return attributes;
}

export function sendPostHogLog(
  level: PostHogLogLevel,
  message: string,
  attributes?: PostHogLogAttributes,
) {
  if (!apiKey || !otlpLogsUrl) {
    return;
  }

  const nowUnixNano = (BigInt(Date.now()) * 1_000_000n).toString();
  const logAttributes: OtlpAttribute[] = [];

  pushOtlpAttribute(logAttributes, "posthog_distinct_id", currentAnalyticsDistinctId);
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      pushOtlpAttribute(logAttributes, key, value);
    }
  }

  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: createBaseResourceAttributes(),
        },
        scopeLogs: [
          {
            scope: {
              name: "ironkor.mobile",
            },
            logRecords: [
              {
                attributes: logAttributes,
                body: {
                  stringValue: message,
                },
                observedTimeUnixNano: nowUnixNano,
                severityNumber: otlpSeverityByLevel[level],
                severityText: level.toUpperCase(),
                timeUnixNano: nowUnixNano,
              },
            ],
          },
        ],
      },
    ],
  };

  void fetch(otlpLogsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Avoid noisy recursive logging if PostHog is unavailable.
  });
}

export function installPostHogConsoleCapture() {
  if (consoleCaptureInstalled) {
    return;
  }

  consoleCaptureInstalled = true;

  const forwardConsoleCall = (
    originalMethod: (...data: unknown[]) => void,
    consoleMethod: ConsoleMethod,
    level: PostHogLogLevel,
  ) => {
    return (...args: unknown[]) => {
      originalMethod(...args);

      if (!isPostHogConfigured) {
        return;
      }

      const { body, rawPayload } = formatConsoleArguments(args);
      sendPostHogLog(level, body, {
        console_method: consoleMethod,
        console_payload: rawPayload,
        event: "console_message",
      });
    };
  };

  nativeConsole.log = forwardConsoleCall(originalConsole.log, "log", "info");
  nativeConsole.info = forwardConsoleCall(originalConsole.info, "info", "info");
  nativeConsole.warn = forwardConsoleCall(originalConsole.warn, "warn", "warn");
  nativeConsole.error = forwardConsoleCall(originalConsole.error, "error", "error");
}

export function captureAnalyticsEvent(
  event: string,
  properties?: AnalyticsProperties,
) {
  posthog.capture(event, properties);
}

export function captureAnalyticsException(
  error: unknown,
  properties?: AnalyticsExceptionProperties,
) {
  posthog.captureException(error, properties);
}

export function identifyAnalyticsUser({ email, id }: AnalyticsUser) {
  currentAnalyticsDistinctId = id;
  if (email) {
    posthog.identify(id, {
      $set: {
        email,
      },
    });
    return;
  }

  posthog.identify(id);
}

export function markAnalyticsUserAsInternalTest() {
  if (!isDevelopmentVariant) {
    return;
  }

  posthog.setPersonProperties({
    $internal_or_test_user: true,
  });
}

export function resetAnalytics() {
  currentAnalyticsDistinctId = null;
  posthog.reset();
}

export function trackAnalyticsScreen(
  pathname: string,
  properties?: AnalyticsProperties,
) {
  void posthog.screen(pathname, properties);
}
