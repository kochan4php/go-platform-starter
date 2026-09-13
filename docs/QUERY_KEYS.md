# Query-key conventions

TanStack Query keys are hierarchical and serializable. The shape is
`[resource, ...params]` so invalidation can target whole resources:

| Key | Producer | Invalidated by |
| --- | --- | --- |
| `["users", { limit, offset }]` | users list query | any user create/update/delete |
| `["user", id]` | single profile detail (when needed) | update/delete of that id |
| `["roles"]` | rbac roles list | role create/update/delete |
| `["permissions"]` | permission catalog (static per deploy) | never invalidated at runtime |

Rules:

1. List keys always carry their pagination params — different pages are
   different cache entries sharing the `"users"` root.
2. Mutations invalidate by resource root:
   `queryClient.invalidateQueries({ queryKey: ["users"] })`.
3. No secrets, tokens, or timestamps in keys — values come from `queryFn`,
   not from the key.
4. Remotes own their queries; the host owns none beyond auth state (which is
   context, not a query).
