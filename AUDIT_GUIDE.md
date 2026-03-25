# ICUNI Labs OSA — Auditor & Tester Guide

## Who You Are

You are testing as an **ICUNI Labs Staff Member** — the **seniormost authority** on the entire OSA platform. You sit at **Tier 5 (IT Department)**, which is above every school's Super Admin (Tier 4), Year Group executives (Tier 1), and all other administrators.

**Your role can do everything. No feature is off-limits.**

---

## Login Credentials

Your credentials have been provided to you privately by the system administrator. Navigate to the portal, enter your email and password, and you will be authenticated directly into the system with full IT Department authority.

*(Credentials are never stored in the repository for security compliance.)*

---

## Your Exclusive Interface: The Cockpit

Unlike regular members who see a Dashboard, and unlike school Super Admins who see the Super Admin panel, you have access to the **ICUNI Labs Cockpit** — a completely separate engineering control centre only visible to IT Department staff.

Access it from the sidebar: **Administration → Cockpit**

### Cockpit Features to Test

The Cockpit has **5 tabs**. Test every one:

#### 1. Overview
- **KPI Strip:** Verify total Schools, Members, Open Tickets, Pending Posts aggregate correctly.
- **Escalated Tickets:** Confirm tickets that reached the highest tier appear here.
- **Staff Roster:** Add a new IT Department staff member. Try removing one (not yourself).
- **Recent Activity:** Confirm the latest platform activity appears chronologically.

#### 2. Schools
- **Add a School:** Click "Add School", fill in the form, submit. Verify the new school appears in the registry.
- **Remove a School:** Click the trash icon next to a school. Confirm destructive action prompt. Verify it disappears.
- **Status Badges:** Check that school status (Active/Pending/Approved) renders correctly.

#### 3. Member Override
- **Search:** Enter a name or email. Results should pull from the entire platform, not just your school.
- **Override:** Select a member, choose a field (e.g. "role"), enter a new value (e.g. "School Administrator"), and click "Apply Override". Verify the change persists.
- **Fields available:** role, verification_status, email_verified, id_verified, year_group_id, year_group_nickname, school, name, email, house_name, final_class, gender.

#### 4. Spreadsheet (Raw Data Access)
- **Sheet Selector:** Switch between all 12 sheets (members, posts, campaigns, events, tickets, schools, year_groups, donations, rsvps, newsletters, board_messages, group_settings).
- **Filter:** Type in the search box to filter rows by any column value.
- **Cell Edit:** Click any cell to open the edit modal. Change the value and save. Verify the change is written through to the backend.
- **Sensitive fields** (password, session_token) are masked with `••••••` and blocked from direct editing.

#### 5. Feature Flags
- **Toggle each flag** on/off:
  - Fundraising Module
  - Newsletters Module
  - Cross-School Events
  - Payment Gateway (v2)
  - Admin Approval for Registrations
- **Save to Backend:** Click "Save to Backend". Verify a success toast appears.
- **Persistence:** Reload the page. Confirm flags retain their saved state.

---

## User View Mode

From the Cockpit, click the **"User View"** button. This switches your interface to look exactly like a regular member's Dashboard — but with a **Tier Switcher** bar at the top.

Use the Tier buttons (T1–T5) to simulate what different role-levels see. Test:
- T1 (Year Group) — see year-group-scoped content
- T2 (Club) — see club-scoped content
- T3 (House) — see house-scoped content
- T4 (School) — see school-wide content
- T5 (Platform) — see all-school content

Click "Cockpit" to return to the engineering view.

---

## Other Pages You Have Full Access To

Since IT Department is the highest authority, you also have access to:

| Page | What to Test |
|------|-------------|
| **Dashboard** | Posting, metrics, scope switching |
| **Newsletter** | Post submission, approval, rejection, dispatch |
| **Fundraising** | Campaign listing, donation flow |
| **Events** | Event listing, RSVP, Create Event modal (admin only) |
| **Members Directory** | Search, privacy filters, profile viewing |
| **Group Board** | Posting messages, reactions, comments |
| **Gallery** | Album creation, image uploads |
| **Tech Support** | Ticket submission, escalation, resolution |
| **Admin Panel** | Role assignment, social links, group avatar upload |
| **Super Admin** | School onboarding, feature flags (original), accountability tracker, petitions |
| **Profile** | Edit personal info, master override, password change, profile picture |

---

## What We Want From You

### 1. Bug Reports
Report anything that doesn't work — broken buttons, blank pages, errors, failed API calls, incorrect data.

### 2. Permission Testing
- Verify that you (IT Department) can access **everything**.
- Verify that lower tiers **cannot** access higher-tier features (test via User View tier switching).

### 3. Improvement Suggestions
Go beyond bugs. Suggest:
- **UX/UI improvements** — better navigation, responsive issues, accessibility gaps
- **Missing features** — what would make this platform more powerful?
- **Security concerns** — any authorization bypass or data exposure risks
- **Architecture** — performance bottlenecks, technical debt observations

---

*Thank you for helping us elevate the ICUNI Labs OSA Platform!*
