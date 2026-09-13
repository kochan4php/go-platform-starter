// The single description of the documentation structure.
//
// The previous setup kept this in two places at once: mkdocs.yml's nav and
// per-page Jekyll front matter. Keeping sixty-odd files in step with a nav file
// is a chore nothing enforces, so the structure lives here and the pages carry
// no navigation metadata at all.

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    "index",
    {
      type: "category",
      label: "Start",
      collapsed: false,
      items: ["ONBOARDING", "AUTH_UX", "FAQ", "TROUBLESHOOTING", "GLOSSARY"],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "ARCHITECTURE",
        "DIAGRAMS",
        "ARCHITECTURE_SCALABILITY",
        "SCALING",
        "QUERY_KEYS",
        {
          type: "category",
          label: "Decision records",
          items: [
            "adr/README",
            "templates/ADR",
            "adr/0001-fresh-build-pivot",
            "adr/0002-integer-identities",
            "adr/0003-users-table-ownership",
            "adr/0004-consolidated-migration-baseline",
            "adr/0005-monorepo-delivery",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "API and data",
      items: [
        "API_CONTRACTS",
        "CONTRACTS",
        "API_VERSIONING",
        "API_EXAMPLES",
        "API_SCHEMA_AUDIT",
        "MIGRATIONS",
        "DATA_MIGRATIONS",
        "data/README",
        "data/SCHEMA",
        "data/AUDIT",
        "UPGRADING",
      ],
    },
    {
      type: "category",
      label: "Engineering",
      items: [
        "ENGINEERING_GUIDE",
        "DOD",
        "DEVELOPER_EXPERIENCE",
        "CI_CD",
        "TESTING",
        "FRONTEND_ENGINEERING",
        "PERFORMANCE",
        "performance/BUNDLE_REPORT",
        "performance/K6",
        "RELIABILITY",
        "PRODUCT_ROADMAP",
        "LEARNING",
      ],
    },
    {
      type: "category",
      label: "Operations",
      items: [
        "RUNBOOK",
        "ONCALL",
        "INCIDENT_RESPONSE",
        "INFRA_OPS",
        "BACKUP_RESTORE",
        "OBSERVABILITY",
        "OPERATIONS",
        "STATUS",
        "reference/PORTS",
        "reference/ENVIRONMENT",
        {
          type: "category",
          label: "Templates",
          items: ["templates/INCIDENT_TIMELINE", "templates/POSTMORTEM", "templates/MAINTENANCE"],
        },
      ],
    },
    {
      type: "category",
      label: "Security",
      items: ["SECURITY", "THREAT_MODEL", "TOKEN_POLICY", "SECRETS", "PENTEST_CHECKLIST", "BREAK_GLASS"],
    },
    {
      type: "category",
      label: "Governance",
      items: [
        "DECISIONS",
        "OWNERSHIP",
        "COLLABORATION",
        "RELEASE",
        "VERSIONING",
        "ARCHIVE_POLICY",
        "DEPENDENCY_LICENSES",
        "versions/0.1",
      ],
    },
  ],
};

export default sidebars;
