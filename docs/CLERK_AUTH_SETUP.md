# Clerk + Convex Auth Setup

## Mobile env

Copy [apps/mobile/.env.example](/Volumes/Storage/Projects/ironkor/apps/mobile/.env.example) to `apps/mobile/.env.local` and fill in:

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_CONVEX_SITE_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Clerk dashboard

1. Open your Clerk application.
2. Enable the Native API.
3. Enable email + password sign-up/sign-in.
4. Enable Google and Apple social connections.
5. Add native application entries for:
   - iOS development bundle ID: `com.ironkor.development`
   - iOS beta bundle ID: `com.ironkor.beta`
   - iOS production bundle ID: `com.ironkor`
   - Android development package: `com.ironkor.development`
   - Android beta package: `com.ironkor.beta`
   - Android production package: `com.ironkor`
6. In `Native applications`, add `ironkor://callback` to the `Allowlist for mobile SSO redirect` section.
7. Keep the Expo scheme `ironkor` registered for general app deep linking and mobile SSO callbacks.
8. Copy the Clerk Frontend API URL from the Convex integration screen.
9. After changing app schemes or OAuth redirect URLs, regenerate and reinstall the native app before retesting social sign-in.

## Convex env

Set these environment variables on both Convex deployments:

- `CLERK_JWT_ISSUER_DOMAIN`
  - Use the Clerk Frontend API URL from the Clerk Convex integration.
- `CLERK_SECRET_KEY`
  - Use the Clerk secret key for the same Clerk application.

The dev deployment already has:

- `CLERK_JWT_ISSUER_DOMAIN=https://enjoyed-hare-36.clerk.accounts.dev`

You still need to set:

- `CLERK_SECRET_KEY` on dev
- `CLERK_JWT_ISSUER_DOMAIN` on prod
- `CLERK_SECRET_KEY` on prod

## Convex auth expectation

`convex/auth.config.ts` expects:

- `applicationID: "convex"`
- `domain: process.env.CLERK_JWT_ISSUER_DOMAIN`

That value must match the Clerk issuer exactly or authenticated Convex requests will fail.

## Release checklist

1. Build and test sign-up on iOS and Android.
2. Build and test email verification.
3. Build and test email/password sign-in.
4. Build and test Google sign-in.
5. Build and test Apple sign-in on iOS hardware.
6. Build and test password reset.
7. Build and test sign-out.
8. Build and test account deletion after `CLERK_SECRET_KEY` is set in Convex.
