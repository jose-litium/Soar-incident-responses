# Security Incident Automation – Workflow & Logic

## Overview

This document explains how the Security Incident Automation app works:  
- What the main variables mean  
- How the app decides if an incident is critical, medium, or low severity  
- What happens at each step  
- Visual flowcharts (ASCII and Mermaid)

---

## Key Variables

| Variable                  | Meaning                                                                   | Example            |
|---------------------------|---------------------------------------------------------------------------|--------------------|
| `login_ip`                | The user’s login IP address                                               | `192.168.0.10`     |
| `ioc_matched`             | Does the IP match any known bad IPs? (IOC = Indicator of Compromise)      | `true` / `false`   |
| `mfa_used`                | Did the user use two-factor authentication (MFA)?                         | `true` / `false`   |
| `sensitive_data_accessed` | Was sensitive data accessed?                                              | `true` / `false`   |
| `severity`                | How serious is the incident? (`High`, `Medium`, `Low`)                    | `High`             |
| `status`                  | Is the incident still open or closed? (`Open`, `Closed`)                  | `Open`             |

---

## Severity Classification Logic

The app uses these rules to classify each incident:

| Condition                                          | Severity  |
|----------------------------------------------------|-----------|
| `ioc_matched = true` AND `mfa_used = false`        | High      |
| `ioc_matched = true` OR `mfa_used = false`         | Medium    |
| Neither condition above (safe login + MFA used)    | Low       |

**Examples:**

- **Case 1:**  
  - IP is malicious, MFA NOT used → **High** severity  
- **Case 2:**  
  - IP is malicious, MFA WAS used → **Medium** severity  
- **Case 3:**  
  - IP is normal, MFA NOT used → **Medium** severity  
- **Case 4:**  
  - IP is normal, MFA WAS used → **Low** severity  

---

## What Happens After Classification

- **High or Medium severity:**  
  - The app creates a report in Google Docs  
  - Sends email and Slack notifications  
  - Logs the incident in Google Sheets  
  - Sets `status = Open`
- **Low severity:**  
  - The app logs the event for record keeping  
  - Sets `status = Closed`  
  - No further action is needed  

---

## What Each Variable Is For

- **`login_ip`**: Identifies where the login came from
- **`ioc_matched`**: Checks if the IP is on the bad IP list
- **`mfa_used`**: Shows if extra security was used
- **`severity`**: Decides the urgency of the incident
- **`status`**: Indicates if it needs attention (`Open`) or is finished (`Closed`)

---

## Decision Logic Summary

If IP is bad and MFA is not used: **High severity**  
If IP is bad or MFA is not used: **Medium severity**  
If IP is safe and MFA is used: **Low severity**

---

## Workflow Flowchart (ASCII)

```text
[Start]
   |
   v
[Receive Incident Data]
   |
   v
[Check if IP is in IOC list]
   |
   |-- Yes -->[Was MFA Used?]--No-->[Severity: High]-->|
   |                  |                               |
   |                  Yes                             |
   |                  |                               v
   |              [Severity: Medium]---------------->[Generate Report, Notify, Log, Status: Open]
   |                                                 |
   |-- No ------------------->[Was MFA Used?]--No-->[Severity: Medium]--|
                          |                     |                       |
                          Yes                   v                       |
                          |                [Severity: Low]              |
                          |                     |                       |
                          |              [Log Event, Status: Closed]<---|
                          |                     
                          v
                       [End]


flowchart TD
    A([Start]) --> B[Receive Incident Data]
    B --> C{Is login IP in IOC list?}
    C -- Yes --> D{Was MFA used?}
    D -- No --> E[Severity: High]
    D -- Yes --> F[Severity: Medium]
    E --> G[Generate Report, Notify, Log, Status: Open]
    F --> G
    C -- No --> H{Was MFA used?}
    H -- No --> I[Severity: Medium]
    H -- Yes --> J[Severity: Low]
    I --> G
    J --> K[Log Event, Status: Closed]
    K --> L([End])
    G --> L
