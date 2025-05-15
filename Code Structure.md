# Project Structure

```text
├── README.md                      — Overview, setup instructions, and basic usage  
├── Code Structure.md              — **This file:** high-level map of every folder and key file  
├── improvements.md                — Road-map / backlog of suggested enhancements  

├── .github/
│   └── workflows/
│       └── ci.yml                 — GitHub Actions pipeline (lint + unit tests)  

├── src/                           — Production Apps Script source
│   ├── Soar Incident Responses.gs — Main automation logic: incident intake, reporting, notifications, logging  
│   ├── helpers/
│   │   ├── email.js               — Mailjet / Gmail wrapper functions  
│   │   ├── slack.js               — Slack-webhook helper functions  
│   │   └── utils.js               — Shared utilities (ID generation, formatting, logging)  
│   └── templates/
│       └── incident_template.docx — Google Docs incident-report template (exported copy for reference)  

├── docs/                          — End-user and developer documentation
│   ├── Sample Google Docs Template.md — Markdown preview of the report template with merge-tags  
│   ├── architecture.md            — High-level design diagram and data-flow explanation  
│   └── compliance-checklists.md   — GDPR / NIS2 checklists referenced by the workflow  

├── examples/
│   ├── mock_incident.json         — Sample webhook payload for manual / unit testing  
│   └── curl_examples.md           — Ready-to-use cURL snippets for hitting `doPost`  

├── tests/                         — Automated test suites
│   ├── unit/
│   │   └── utils.test.js          — Jest unit tests for helper modules  
│   └── integration/
│       └── end_to_end.test.js     — Simulated incident flow from webhook to Slack/email  

└── tools/
    └── deploy.sh                  — Convenience script for `clasp push`, version tagging, and environment promotion
