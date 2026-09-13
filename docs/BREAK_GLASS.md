# Break-glass administration

Use this only when normal RBAC administration is unavailable and an outage or
security incident requires immediate access.

1. The incident commander records the scope and duration and gets approval
   from a second operator.
2. Retrieve the one-time credential from the production secret manager. Never
   send it through chat or paste it into an issue.
3. Assign only the required role, increment `rbac.user_versions.ver`, set
   `claims:ver:<user-id>` in Redis, and save command output in the incident.
4. Perform only the approved action and confirm it appears in audit logs.
5. Remove the role, increment the claims version again, revoke every session,
   and rotate the one-time credential.
6. A different operator verifies removal. Complete a retrospective within two
   business days.

Run a quarterly drill; a failed grant or revocation is an operational incident.
