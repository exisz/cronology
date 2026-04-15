# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | ✅ Latest only     |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email the maintainer or open a private security advisory on GitHub
3. Include a description of the vulnerability and steps to reproduce

We will respond within 48 hours and work on a fix promptly.

## Security Considerations

- Cronology runs as a local daemon — bind to `127.0.0.1` if you don't need network access
- Callback tokens are stored in SQLite — ensure your data directory has appropriate permissions
- The API has no built-in authentication — use a reverse proxy for production deployments
