# Collaboration and knowledge sharing

## Pair and mob programming

Pairing is opt-in for risky, unfamiliar, or cross-boundary work—not a default
meeting for every task. Agree on the outcome and stop time first.

- **Driver:** edits and narrates the immediate step.
- **Navigator:** checks the model, edge cases, tests, and next step.
- Swap every 20–30 minutes or after a coherent checkpoint.
- In a mob, one driver works; one facilitator keeps a queue; everyone else
  navigates. Rotate the driver at each checkpoint.
- Keep the branch, terminal, and decisions visible. Never expose production
  secrets, personal data, or unredacted incident evidence on a shared screen.
- End with a passing check, concise commit/PR notes, unresolved questions, and
  ownership. Pairing supplements—not replaces—independent review.

Remote sessions use the same rules, with captions/recording only after explicit
consent. A participant may pause or leave without justification.

## Cadence

| Cadence | Activity | Durable output |
| --- | --- | --- |
| per PR | reviewer explains non-obvious boundary decisions | code, test, ADR/doc link |
| weekly, 30 min | rotating demo or incident/architecture learning | notes in decision/runbook docs |
| monthly | dependency, security, reliability, and documentation review | owned backlog actions |
| quarterly | restore/incident exercise and architecture review | measured RPO/RTO, updated threat model/runbook |

Cancel sessions with no agenda or durable output. Knowledge belongs in the
repository, not only a recording or a person's memory.
