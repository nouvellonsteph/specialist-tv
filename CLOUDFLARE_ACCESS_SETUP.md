# Cloudflare Access Setup Guide

This guide explains how to configure Cloudflare Access authentication for your Specialist TV application.

## Prerequisites

- Your application must be deployed on a domain managed by Cloudflare
- You need access to the Cloudflare dashboard
- Your domain should be proxied through Cloudflare (orange cloud enabled)

## Step 1: Enable Cloudflare Access

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Navigate to **Zero Trust** > **Access** > **Applications**
4. Click **Add an application**

## Step 2: Configure Application

1. **Choose application type**: Select "Self-hosted"
2. **Application name**: Enter "Specialist TV Creator"
3. **Subdomain**: Enter your application's subdomain (e.g., `specialist-tv`)
4. **Domain**: Select your domain
5. **Path**: Leave empty or enter `/creator` if you want to protect only the creator section

## Step 3: Set Up Authentication Policy

1. **Policy name**: Enter "Creator Access"
2. **Action**: Select "Allow"
3. **Configure rules**: Choose your preferred authentication method:
   - **Email addresses**: Add specific email addresses
   - **Email domains**: Add your organization's domain (e.g., `@yourcompany.com`)
   - **Groups**: Use Cloudflare Access groups if configured
   - **Identity providers**: Connect with Google, Microsoft, GitHub, etc.

## Step 4: Configure Identity Provider (Optional)

If you want to use external identity providers:

1. Go to **Zero Trust** > **Settings** > **Authentication**
2. Click **Add new** under Login methods
3. Choose your provider (Google, Microsoft, GitHub, etc.)
4. Follow the provider-specific setup instructions

## Step 5: Test the Integration

1. Deploy your application with the Cloudflare Access integration
2. Visit your application URL
3. Click "Sign in with Cloudflare Access" in the login form
4. You should be redirected to Cloudflare Access login
5. After successful authentication, you'll be redirected back to the creator page

## How It Works

1. **User clicks SSO button** → Redirects to `/api/auth/cloudflare-access`
2. **Server redirects** → To Cloudflare Access login (`/cdn-cgi/access/login`)
3. **User authenticates** → Through configured identity provider
4. **Cloudflare redirects back** → To `/api/auth/cloudflare-access/callback`
5. **Server processes JWT** → Extracts user info and creates app token
6. **User is logged in** → Redirected to creator page with authentication

## Security Notes

- The current implementation decodes JWT without signature verification for simplicity
- In production, you should verify the JWT signature using Cloudflare's public keys
- Consider implementing proper session management for enhanced security
- The application token expires after 24 hours

## Troubleshooting

### "Access Denied" Error
- Check that your email/domain is included in the Access policy
- Verify the application configuration covers the correct paths

### "Authentication Failed" Error
- Ensure Cloudflare Access is properly configured for your domain
- Check that the domain is proxied through Cloudflare (orange cloud)

### JWT Not Found
- Verify that the application is behind Cloudflare Access
- Check that the callback URL is correctly configured

## Advanced Configuration

### Custom Redirect URL
You can modify the callback URL in `cloudflare-access-handlers.ts`:

```typescript
const callbackUrl = `${url.origin}/api/auth/cloudflare-access/callback`;
```

### Token Expiration
Adjust token expiration in the callback handler:

```typescript
exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
```

### Additional User Claims
Extract more user information from the JWT payload:

```typescript
const payload = JSON.parse(atob(cfAccessJwt.split('.')[1]));
const userEmail = payload.email || payload.sub || 'unknown';
const userName = payload.name || userEmail.split('@')[0];
const userGroups = payload.groups || [];
```

## Support

For issues with Cloudflare Access configuration, refer to:
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
