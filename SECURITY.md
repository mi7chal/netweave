# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in NetWeave, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **[security@mi7chal.dev](mailto:security@mi7chal.dev)** with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You should receive a response within **48 hours**. We will work with you to understand and address the issue before any public disclosure.

## Security Best Practices for Deployment

- **Always set `ENCRYPTION_KEY`** to a random 64-character hex string (`openssl rand -hex 32`).
- **Always set `SESSION_SECRET`** to a strong random value (`openssl rand -hex 32`).
- **Use HTTPS** in production and set `SESSION_SECURE_COOKIE=true`.
- **Do not expose** the database port to the public network.
- **Rotate secrets** periodically and after any suspected compromise.
