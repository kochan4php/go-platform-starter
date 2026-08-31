# API curl examples

Generated from the aggregate OpenAPI document. Replace placeholders before use; the lab gateway defaults to `127.0.0.1:8010`.

## auth

### register

create credentials; emits user.created onto users.events

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/register' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com","password":"examplexxxxx","displayName":"example"}'
```

### login

uniform-401 login with lockout; mints access token + sets refresh cookie

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/login' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com","password":"example","otp":"example"}'
```

### refresh

rotate the refresh cookie (reuse kills the family) and mint a new access token

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/refresh' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### logout

revoke the session carried by the refresh cookie and clear it

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/logout' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### beginMFA

create a time-limited TOTP enrollment and QR code

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/mfa/enroll' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### verifyMFA

verify TOTP and enable MFA for the authenticated user

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/mfa/verify' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"code":"123456"}'
```

### generateRecoveryCodes

replace and return ten single-use MFA recovery codes exactly once

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/recovery-codes' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### loginHistory

the authenticated user's privacy-bounded login history and risk scores

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/auth/login-history' \
  --header 'Authorization: Bearer <access-token>'
```

### impersonateUser

mint a read-only 15-minute audited support token for a managed user

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/impersonate/1' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### requestMagicLink

always queue a single-use passwordless login link when the account exists

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/magic-link' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com"}'
```

### consumeMagicLink

consume a passwordless login token and create a normal rotating session

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/magic-link/consume' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"example"}'
```

### startOAuth

create a short-lived OAuth state and return the provider authorization URL

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/auth/oauth/1/start'
```

### finishOAuth

validate OAuth state, exchange the code, and create or link the user session

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/auth/oauth/1/callback?code=example&state=example'
```

### listSessions

active sessions of the authenticated user

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/auth/sessions' \
  --header 'Authorization: Bearer <access-token>'
```

### revokeAllSessions

revoke every other session of the authenticated user

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/auth/sessions' \
  --header 'Authorization: Bearer <access-token>'
```

### revokeSession

revoke one session of the authenticated user

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/auth/sessions/1' \
  --header 'Authorization: Bearer <access-token>'
```

### forgotPassword

always-200 password reset request (anti-enumeration)

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/forgot' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com"}'
```

### resetPassword

consume a single-use reset token, set new password, wipe all sessions

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/reset' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"example","newPassword":"examplexxxxx"}'
```

### validateResetToken

validate a reset token without consuming its single-use grant

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/reset/validate' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"example"}'
```

### adminSetUserPassword

admin sets a new password for a user (revokes their sessions)

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/users/1/password' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"newPassword":"examplexxxxx"}'
```

### confirmPassword

re-authenticate the current user before a sensitive admin action

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/confirm-password' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"password":"example"}'
```

### changePassword

change the authenticated user's password after verifying the old password

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/auth/password' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"oldPassword":"example","newPassword":"examplexxxxx"}'
```

### adminListUserSessions

list active sessions for a managed user

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/auth/users/1/sessions' \
  --header 'Authorization: Bearer <access-token>'
```

### adminRevokeUserSessions

force logout a managed user on every device

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/auth/users/1/sessions' \
  --header 'Authorization: Bearer <access-token>'
```

### adminRevokeUserSession

revoke one active session for a managed user

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/auth/users/1/sessions/1' \
  --header 'Authorization: Bearer <access-token>'
```

### adminSetUserState

activate/deactivate and lock/unlock a managed user

```sh
curl --fail-with-body --request PATCH \
  'http://127.0.0.1:8010/api/v1/auth/users/1/state' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Content-Type: application/json' \
  --data '{"status":"active","locked":true}'
```

## gateway

### scalarDocs

Scalar UI over the aggregate spec

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/docs'
```

### aggregateSpec

aggregate OpenAPI document composed from every upstream at boot

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/docs/openapi.json'
```

## platform

### healthz

Check process liveness

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/healthz'
```

### readyz

Check dependency readiness

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/readyz'
```

### version

Read build identity

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/version'
```

## rbac

### listPermissions

the compile-time catalog persisted in the db

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/rbac/permissions' \
  --header 'Authorization: Bearer <access-token>'
```

### createPermission

add a unique permission to the catalog

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/rbac/permissions' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"report:export:any"}'
```

### bulkCreatePermissions

create up to 100 permissions atomically

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/rbac/permissions/bulk' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"names":["user:read:any"]}'
```

### permissionExists

check whether a permission exists without returning a body

```sh
curl --fail-with-body --request HEAD \
  'http://127.0.0.1:8010/api/v1/rbac/permissions/1' \
  --header 'Authorization: Bearer <access-token>'
```

### deletePermission

delete an unused permission from the catalog

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/rbac/permissions/1' \
  --header 'Authorization: Bearer <access-token>'
```

### listRoles

listRoles

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/rbac/roles' \
  --header 'Authorization: Bearer <access-token>'
```

### createRole

createRole

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/rbac/roles' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"example","description":"example","color":"#6366f1","icon":"shield","archived":false,"permissions":["example"]}'
```

### updateRole

rename/describe and/or sync the permission set; bumps affected users' ver

```sh
curl --fail-with-body --request PATCH \
  'http://127.0.0.1:8010/api/v1/rbac/roles/1' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"example","description":"example","color":"#6366f1","icon":"shield","archived":false,"permissions":["example"]}'
```

### deleteRole

deleteRole

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/rbac/roles/1' \
  --header 'Authorization: Bearer <access-token>'
```

### listRoleUsers

list user IDs assigned to a role

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/rbac/roles/1/users' \
  --header 'Authorization: Bearer <access-token>'
```

### getUserRoles

list roles assigned to a user

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/rbac/users/1/roles' \
  --header 'Authorization: Bearer <access-token>'
```

### setUserRoles

replace the role set assigned to a user (bumps their ver)

```sh
curl --fail-with-body --request PUT \
  'http://127.0.0.1:8010/api/v1/rbac/users/1/roles' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Content-Type: application/json' \
  --data '{"roleIds":[1]}'
```

### resolveClaims

internal API — perms[] + ver for a subject; requires the shared internal secret

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/rbac/internal/claims/1'
```

## realtime

### realtimeInfo

ws url + protocol version for the web client

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/info' \
  --header 'Authorization: Bearer <access-token>'
```

## template

### ping

liveness-style demo endpoint proving spec → codegen → handler wiring

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/ping'
```

## users

### resizeAvatar

validate and resize an avatar to fit within 512x512

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/avatar/resize' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --form 'file=@avatar.jpg'
```

### me

the caller's profile, served purely from identity headers

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/me' \
  --header 'Authorization: Bearer <access-token>'
```

### eraseMe

irreversibly erase the caller's personal data and revoke access

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/users/me' \
  --header 'Authorization: Bearer <access-token>'
```

### exportMyData

download all personal data held by the platform

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/me/export' \
  --header 'Authorization: Bearer <access-token>'
```

### listUsers

paginated profiles with validated server-side sorting

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users' \
  --header 'Authorization: Bearer <access-token>'
```

### createUserProfile

provision a profile row for an existing sub

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"id":1,"email":"user@example.com","displayName":"example","avatarUrl":"https://example.com/avatar.png"}'
```

### getUserStats

directory totals and seven-day registration series

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/stats' \
  --header 'Authorization: Bearer <access-token>'
```

### productOverview

aggregate product dashboard counters and registration series

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/product/overview' \
  --header 'Authorization: Bearer <access-token>'
```

### listProductRecords

list typed product workflows visible to the caller

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/product/records' \
  --header 'Authorization: Bearer <access-token>'
```

### createProductRecord

create a notification, workflow, integration, preference, or report schedule

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/product/records' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"kind":"notification","subjectId":1,"name":"example","status":"active","payload":{},"expiresAt":"2026-01-01T00:00:00Z"}'
```

### updateProductRecord

update product workflow status and payload

```sh
curl --fail-with-body --request PATCH \
  'http://127.0.0.1:8010/api/v1/users/product/records/1' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Content-Type: application/json' \
  --data '{"status":"example","payload":{}}'
```

### deleteProductRecord

delete a caller-owned or administratively managed product record

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/users/product/records/1' \
  --header 'Authorization: Bearer <access-token>'
```

### searchProduct

global search across profiles and accessible product resources

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/product/search?q=example' \
  --header 'Authorization: Bearer <access-token>'
```

### productAnalytics

activity heatmap, role usage, login risk, and usage metering

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/product/analytics' \
  --header 'Authorization: Bearer <access-token>'
```

### simulatePermission

explain whether roles or a live delegation grant a permission

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/product/permissions/simulate' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"userId":1,"permission":"example"}'
```

### productPresence

privacy-safe public presence aggregate for authenticated clients

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/product/presence' \
  --header 'Authorization: Bearer <access-token>'
```

### verifyInvitation

consume an invitation and return its pre-approved registration attributes

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/product/invitations/verify' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"examplexxxxxxxxxxxxx"}'
```

### requestEmailChange

send a single-use verification link before changing the caller email

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/me/email-change' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com"}'
```

### verifyEmailChange

consume an email-change token and atomically replace the identity email

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/email-change/verify' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"examplexxxxxxxxxxxxx"}'
```

### requestAccountDeletion

schedule account erasure after a 30-day grace period and revoke sessions

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/me/deletion' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Idempotency-Key: <unique-request-id>'
```

### restoreAccountDeletion

restore an account during its 30-day deletion grace period

```sh
curl --fail-with-body --request POST \
  'http://127.0.0.1:8010/api/v1/users/deletion/restore' \
  --header 'Idempotency-Key: <unique-request-id>' \
  --header 'Content-Type: application/json' \
  --data '{"token":"examplexxxxxxxxxxxxx"}'
```

### getUser

getUser

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/users/1' \
  --header 'Authorization: Bearer <access-token>'
```

### updateUser

updateUser

```sh
curl --fail-with-body --request PATCH \
  'http://127.0.0.1:8010/api/v1/users/1' \
  --header 'Authorization: Bearer <access-token>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"user@example.com","displayName":"example","avatarUrl":"https://example.com/avatar.png"}'
```

### deleteUser

soft-delete the profile row and emit user.deleted

```sh
curl --fail-with-body --request DELETE \
  'http://127.0.0.1:8010/api/v1/users/1' \
  --header 'Authorization: Bearer <access-token>'
```

## worker

### listAuditEntries

paginated audit trail, newest first

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/audit/viewer' \
  --header 'Authorization: Bearer <access-token>'
```

### exportAuditEntries

export up to 10000 filtered audit entries as CSV

```sh
curl --fail-with-body --request GET \
  'http://127.0.0.1:8010/api/v1/audit/viewer/export' \
  --header 'Authorization: Bearer <access-token>'
```
