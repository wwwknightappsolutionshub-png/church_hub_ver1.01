# Church_Hub — Use Case Scenario Testing Guide

**Modules:** Outreach · Establishment · Ministry/Cells  
**Version:** church_hub_ver1.07  
**Audience:** Church Admin, Pastor, Outreach workers, Cell Ministers / deputies

| Field | Fill in |
|-------|---------|
| Tester name | |
| Role used | |
| Church / tenant | |
| Date | |
| Environment (URL) | |
| Build / tag | |

---

## How to use this guide

1. Read the **story** for each scenario.
2. Complete the steps in the named module(s).
3. Tick **Pass / Fail** and note what you saw.
4. Use the **sample data** tables when the scenario asks for converts or cell setup.
5. Goal: learn the dashboard — **13 scenarios** total; scenarios **11–13** highlight Establishment’s discipleship mandate. Prefer a demo or seeded church.

---

## Module map

| Module | Sidebar | Primary URL |
|--------|---------|-------------|
| Outreach | Outreach | `/dashboard/outreach` — Field: `/dashboard/outreach/field` |
| Establishment | Establishment | `/dashboard/establishment` |
| Ministry/Cells | Ministry/Cells | `/dashboard/ministry-cells` |

**How they connect:** Outreach captures new people → Establishment nurtures stages → Ministry/Cells assigns members and records weekly attendance.

**Church mandate (what Establishment adds):** Outreach wins contacts; Establishment *establishes* them — visible pipeline, accountable workers, timed reminders, audited stage moves, and a path to membership, cells, WSF, and baptism.

---

## Part A — Sample data

### A1. Five new converts (Outreach)

Use when capturing contacts. Tick **GDPR consent** on every save. UK phones may use postcode; international phones require street, city, and country.

| # | First name | Last name | Phone | Email | Postcode / address | Referred by | Notes | Bus pickup? |
|---|------------|-----------|-------|-------|--------------------|-------------|-------|-------------|
| OC-1 | Amara | Okonkwo | 07123 456701 | amara.okonkwo.test@example.com | SE1 7PB | Pastor James | Park outreach; interested in youth | No |
| OC-2 | Liam | Patel | 07911 223344 | liam.patel.test@example.com | N1 9GU | Sister Grace | First-time Sunday visitor | Yes — 12 High St, N1 |
| OC-3 | Sofia | Mendes | +351 912 345 678 | sofia.mendes.test@example.com | Rua Augusta 100; Lisbon; Portugal; 1100-048 | Evangelist Mark | Tourist; WhatsApp follow-up | No |
| OC-4 | Noah | Williams | 07700 900123 | *(blank)* | E14 5AB | Cell Minister Ada | Phone only contact | No |
| OC-5 | Chioma | Adeyemi | 07400 112233 | chioma.adeyemi.test@example.com | NW10 4AE | Brother Paul | Altar call; follow-up this week | Yes — evenings after 6pm |

**Capture tips**

- Open **Outreach** → Lead capture (or **Field** on mobile).
- Set **GDPR consent = yes**.
- After save, open **Establishment** and confirm the contact (often stage **NEW_LEAD**).

---

### A2. Two complete Ministry/Cell sample packs

#### Cell pack CM-1 — River of Life Cell

| Field | Value |
|-------|--------|
| Branch / cell name | River of Life Cell |
| Location | Community Hall, Unit 4 |
| Postcode | SE1 7PB |
| Province | Assign to existing province or leave unassigned |
| Cell minister | Existing staff user or test “Ada Cell Leader” |
| Assistant / secretary | One deputy if your role allows |
| Weekly meeting | Thursday 19:00 |
| Sample members | **Jordan Lee**, **Maya Chen** (create or pick from directory) |
| Sample attendance | Present: **12** — date: this week’s meeting |

#### Cell pack CM-2 — East Gate Connect

| Field | Value |
|-------|--------|
| Branch / cell name | East Gate Connect |
| Location | Online + living room meet-up |
| Postcode | E14 5AB |
| Province | Same as CM-1 if available |
| Cell minister | Second leader user |
| Sample members | **Liam Patel** (from OC-2) + one Active Member |
| Sample attendance | Present: **8** — note: “First hybrid meeting” |

---

## Part B — Scenarios

### Scenario 1 — First field capture (Outreach)

**Story:** You met Amara at park outreach. Capture her before the conversation is lost.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 1.1 | Sign in as Admin/Pastor or outreach-capable user | Login | ☐ | |
| 1.2 | Open **Outreach** from the sidebar | Outreach | ☐ | |
| 1.3 | Enter **OC-1**; enable GDPR; save | Outreach | ☐ | |
| 1.4 | Confirm success message / listing | Outreach | ☐ | |
| 1.5 | Open **Establishment**; find Amara Okonkwo | Establishment | ☐ | |

**Learned:** Field capture feeds the discipleship pipeline.

---

### Scenario 2 — UK + international converts (Outreach)

**Story:** Capture UK and international contacts in one session.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 2.1 | Capture **OC-2** (UK + bus pickup) | Outreach | ☐ | |
| 2.2 | Capture **OC-3** (full international address) | Outreach | ☐ | |
| 2.3 | Confirm both in Establishment | Establishment | ☐ | |

**Learned:** International phones need structured address; UK can use postcode.

---

### Scenario 3 — Lead to assigned follow-up (Establishment)

**Story:** Chioma responded at the altar. Assign a worker and advance a stage.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 3.1 | Capture **OC-5** in Outreach if needed | Outreach | ☐ | |
| 3.2 | Open Establishment → find Chioma | Establishment | ☐ | |
| 3.3 | Assign follow-up worker | Establishment | ☐ | |
| 3.4 | Advance stage; fill what was done / next steps | Establishment | ☐ | |
| 3.5 | (Manager) Check Stage audit | Establishment | ☐ | |

---

### Scenario 4 — Worker vs manager view (Establishment)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 4.1 | Admin/Pastor — pipeline + directory tools | Establishment | ☐ | |
| 4.2 | (Optional) Worker — own cards only | Establishment | ☐ | |
| 4.3 | Outreach is capture only, not full pipeline management | Both | ☐ | |

---

### Scenario 5 — Create and open a cell (Ministry/Cells)

**Story:** Plant **River of Life Cell** (CM-1).

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 5.1 | Open **Ministry/Cells** | Cells | ☐ | |
| 5.2 | Create branch with CM-1 details | Cells | ☐ | |
| 5.3 | Assign minister / deputies | Cells | ☐ | |
| 5.4 | Open cell → **Overview** (location, attendance, prayers) | Cells | ☐ | |

---

### Scenario 6 — Members in a cell (Ministry/Cells + privacy)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 6.1 | Cell → Members / directory | Cells | ☐ | |
| 6.2 | Add 1–2 members | Cells | ☐ | |
| 6.3 | Admin/Pastor — full contact fields | Cells | ☐ | |
| 6.4 | Cell Minister — **Restricted** on email/phone if applicable | Cells | ☐ | |

---

### Scenario 7 — Weekly attendance (Ministry/Cells)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 7.1 | River of Life → weekly attendance | Cells | ☐ | |
| 7.2 | Enter present count **12** | Cells | ☐ | |
| 7.3 | Overview shows updated last attendance | Cells | ☐ | |

---

### Scenario 8 — Second cell + analytics (Ministry/Cells)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 8.1 | Create **East Gate Connect** (CM-2) | Cells | ☐ | |
| 8.2 | Add members; log attendance **8** | Cells | ☐ | |
| 8.3 | **All Cells** — search/filter | Cells | ☐ | |
| 8.4 | **Performance Analytics** — date range, CSV/PDF if Admin/PL | Cells | ☐ | |

---

### Scenario 9 — End-to-end (all three modules)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 9.1 | Capture **OC-2 Liam Patel** | Outreach | ☐ | |
| 9.2 | Establishment assign + advance stage | Establishment | ☐ | |
| 9.3 | Ensure Liam as congregant/member | Establishment | ☐ | |
| 9.4 | Add to **East Gate Connect** | Cells | ☐ | |
| 9.5 | Record in weekly attendance | Cells | ☐ | |

---

### Scenario 10 — Prayer in a cell (Ministry/Cells)

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 10.1 | Open cell prayer / connect area | Cells | ☐ | |
| 10.2 | Create open prayer (fictional note only) | Cells | ☐ | |
| 10.3 | Overview shows open prayer count | Cells | ☐ | |

---

### Scenario 11 — Discipleship pipeline: nobody lost in the crowd (Establishment + Outreach)

**Mandate tie-in:** The Great Commission needs *visibility* — leaders see every soul on the journey, not only Sunday counts.

**Story:** Pastor reviews Sunday’s intake. **OC-4 Noah Williams** was captured in Outreach yesterday; other contacts sit before “Contacted”. You use Establishment as the command centre.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 11.1 | Capture **OC-4** in Outreach (or Field) if not already present | Outreach | ☐ | |
| 11.2 | Open **Establishment** → tab **Membership Pipeline** | Establishment | ☐ | |
| 11.3 | Confirm pipeline shows **three journey phases** (Initial Outreach → Growing Engagement → Belonging & Discipleship) | Establishment | ☐ | |
| 11.4 | Use **stage chips** (e.g. New Contacts, Contacted, …) — note count on Noah’s stage | Establishment | ☐ | |
| 11.5 | Open Noah’s card → confirm stage **New Contacts** / NEW_LEAD | Establishment | ☐ | |
| 11.6 | (Manager) Open **Filters** → filter by assignee and captured date; confirm list updates | Establishment | ☐ | |
| 11.7 | Note hero stats if shown: **pending, overdue, due today, graduated** | Establishment | ☐ | |

**Learned:** Establishment turns scattered outreach into a stage-based discipleship board pastors can scan in minutes.

---

### Scenario 12 — Field evangelism handoff & worker accountability (Outreach → Establishment)

**Mandate tie-in:** Evangelism is team sport — capture in the field, establish in the church, with clear ownership.

**Story:** An evangelist uses **Field mode** at a crusade. Leadership assigns each new contact to a worker and expects progress within 72 hours.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 12.1 | Open **Outreach** → note stat tiles: total, **captured today**, welcome sent, QR/NFC scans | Outreach | ☐ | |
| 12.2 | (Optional) Expand **Evangelist QR** — confirm public capture link exists for your church | Outreach | ☐ | |
| 12.3 | Use **Field mode** (`/dashboard/outreach/field`) to capture **OC-1 Amara** or a new test name | Outreach | ☐ | |
| 12.4 | Return online; **Sync** queued captures if offline was used | Outreach | ☐ | |
| 12.5 | In **Establishment**, find the new lead in **New Contacts** | Establishment | ☐ | |
| 12.6 | (Manager) **Assign** a follow-up worker on the contact detail panel | Establishment | ☐ | |
| 12.7 | Sign in as **Establishment worker** (or simulate) → confirm **Worker dashboard**: assigned list, overdue focus | Establishment | ☐ | |
| 12.8 | Worker opens contact → **Advance to next stage** with “what was done” / “next steps” filled | Establishment | ☐ | |

**Learned:** Outreach feeds Establishment instantly; managers assign; workers own next actions — matching “go and make disciples” with disciplined follow-up.

---

### Scenario 13 — Nurture, document, and establish in membership (Establishment)

**Mandate tie-in:** Establishment is pastoral discipleship — remind, encourage, record care, and graduate visitors into belonging (cells, WSF, baptism track).

**Story:** **OC-2 Liam Patel** attended twice and joined a cell. Walk him through later pipeline stages and prepare membership linkage.

| Step | Action | Module | Pass? | Notes |
|------|--------|--------|-------|-------|
| 13.1 | In Establishment, open **Liam Patel** (capture via Outreach first if needed) | Both | ☐ | |
| 13.2 | Detail panel → **Reminders** → schedule a reminder (e.g. call before next service) | Establishment | ☐ | |
| 13.3 | Tab **Templates** → preview/send a follow-up message (email / WhatsApp / in-app per church setup) | Establishment | ☐ | |
| 13.4 | Advance stage toward **Joined Group** then **Enlisted for Baptism** (use your church’s labels) | Establishment | ☐ | |
| 13.5 | Tab **Pastoral notes** → add a short non-sensitive note; note confidentiality if Pastor-only | Establishment | ☐ | |
| 13.6 | (Manager) Tab **Stage audit** → confirm history of stage changes with timestamps | Establishment | ☐ | |
| 13.7 | Tab **Details** → **Membership** → **Create member** or **Link member**; open Membership if shown | Establishment | ☐ | |
| 13.8 | (Manager) Switch to **Calendar** view — see follow-ups/reminders on dates | Establishment | ☐ | |
| 13.9 | (Manager) **Contact Directory** → **Export PDF** (scoped list) for leadership review | Establishment | ☐ | |

**Learned:** Establishment supports the establish-and-root mandate: timed nurture, documented journey, audit for leaders, and hand-off to Membership for long-term belonging.

---

## Part C — Sign-off

| Area | Scenarios | # Pass | # Fail | Initials |
|------|-----------|--------|--------|----------|
| Outreach | 1, 2, 9, 11, 12 | | | |
| Establishment | 3, 4, 9, 11, 12, 13 | | | |
| Ministry/Cells | 5–8, 10, 9 | | | |

**Overall familiarity goal met?** ☐ Yes ☐ Partially ☐ No

**Comments / bugs:**

_______________________________________________

_______________________________________________

**Signed:** _________________ **Date:** __________

---

## Quick reference — roles

| Role | Best for |
|------|----------|
| Admin / Pastor | Full Establishment, Cells analytics, Field Access settings |
| Outreach worker | Capture + limited Establishment |
| Cell Minister / deputy | Single-cell Overview, members, attendance |
| Provincial Leader | Province attendance + scoped analytics |