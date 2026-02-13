# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Security Considerations

### Admin Authentication
- Admin passwords are hashed using SHA-256 before storage
- Password comparison uses constant-time string comparison to prevent timing attacks
- Admin tokens are stored in localStorage and validated against the server-side hash
- All write operations to the KV store require a valid admin token

### Data Storage
- Site data and admin settings are stored in Upstash Redis with 24-hour TTL
- The admin password hash is stored without TTL (persistent)
- localStorage is used as a fallback when Redis is unavailable
- Images are cached in IndexedDB (client-side only)

### API Security
- The KV API endpoint validates admin tokens on all write operations
- CORS headers are handled at the deployment platform level
- No sensitive data is exposed through GET requests beyond stored site content

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainers or use GitHub's private vulnerability reporting feature
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Environment Variables

The following environment variables contain sensitive values and should never be committed to source control:

- `UPSTASH_REDIS_REST_URL` — Redis connection URL
- `UPSTASH_REDIS_REST_TOKEN` — Redis authentication token

These should be configured through your deployment platform's environment variable settings.
