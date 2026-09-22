# SSO / OIDC Setup

SSO is optional. When the three required `OIDC_*` variables are set, a "Sign in with SSO" button appears on the login page alongside the username and password form. Username and password login is always kept available, so you can still get in if your identity provider is unreachable.

## 1. Register the application with your provider

Create an OAuth2/OIDC application in your identity provider (Authentik, Keycloak, Okta, or anything else standards-compliant) with:

- **Client type:** Confidential
- **Redirect URI:** `https://your-dashboard-url/api/auth/callback/oidc`
- **Scopes:** `openid`, `email`, `profile`

Note the client ID, client secret and issuer URL it gives you.

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
> `OIDC_AUTO_REDIRECT` is ignored on first launch, so the admin account can still be created with a username and password.

> [!IMPORTANT]
> Upgrading an SSO setup from 0.3 or earlier: the redirect URI changed to `/api/auth/callback/oidc`. The old `/api/auth/oauth2/callback` route no longer exists, so update it with your provider or sign-in breaks.

The redirect URI is derived from `BETTER_AUTH_URL`. If logins bounce back with "Invalid origin", that variable is the first thing to check. See [Configuration](configuration.md).
