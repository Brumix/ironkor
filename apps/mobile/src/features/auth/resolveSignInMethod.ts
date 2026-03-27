export interface AuthMethodExternalAccount {
  provider: string;
}

export interface AuthMethodUser {
  externalAccounts?: readonly AuthMethodExternalAccount[] | null;
  passwordEnabled?: boolean | null;
  verifiedExternalAccounts?: readonly AuthMethodExternalAccount[] | null;
}

export interface ResolvedSignInMethod {
  iconName:
    | "globe-outline"
    | "key-outline"
    | "logo-apple"
    | "logo-discord"
    | "logo-facebook"
    | "logo-github"
    | "logo-google"
    | "logo-instagram"
    | "logo-linkedin"
    | "logo-microsoft"
    | "logo-slack"
    | "logo-tiktok"
    | "logo-x"
    | "mail-outline"
    | "shield-checkmark-outline";
  label: string;
}

interface ResolveSignInMethodArgs {
  lastAuthenticationStrategy?: string | null;
  user?: AuthMethodUser | null;
}

const providerLabelMap: Record<string, string> = {
  apple: "Apple",
  discord: "Discord",
  facebook: "Facebook",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  huggingface: "Hugging Face",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  linkedin_oidc: "LinkedIn",
  microsoft: "Microsoft",
  slack: "Slack",
  tiktok: "TikTok",
  x: "X",
};

const providerIconMap: Record<string, ResolvedSignInMethod["iconName"]> = {
  apple: "logo-apple",
  discord: "logo-discord",
  facebook: "logo-facebook",
  github: "logo-github",
  google: "logo-google",
  instagram: "logo-instagram",
  linkedin: "logo-linkedin",
  linkedin_oidc: "logo-linkedin",
  microsoft: "logo-microsoft",
  slack: "logo-slack",
  tiktok: "logo-tiktok",
  x: "logo-x",
};

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => {
      if (part === "oidc") {
        return "";
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .filter(Boolean)
    .join(" ");
}

function normalizeProviderLabel(provider: string) {
  const normalized = provider.replace(/^custom_/, "");
  return providerLabelMap[normalized] ?? toTitleCase(normalized);
}

function resolveProvider(provider: string): ResolvedSignInMethod {
  const normalized = provider.replace(/^custom_/, "");

  return {
    iconName: providerIconMap[normalized] ?? "globe-outline",
    label: normalizeProviderLabel(normalized),
  };
}

function resolveFromStrategy(strategy: string): ResolvedSignInMethod | null {
  if (strategy === "password") {
    return {
      iconName: "key-outline",
      label: "Email + password",
    };
  }

  if (strategy === "email_code" || strategy === "email_link" || strategy.endsWith("email_code")) {
    return {
      iconName: "mail-outline",
      label: "Email",
    };
  }

  if (strategy.startsWith("oauth_")) {
    return resolveProvider(strategy.replace(/^oauth_/, ""));
  }

  return null;
}

export function resolveSignInMethod({
  lastAuthenticationStrategy,
  user,
}: ResolveSignInMethodArgs): ResolvedSignInMethod {
  if (lastAuthenticationStrategy) {
    const resolvedFromStrategy = resolveFromStrategy(lastAuthenticationStrategy);
    if (resolvedFromStrategy) {
      return resolvedFromStrategy;
    }
  }

  const externalAccount =
    user?.verifiedExternalAccounts?.[0] ??
    user?.externalAccounts?.[0];

  if (externalAccount?.provider) {
    return resolveProvider(externalAccount.provider);
  }

  if (user?.passwordEnabled) {
    return {
      iconName: "key-outline",
      label: "Email + password",
    };
  }

  return {
    iconName: "shield-checkmark-outline",
    label: "Clerk account",
  };
}
