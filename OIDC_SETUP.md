# OIDC Authentication Setup Guide

This guide explains how to configure OIDC authentication with Cloudflare Access for your Specialist TV application.

## Prerequisites

- Cloudflare Access SaaS application configured
- Access to Cloudflare Zero Trust dashboard
- Your application deployed on Cloudflare Workers

## Step 1: Configure Cloudflare Access SaaS Application

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
2. Navigate to **Access** > **Applications**
3. Find your SaaS application or create a new one:
   - **Application type**: SaaS
   - **Application**: Custom
   - **Application name**: "Specialist TV"

## Step 2: Get OIDC Configuration Details

In your Cloudflare Access SaaS application:

1. **Client ID**: Copy the Client ID from the application details
2. **Client Secret**: Copy the Client Secret (keep this secure)
3. **Issuer URL**: This is the full OIDC issuer URL from your Cloudflare Access SaaS app, in the format: `https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/sso/oidc/<client-id>` (e.g., `https://justalittlebyte.cloudflareaccess.com/cdn-cgi/access/sso/oidc/44fd216d78bc0e915308c11e7ca75de170750c625212f93823a507d2fa5119ec`)
4. **Redirect URI**: Set this to your callback URL: `https://your-domain.com/api/auth/cloudflare-access/callback`

**Important**: The OIDC_ISSUER should be the complete issuer URL that includes the client ID path. You can find this in your Cloudflare Access SaaS application configuration.

## Step 3: Configure Environment Variables

Create or update your `.dev.vars` file with the OIDC configuration:

```bash
# OIDC Configuration for Cloudflare Access
OIDC_CLIENT_ID=44fd216d78bc0e915308c11e7ca75de170750c625212f93823a507d2fa5119ec
OIDC_CLIENT_SECRET=your_client_secret_here
OIDC_ISSUER=https://justalittlebyte.cloudflareaccess.com/cdn-cgi/access/sso/oidc/44fd216d78bc0e915308c11e7ca75de170750c625212f93823a507d2fa5119ec
OIDC_REDIRECT_URI=http://localhost:8787/api/auth/cloudflare-access/callback
```

For production, set these as secrets in your Cloudflare Workers:

```bash
# Set production secrets
wrangler secret put OIDC_CLIENT_ID
wrangler secret put OIDC_CLIENT_SECRET
wrangler secret put OIDC_ISSUER
wrangler secret put OIDC_REDIRECT_URI
```

## Step 4: Configure Identity Providers

In Cloudflare Access, configure your identity providers:

1. Go to **Settings** > **Authentication**
2. Add your preferred identity providers:
   - **Google Workspace**
   - **Microsoft Azure AD**
   - **GitHub**
   - **Generic OIDC**
   - **SAML**

## Step 5: Set Up Access Policies

Create access policies to control who can authenticate:

1. Go to your SaaS application settings
2. Add policies:
   - **Allow**: Specific email addresses
   - **Allow**: Email domains (e.g., `@yourcompany.com`)
   - **Allow**: Groups (if using directory sync)

## Step 6: Test the Integration

1. Deploy your application with the OIDC configuration
2. Visit your application
3. Click "Sign in with Cloudflare Access"
4. You should be redirected to Cloudflare Access login
5. After authentication, you'll be redirected back to your app

## OIDC Flow Details

### Authorization Flow

1. **User clicks SSO** → `/api/auth/cloudflare-access`
2. **Generate PKCE parameters** → Code verifier and challenge
3. **Redirect to Cloudflare Access** → With authorization parameters
4. **User authenticates** → Through configured identity provider
5. **Callback with code** → `/api/auth/cloudflare-access/callback`
6. **Exchange code for tokens** → Using PKCE and client credentials
7. **Extract user info** → From ID token
8. **Create app token** → With user details
9. **User logged in** → Redirected to creator page

### Security Features

- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **State parameter**: Prevents CSRF attacks
- **Secure token storage**: HttpOnly cookies and localStorage
- **Token expiration**: 24-hour token lifetime
- **Error handling**: Graceful error handling with redirects

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `OIDC_CLIENT_ID` | Client ID from Cloudflare Access | `abc123...` |
| `OIDC_CLIENT_SECRET` | Client Secret (keep secure) | `secret123...` |
| `OIDC_ISSUER` | Cloudflare Access issuer URL | `https://myteam.cloudflareaccess.com` |
| `OIDC_REDIRECT_URI` | Callback URL for your app | `https://myapp.com/api/auth/cloudflare-access/callback` |

## Troubleshooting

### "OIDC not configured" Error
- Verify all environment variables are set
- Check that variables are available in the worker environment
- Ensure secrets are properly deployed to production

### "Token exchange failed" Error
- Verify client ID and secret are correct
- Check that the redirect URI matches exactly
- Ensure the issuer URL is correct

### "Invalid state parameter" Error
- Check that the callback URL is receiving the state parameter
- Verify the state hasn't expired (5-minute limit)
- Ensure the state encoding/decoding is working correctly

### "OAuth error" Error
- Check Cloudflare Access application configuration
- Verify access policies allow the user
- Check identity provider configuration

## Advanced Configuration

### Custom Scopes
Modify the authorization request to include additional scopes:

```typescript
authUrl.searchParams.set('scope', 'openid profile email groups');
```

### Token Refresh
Implement token refresh using the refresh token:

```typescript
// Store refresh token
const appToken = {
  username: userName,
  email: userEmail,
  provider: 'cloudflare-access',
  oidc_sub: idTokenPayload.sub,
  refresh_token: tokens.refresh_token, // Add this
  exp: Date.now() + (24 * 60 * 60 * 1000)
};
```

### User Groups
Extract user groups from the ID token:

```typescript
const userGroups = idTokenPayload.groups || [];
const appToken = {
  // ... other fields
  groups: userGroups
};
```

## Production Considerations

1. **JWT Signature Verification**: Implement proper JWT signature verification
2. **Token Storage**: Consider using KV storage for session management
3. **Rate Limiting**: Implement rate limiting on authentication endpoints
4. **Monitoring**: Add logging and monitoring for authentication flows
5. **Error Handling**: Implement comprehensive error handling and user feedback

## Support Resources

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
- [OIDC Specification](https://openid.net/connect/)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
