# INCIDENT REPORT

**Incident ID:**            {{INCIDENT_ID}}
**Timestamp:**              {{TIMESTAMP}}
**User:**                   {{USER}}
**Login IP:**               {{LOGIN_IP}}
**Location:**               {{LOCATION}}
**MFA Used:**               {{MFA_USED}}
**IOC Matched:**            {{IOC_MATCHED}}
**Sensitive Data Accessed:**{{SENSITIVE_DATA}}
**Severity:**               {{SEVERITY}}
**Status:**                 {{STATUS}}

---

## Executive Summary

{{EXEC_SUMMARY}}

---

## Incident Details

| Field           | Value                   |
|-----------------|------------------------|
| Incident ID     | {{INCIDENT_ID}}        |
| Timestamp       | {{TIMESTAMP}}          |
| User            | {{USER}}               |
| Login IP        | {{LOGIN_IP}}           |
| Location        | {{LOCATION}}           |
| MFA Used        | {{MFA_USED}}           |
| IOC Matched     | {{IOC_MATCHED}}        |
| Sensitive Data  | {{SENSITIVE_DATA}}     |
| Severity        | {{SEVERITY}}           |
| Status          | {{STATUS}}             |

---

## Timeline

{{TIMELINE}}

---

## Actions Taken

{{ACTIONS_TAKEN}}

---

## Recommended SecOps Actions

{{RECOMMENDED_ACTIONS}}

---

## Investigation Links

- [VirusTotal: {{LOGIN_IP}}](https://www.virustotal.com/gui/ip-address/{{LOGIN_IP}})
- [IP Info: {{LOGIN_IP}}](https://ipinfo.io/{{LOGIN_IP}})
- [AbuseIPDB: {{LOGIN_IP}}](https://www.abuseipdb.com/check/{{LOGIN_IP}})

---

## EU Compliance Checklist

- [ ] GDPR Art. 33 – Supervisory‑authority notification within 72h
- [ ] GDPR Art. 34 – Data‑subject notification (if high risk)
- [ ] NIS2 – National CSIRT notification (if applicable)
- [ ] Records updated in Register of Processing Activities (RoPA)
- [ ] DPO sign‑off obtained

---

## Follow‑Up Tasks & Deadlines

- [ ] Complete endpoint forensic report
- [ ] Review IAM policies for affected user
- [ ] Conduct post‑incident lessons‑learned session
- [ ] Close incident after post‑mortem
