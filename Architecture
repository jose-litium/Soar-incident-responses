# Architecture

This document outlines the architecture of the **SOAR Incident Response Automation** solution, including a high-level diagram, system components, and how they interact to deliver a fully automated incident management workflow.

---

## Overview

The solution integrates Google Apps Script, Google Workspace (Docs & Sheets), Mailjet, and Slack to automate the intake, processing, reporting, and notification of security incidents. It is designed for easy extension and rapid deployment in organizations using Google Workspace.

---

## High-Level Architecture Diagram

```mermaid
flowchart TD
    CurlTest["curl Randomizer"]
    Chronicle["Chronicle SIEM"]
    Manual["Manual Run"]
    AppsScript["Apps Script"]
    GoogleDocs["Docs (Report)"]
    GoogleSheets["Sheets (Log)"]
    Mailjet["Mailjet"]
    Slack["Slack"]
    Logger["Logger"]

    CurlTest -->|POST| AppsScript
    Chronicle -->|Webhook| AppsScript
    Manual --> AppsScript

    AppsScript -->|Report| GoogleDocs
    AppsScript -->|Log| GoogleSheets
    AppsScript -->|Email| Mailjet
    AppsScript -->|Alert| Slack
    AppsScript -->|Log| Logger
