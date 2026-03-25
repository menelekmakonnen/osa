# ICUNI Labs OSA - Auditor & Tester Guide

Welcome to the OSA (Old Students Association) Platform! This guide provides an overview of the platform's architecture, testing procedures, and the specific features available to staff members at all hierarchical levels.

## 1. Introduction to OSA
The OSA Platform is a comprehensive management and engagement tool designed for alumni associations. It allows schools, year groups, houses, and clubs to manage memberships, process event RSVPs, execute fundraising campaigns, dispatch newsletters, and share updates seamlessly.

## 2. Staff & Administrative Features
For the purpose of this audit, your account has been provisioned with `"IT Department"` or `"Super Admin"` privileges. This top-tier authorization grants you unrestricted access to all platform features, bypassing branch-level limitations.

**Key Features & Workflows to Test:**
- **ICUNI Labs Cockpit:** Verify that the global system overview aggregates metrics from various schools down to individual year groups accurately.
- **Governance & Role Assignments:** Test appointing and modifying leadership roles across the 5-tier architecture (from Tier 1: Year Group up to Tier 5: Platform Admin). Ensure scope validations strictly hold.
- **Post & Newsletter Moderation:** Test the approval, rejection, and final dispatch workflow for newsletters in different association scopes.
- **Fundraising Campaigns:** Create campaigns and review the contribution simulation workflows to ensure transactional states update properly.
- **Ticketing & Support Desk:** Review the escalation and resolution workflow for submitted user support tickets.
- **Event Management:** Deploy events with multi-tier visibility (e.g., School-wide versus single Year Group).

## 3. Login Instructions
Your specific login credentials have been securely provisioned and provided to you independently by the system administrator. 

To log in:
1. Navigate to the OSA Platform portal.
2. Enter the secure Email and Password given to you privately. 
*(Note: For strict security and compliance reasons, login credentials or default seeds are intentionally omitted from this repository's documentation.)*
3. Once authenticated, your dashboard will automatically adapt to reflect your global administration scope.

## 4. Testing & Feedback Expectations
We strongly encourage a rigorous, comprehensive audit of the platform.

While discovering and reporting bugs or functional regressions is a primary goal, we equally value your insights beyond just what is "broken". **Please also suggest improvements in the following areas:**
- **UX/UI Improvements:** How can navigation, responsiveness, or aesthetics be modernized and streamlined?
- **Architectural Enhancements:** Do you identify any potential performance bottlenecks or technical debt in the current foundation?
- **Security & Authorization:** Are there any permission escalations or strict validation flaws across the role tiers?
- **Feature Enhancements:** What additional capabilities would transform the platform experience for end-users, moderators, and the executive staff?

Please document your architectural suggestions and user-experience improvements directly alongside your standard bug reports.

*Thank you for helping us elevate the ICUNI Labs OSA Platform!*
