# Flaky-test quarantine

Quarantine is the last resort, never a silent skip. Add a JSON entry with
`test`, `owner`, `issue`, `reason`, and an ISO `expires` date no more than 14
days away. Nightly CI fails expired or ownerless entries. The normal retry gate
labels a PR when a test passes only on its second attempt.
