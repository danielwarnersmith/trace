# DIGEST

Defines the living session digest.

## Digest file

The digest is stored at digest.md as UTF-8 Markdown. The format is free-form
and human-authored; the system MUST NOT require a rigid template.

## Writes

When the system writes or updates the digest, it MUST:

- Overwrite digest.md with the new content.
- Set session.json.digest_path to "digest.md".
- Set session.json.digest_updated_at (RFC 3339).
- Update session.json.updated_at.

If a user edits digest.md manually, those edits are authoritative.
