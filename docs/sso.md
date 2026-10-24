# SSO / OIDC Setup

SSO is optional. When the three required `OIDC_*` variables are set, a "Sign in with SSO" button appears on the login page alongside the username and password form. Username and password login is always kept available, so you can still get in if your identity provider is unreachable.

## 1. Register the application with your provider

Create an OAuth2/OIDC application in your identity provider (Authentik, Keycloak, Okta, or anything else standards-compliant) with:

- **Client type:** Confidential
- **Redirect URI:** `https://your-dashboard-url/api/auth/callback/oidc`
- **Scopes:** `openid`, `email`, `profile`

Note the client ID, client secret and issuer URL it gives you.

The provider must be reachable when Better Auth initializes OIDC discovery. If discovery fails and the provider is skipped, `/healthz` and `/readyz` return `503` and Docker reports the dashboard as unhealthy. Restore the provider's availability, then restart the dashboard to retry discovery. Local username and password login remains available when the OIDC provider is skipped.

### Who can sign in

The dashboard creates an account for anyone your identity provider authenticates for this application, so access is decided at the provider. Restrict the application there before turning SSO on:

- **Authentik:** open the application, then **Policy / Group / User Bindings**, and bind the group that should have access. An application with no bindings is open to every Authentik user, including self-enrolled ones.
- **Keycloak:** a client is open to every user in its realm. Override the client's browser flow with one that denies users without a given role (a **Condition - user role** step followed by **Deny access**), or keep the client in a realm that only contains your users.

Deleting a user in the dashboard does not keep them out: their next SSO sign-in creates the account again. Remove their access at the provider instead.

## 2. Set the environment variables

```env
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER_URL=https://authentik.example.com/application/o/my-app/
```

## 3. Optional: customise the button or skip the form

```env
# Change the button label (default: "Sign in with SSO")
OIDC_BUTTON_LABEL=Sign in with Authentik

# Redirect straight to your SSO provider without showing the login form
OIDC_AUTO_REDIRECT=true
```

> [!NOTE]
> `OIDC_AUTO_REDIRECT` is ignored on first launch, so the admin account can still be created with a username and password. SSO cannot create accounts until that first account exists.

> [!IMPORTANT]
> Upgrading an SSO setup from 0.3 or earlier: the redirect URI changed to `/api/auth/callback/oidc`. The old `/api/auth/oauth2/callback` route no longer exists, so update it with your provider or sign-in breaks.

The redirect URI is derived from `BETTER_AUTH_URL`. If logins bounce back with "Invalid origin", that variable is the first thing to check. See [Configuration](configuration.md).
