import {
  isClerkAPIResponseError,
  type ClerkFieldError,
} from "@/features/auth/clerkCompat";

interface ClerkErrorBag {
  errors?: ClerkFieldError[];
  fields?: Record<string, { message?: string }>;
  globalMessage?: string;
}

interface NormalizedClerkFieldError {
  longMessage?: string;
  message?: string;
  meta?: {
    paramName?: string;
  };
}

function getErrorMeta(meta: unknown) {
  if (!meta || typeof meta !== "object" || !("paramName" in meta)) {
    return undefined;
  }

  const paramName = Reflect.get(meta, "paramName");
  if (typeof paramName !== "string") {
    return undefined;
  }

  return { paramName };
}

function normalizeClerkFieldError(item: ClerkFieldError): NormalizedClerkFieldError {
  return {
    longMessage: item.longMessage,
    message: item.message,
    meta: getErrorMeta(item.meta),
  };
}

function getErrorList(error: unknown): NormalizedClerkFieldError[] {
  if (isClerkAPIResponseError(error)) {
    return error.errors.map((item) => normalizeClerkFieldError(item));
  }

  if (!error || typeof error !== "object") {
    return [];
  }

  const maybeErrorBag = error as ClerkErrorBag;
  return Array.isArray(maybeErrorBag.errors)
    ? maybeErrorBag.errors.map((item) => normalizeClerkFieldError(item))
    : [];
}

export function getClerkFieldError(error: unknown, field: string) {
  if (error && typeof error === "object") {
    const fields = (error as ClerkErrorBag).fields;
    const directFieldMessage = fields?.[field]?.message;
    if (typeof directFieldMessage === "string" && directFieldMessage.trim().length > 0) {
      return directFieldMessage;
    }
  }

  const matchedError = getErrorList(error).find(
    (item) => item.meta?.paramName === field,
  );

  return matchedError?.longMessage ?? matchedError?.message;
}

export function getClerkGlobalError(error: unknown) {
  if (error && typeof error === "object") {
    const globalMessage = (error as ClerkErrorBag).globalMessage;
    if (typeof globalMessage === "string" && globalMessage.trim().length > 0) {
      return globalMessage;
    }
  }

  const firstError = getErrorList(error).at(0);
  if (!firstError) {
    return undefined;
  }

  return firstError.longMessage ?? firstError.message;
}

export function resolveAuthErrorMessage(error: unknown, fallback: string) {
  const globalError = getClerkGlobalError(error);
  if (globalError !== undefined) {
    return globalError;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}
