# Soar-incident-responses
Kickstarting an Incident Response in Google Workspace
# Incident Response Automation System

## Overview
This system automates the initial response to security incidents detected by Chronicle SIEM/SOAR. It creates documentation, notifies stakeholders, and initiates the response workflow.

## Features
- Automated document creation from templates
- Executive summary generation
- Stakeholder notification via email
- Webhook integration for automated triggering
- Activity logging

## Setup Instructions
1. Create a Google Doc template with placeholder fields
2. Configure the script with:
   - Template document ID
   - Stakeholder email list
   - (Optional) Log spreadsheet ID
3. Deploy as a web app for webhook integration

## Usage
### Manual Execution
Run `main()` to test with sample data

### Automated Execution
Configure Chronicle SOAR to POST incident data to the webapp URL

## Dependencies
- Google Workspace
- Google Apps Script runtime

## Assumptions
- Chronicle SOAR provides enriched incident data
- Google Workspace is the primary collaboration platform
- Incident responders have access to Google Docs
