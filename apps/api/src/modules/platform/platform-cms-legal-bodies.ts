/** Church Hub–specific legal page HTML (platform CMS defaults). */

export const LEGAL_EFFECTIVE_DATE = '30 August 2026';
export const LEGAL_PLATFORM_URL = 'https://church-hub.online';
export const LEGAL_OPERATOR_NAME = 'Knight App Solutions Hub';
export const LEGAL_OPERATOR_ADDRESS =
  '[Registered business address — update in Platform Console → Legal & CMS before relying on this document]';

export const PRIVACY_POLICY_HTML = `<h1>Privacy Policy</h1>
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE_DATE}<br/>
<strong>Version:</strong> 1.0<br/>
<strong>Platform:</strong> Church Hub (<a href="${LEGAL_PLATFORM_URL}">${LEGAL_PLATFORM_URL}</a>)</p>

<h2>1. Introduction</h2>
<p>This Privacy Policy explains how <strong>${LEGAL_OPERATOR_NAME}</strong> ("<strong>Church Hub</strong>", "<strong>we</strong>", "<strong>us</strong>") collects, uses, stores, shares, and protects personal data when you use the Church Hub multi-tenant church community platform, including our website, progressive web application (PWA), APIs, and related services (collectively, the "<strong>Service</strong>").</p>
<p>Church Hub is designed for churches and ministries to manage membership, discipleship, outreach, communications, pastoral care, and related ministry operations in isolated church workspaces ("<strong>Tenants</strong>").</p>

<h2>2. Roles: who is responsible for your data</h2>
<p><strong>2.1 Platform operator (Church Hub).</strong> For account registration, billing contacts, platform support, security logs, cookie preferences, and SaaS-level analytics, Church Hub typically acts as <strong>data controller</strong>.</p>
<p><strong>2.2 Your church (Tenant).</strong> For congregational records entered by your church—membership profiles, attendance, pastoral notes, prayer requests, youth records, outreach contacts, devotional journals, and ministry communications—your church is typically the <strong>data controller</strong> and Church Hub acts as <strong>data processor</strong>, processing data on the church's documented instructions. Churches remain responsible for having a lawful basis to collect and use their members' data.</p>
<p><strong>2.3 You.</strong> If you use personal devotional tools (private journal, personal prayer lists, action points), you and/or your church may both have responsibilities depending on visibility settings you choose.</p>

<h2>3. Personal data we process</h2>
<h3>3.1 Account and authentication data</h3>
<ul>
<li>Name, email address, phone number, profile avatar</li>
<li>Authentication credentials (hashed passwords), session and refresh tokens</li>
<li>Magic-link and one-time sign-in tokens (where enabled)</li>
<li>Role assignments (platform operator, church administrator, staff, member)</li>
<li>Last login timestamps and password-change requirements</li>
</ul>

<h3>3.2 Church workspace (Tenant) data</h3>
<p>Depending on modules enabled for your church, we process data including:</p>
<ul>
<li><strong>Membership Directory:</strong> names, contact details, addresses, gender, date of birth, family relationships, membership status, roles, custom fields, classifications, onboarding progress, spiritual milestones (e.g. baptism records where recorded), attendance history</li>
<li><strong>Outreach &amp; Evangelism:</strong> prospect names, phone, email, capture notes, evangelist assignment, pipeline stage, optional GPS coordinates and photos where captured in the field, offline sync metadata, voice notes</li>
<li><strong>Follow-up &amp; Pastoral care:</strong> care notes, prayer requests, assignment to leaders, communication history</li>
<li><strong>Ministry Cells:</strong> cell membership, attendance submissions, branch/province structure, performance metrics</li>
<li><strong>Devotional Hub:</strong> reading plans, study progress, private or shared journal entries (including mood tags, scripture references, rich text, attachments, voice transcripts), prayer lists and items, prayer streaks, group study participation, AI-generated study artifacts (where configured), weekly review and challenge data</li>
<li><strong>Communications:</strong> announcements, celebration emails (birthdays/anniversaries), automation templates, in-app notifications, message metadata</li>
<li><strong>Youth, Business Community, Bus Ministry</strong> (where enabled): group/event participation, directory listings, ride/route data, driver location during active ministry operations</li>
<li><strong>Church public landing pages:</strong> church branding, published content, optional media uploads</li>
</ul>

<h3>3.3 Technical and security data</h3>
<ul>
<li>IP address, browser/user-agent, device type</li>
<li>Server and application logs (errors, access events, audit trails on sensitive actions)</li>
<li>Cookie and local storage preferences (see our <a href="/legal/cookie-policy">Cookie Policy</a>)</li>
<li>PWA push notification subscription endpoints and cryptographic keys (where you opt in to notifications)</li>
<li>Offline sync queue identifiers for outreach capture when connectivity is restored</li>
</ul>

<h3>3.4 Support and platform operations</h3>
<ul>
<li>Support messages and platform inbox threads (for platform operators)</li>
<li>Consent records (terms, privacy, cookies) including document version accepted</li>
<li>Data subject access and erasure request metadata (DSAR workflow)</li>
</ul>

<h2>4. How we use personal data</h2>
<p>We use personal data to:</p>
<ul>
<li>Provide, operate, maintain, and secure the Service</li>
<li>Authenticate users and enforce role-based access control and tenant isolation</li>
<li>Enable churches to administer membership, ministry modules, and communications</li>
<li>Send transactional messages (password reset, magic links, assigned follow-ups, queued emails/SMS/WhatsApp where configured)</li>
<li>Process offline outreach submissions and resolve sync conflicts</li>
<li>Generate church-scoped analytics and exportable reports (attendance, evangelism KPIs, membership demographics where enabled)</li>
<li>Record and demonstrate consent to legal documents</li>
<li>Respond to support requests and legal obligations</li>
<li>Detect abuse, fraud, and unauthorized access</li>
</ul>
<p>We do <strong>not</strong> sell personal data. We do not use congregational pastoral content to train public AI models.</p>

<h2>5. Lawful bases (UK GDPR / EEA)</h2>
<p>Depending on context, we rely on:</p>
<ul>
<li><strong>Contract:</strong> to provide the Service to account holders and authorized church staff</li>
<li><strong>Legitimate interests:</strong> security, fraud prevention, service improvement, internal SaaS analytics, tenant isolation—balanced against your rights</li>
<li><strong>Legal obligation:</strong> where required by applicable law</li>
<li><strong>Consent:</strong> where required (e.g. non-essential cookies, optional marketing communications, certain outreach photo/GPS capture where the church obtains consent)</li>
</ul>
<p>Churches must establish their own lawful basis for member/congregant data they enter.</p>

<h2>6. Tenant isolation and access controls</h2>
<p>Church Hub is a multi-tenant platform. Each church's data is logically separated by tenant identifier with role-based permissions. Platform operators access tenant data only for provisioning, support, security, or legal compliance, under controlled permissions—not for unrelated commercial exploitation.</p>

<h2>7. Sharing and subprocessors</h2>
<p>We may share personal data with:</p>
<ul>
<li><strong>Infrastructure providers</strong> hosting the application, database (PostgreSQL), cache (Redis), and file storage</li>
<li><strong>Email delivery providers</strong> (e.g. SMTP services) for transactional and church-initiated messages</li>
<li><strong>WhatsApp/messaging gateways</strong> where a church or the platform enables integrated messaging</li>
<li><strong>Professional advisers</strong> (legal, accounting) under confidentiality</li>
<li><strong>Authorities</strong> when required by law or to protect rights and safety</li>
</ul>
<p>Churches may export or communicate data to their own recipients through built-in communications features; that sharing is directed by the church.</p>

<h2>8. International transfers</h2>
<p>Your data may be processed in the country where our servers are located and where subprocessors operate. Where required, we implement appropriate safeguards (such as Standard Contractual Clauses) for transfers outside the UK/EEA.</p>

<h2>9. Retention</h2>
<ul>
<li><strong>Active accounts:</strong> retained while the church workspace or user account remains active</li>
<li><strong>After termination:</strong> tenant data may be deleted or returned per agreement, subject to backup cycles and legal retention requirements</li>
<li><strong>Security logs:</strong> retained for a limited period appropriate to security and compliance</li>
<li><strong>Consent records:</strong> retained to demonstrate compliance</li>
<li><strong>Anonymization:</strong> some records may be anonymized rather than deleted where full erasure would break audit integrity</li>
</ul>

<h2>10. Security measures</h2>
<p>We apply administrative, technical, and organizational measures including encryption in transit (HTTPS/TLS), hashed credentials, tenant-scoped queries, access logging on sensitive mutations, permission guards for platform vs church roles, and segregated production environments. No method of transmission or storage is 100% secure; churches should also protect credentials and assign least-privilege roles.</p>

<h2>11. Your rights</h2>
<p>Subject to applicable law, you may have the right to access, rectify, erase, restrict, object to processing, and data portability, and to withdraw consent where processing is consent-based.</p>
<p><strong>In-app tools:</strong></p>
<ul>
<li><strong>Settings → Privacy:</strong> export a copy of your platform account data</li>
<li><strong>Erasure requests:</strong> submit via in-app privacy controls; platform operators process DSARs via the Platform Privacy console</li>
<li><strong>Cookie preferences:</strong> manage via the footer link "Cookie preferences" or the consent banner</li>
</ul>
<p>For congregational records held by your church, contact your church administrators first; they control most membership and pastoral data. You may also contact us at <strong>privacy@church-hub.online</strong>.</p>

<h2>12. Children</h2>
<p>The Service may process youth ministry records under a church's direction. Churches are responsible for parental/guardian consent where required. We do not knowingly offer direct self-registration to children without church oversight.</p>

<h2>13. Automated processing</h2>
<p>Devotional Hub AI study tools may generate outlines or suggestions from topics you provide. Outputs are stored as artifacts in your church workspace. Where no external AI provider is configured, structured placeholder content may be used. AI outputs are ministry support tools, not professional counselling or legal advice.</p>

<h2>14. Changes to this policy</h2>
<p>We may update this policy. Material changes will be reflected by version number and published date on this page. Continued use after publication constitutes acknowledgment where permitted by law. Registration and cookie flows record the document version you accepted.</p>

<h2>15. Contact</h2>
<p><strong>Data protection contact:</strong> privacy@church-hub.online<br/>
<strong>Postal address:</strong> ${LEGAL_OPERATOR_ADDRESS}<br/>
<strong>Supervisory authority (UK):</strong> Information Commissioner's Office (ICO) — <a href="https://ico.org.uk">ico.org.uk</a></p>`;

export const TERMS_OF_SERVICE_HTML = `<h1>Terms of Use</h1>
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE_DATE}<br/>
<strong>Platform:</strong> Church Hub (<a href="${LEGAL_PLATFORM_URL}">${LEGAL_PLATFORM_URL}</a>)</p>

<h2>1. Agreement</h2>
<p>These Terms of Use ("<strong>Terms</strong>") govern access to and use of Church Hub, operated by <strong>${LEGAL_OPERATOR_NAME}</strong>. By registering a church workspace, creating a user account, installing the PWA, or otherwise using the Service, you agree to these Terms and our <a href="/legal/privacy-policy">Privacy Policy</a> and <a href="/legal/cookie-policy">Cookie Policy</a>.</p>
<p>If you use the Service on behalf of a church or organization, you represent that you have authority to bind that organization.</p>

<h2>2. The Service</h2>
<p>Church Hub provides cloud software for churches, including modules such as:</p>
<ul>
<li>Membership Directory and analytics</li>
<li>Outreach, evangelism capture (including offline sync), and follow-up pipelines</li>
<li>Ministry cells, attendance, and branch performance</li>
<li>Devotional Hub (plans, journal, prayer, groups, AI-assisted study tools)</li>
<li>Communications, celebrations, and automation templates</li>
<li>Youth, business community, and bus ministry features (where enabled)</li>
<li>Church public landing pages and PWA install experience</li>
<li>Platform administration, tenant provisioning, and support tooling</li>
</ul>
<p>Features vary by subscription/plan and module flags. We may add, modify, or retire features with reasonable notice where practicable.</p>

<h2>3. Accounts and eligibility</h2>
<ul>
<li>You must provide accurate registration information and keep it updated.</li>
<li>You are responsible for safeguarding credentials and all activity under your account.</li>
<li>Church administrators must assign roles according to least privilege and remove access promptly when staff leave.</li>
<li>Test/demo accounts may be disabled in production environments.</li>
</ul>

<h2>4. Church tenant responsibilities</h2>
<p>Each church workspace administrator is responsible for:</p>
<ul>
<li>Ensuring lawful collection and use of member, visitor, youth, and outreach data</li>
<li>Obtaining appropriate notices and consents from congregants</li>
<li>Content of messages sent through email, SMS, WhatsApp, or in-app channels</li>
<li>Accuracy of records entered into membership, pastoral, and operational modules</li>
<li>Compliance with safeguarding policies when storing youth or vulnerable persons' data</li>
</ul>

<h2>5. Acceptable use</h2>
<p>You must not:</p>
<ul>
<li>Violate applicable law or infringe intellectual property, privacy, or publicity rights</li>
<li>Upload malware, attempt unauthorized access, probe, or disrupt the Service</li>
<li>Use the Service to send spam, harassment, hate speech, or unlawful content</li>
<li>Scrape, reverse engineer, or resell the Service except as expressly permitted</li>
<li>Misrepresent identity or church affiliation</li>
<li>Circumvent tenant isolation, role-based access, or platform security controls</li>
</ul>
<p>We may investigate violations and suspend or terminate access to protect the platform and other tenants.</p>

<h2>6. User-generated and church content</h2>
<p>Churches retain ownership of content they upload (sermons, templates, member notes, landing page media). You grant Church Hub a limited license to host, process, back up, and transmit content solely to provide the Service.</p>
<p>Pastoral notes, prayer requests, and confidential fields must be handled according to your church policies. Church Hub provides access controls but cannot guarantee that misconfigured permissions will never expose data—administrators must configure roles correctly.</p>

<h2>7. Communications and integrations</h2>
<p>Where email, SMS, WhatsApp, or push notifications are enabled, you are responsible for recipient opt-in/opt-out compliance. Church Hub queues and delivers messages as a technical intermediary; message content and recipient lists are controlled by your church or platform operators (for SaaS notices).</p>

<h2>8. PWA and offline features</h2>
<p>The PWA may cache application assets and queue outreach submissions offline. You are responsible for device security on phones used for field capture. Uninstalling the PWA or clearing browser data may remove local queues not yet synced.</p>

<h2>9. AI-assisted features</h2>
<p>Devotional Hub AI tools generate draft study content from inputs you provide. Outputs are ministry aids only, not doctrinal authority, counselling, or legal advice. Churches should review AI-generated material before public use. Availability depends on configured providers; placeholder structured content may apply when no provider is configured.</p>

<h2>10. Availability and support</h2>
<p>We strive for high availability but do not guarantee uninterrupted access. Maintenance, third-party outages, or force majeure may cause downtime. Support channels are described in your plan or platform console.</p>

<h2>11. Fees and trials</h2>
<p>Paid plans, trials, and billing terms (if applicable) are specified at registration or in a separate order form. Failure to pay may result in suspension after notice.</p>

<h2>12. Data protection</h2>
<p>Our <a href="/legal/privacy-policy">Privacy Policy</a> describes data handling. Where Church Hub processes personal data on a church's behalf, the <a href="/legal/data-processing-addendum">Data Processing Addendum</a> applies between Church Hub and the church customer.</p>

<h2>13. Intellectual property</h2>
<p>Church Hub software, branding, documentation, and platform UI are owned by ${LEGAL_OPERATOR_NAME} or licensors. These Terms do not grant ownership—only a limited, non-exclusive, non-transferable license to use the Service during an active subscription.</p>

<h2>14. Termination</h2>
<ul>
<li>You may stop using the Service and request workspace closure via support.</li>
<li>We may suspend or terminate for breach, non-payment, legal requirement, or risk to the platform.</li>
<li>Upon termination, access ceases; data handling follows the Privacy Policy and DPA (export/deletion windows, backup retention).</li>
</ul>

<h2>15. Disclaimers</h2>
<p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. CHURCH HUB IS NOT A LEGAL, TAX, ACCOUNTING, OR PASTORAL COUNSELLING SERVICE.</p>

<h2>16. Limitation of liability</h2>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${LEGAL_OPERATOR_NAME} SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL. OUR AGGREGATE LIABILITY FOR CLAIMS ARISING FROM THE SERVICE IN ANY 12-MONTH PERIOD SHALL NOT EXCEED THE FEES PAID BY YOU FOR THE SERVICE IN THAT PERIOD (OR GBP £100 IF NO FEES APPLY), EXCEPT WHERE LIABILITY CANNOT BE EXCLUDED BY LAW.</p>

<h2>17. Indemnity</h2>
<p>You agree to indemnify Church Hub against claims arising from your breach of these Terms, unlawful church data processing, or content you submit—except to the extent caused by our gross negligence or wilful misconduct.</p>

<h2>18. Governing law</h2>
<p>These Terms are governed by the laws of <strong>England and Wales</strong>. Courts of England and Wales have exclusive jurisdiction, without prejudice to mandatory consumer protections where applicable.</p>

<h2>19. Changes</h2>
<p>We may update these Terms. We will publish the revised version on this page with a new effective date. Material changes may require renewed acceptance at login or registration. Version numbers are tracked in the platform CMS and consent records.</p>

<h2>20. Contact</h2>
<p><strong>Legal / support:</strong> legal@church-hub.online<br/>
<strong>Address:</strong> ${LEGAL_OPERATOR_ADDRESS}</p>`;

export const COOKIE_POLICY_HTML = `<h1>Cookie Policy</h1>
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE_DATE}<br/>
<strong>Platform:</strong> Church Hub (<a href="${LEGAL_PLATFORM_URL}">${LEGAL_PLATFORM_URL}</a>)</p>

<h2>1. Scope</h2>
<p>This Cookie Policy describes how Church Hub uses cookies, local storage, and similar browser technologies on our website and progressive web application (PWA). It should be read with our <a href="/legal/privacy-policy">Privacy Policy</a>.</p>

<h2>2. What technologies we use</h2>
<p>Church Hub uses:</p>
<ul>
<li><strong>HTTP cookies</strong> (where set by the browser for session or security purposes)</li>
<li><strong>Local storage</strong> keys including:
<ul>
<li><code>churchhub_cookie_consent_v1</code> — stores your cookie banner choice and timestamp</li>
<li><code>churchhub_analytics_allowed</code> — stores whether optional analytics consent was granted</li>
<li><code>church-hub-pwa-gate-v2</code> — remembers PWA install gate progress on supported mobile devices</li>
<li>Authentication tokens where the client stores session state for the PWA</li>
</ul>
</li>
<li><strong>Service worker cache</strong> — enables offline shell and outreach capture sync in supported modules</li>
<li><strong>Push notification keys</strong> — only if you subscribe to web push notifications</li>
</ul>

<h2>3. Categories</h2>
<h3>3.1 Strictly necessary (always active)</h3>
<p>Required to deliver the Service. Without these, login, security, tenant routing, and core navigation cannot function.</p>
<ul>
<li>Session/authentication state</li>
<li>CSRF and security protections</li>
<li>Load balancing and error recovery</li>
</ul>
<p><strong>Legal basis:</strong> legitimate interests / contract.</p>

<h3>3.2 Preferences</h3>
<ul>
<li>Cookie consent choice (<code>churchhub_cookie_consent_v1</code>)</li>
<li>UI preferences and PWA install gate state</li>
</ul>
<p><strong>Legal basis:</strong> legitimate interests; consent where required.</p>

<h3>3.3 Optional analytics</h3>
<p>Church Hub may use first-party product analytics to understand feature usage and improve reliability. These are <strong>not enabled</strong> unless you accept optional cookies via the banner ("Accept all"). The flag <code>churchhub_analytics_allowed</code> controls client-side gating. We do not deploy third-party advertising cookies on the core application.</p>
<p><strong>Legal basis:</strong> consent (UK/EU).</p>

<h3>3.4 Ministry functionality storage</h3>
<p>Outreach offline capture may temporarily store queued submissions in browser storage until sync completes. This is necessary for field evangelism where connectivity is limited.</p>

<h2>4. Cookie banner and your choices</h2>
<p>On first visit, a banner offers:</p>
<ul>
<li><strong>Accept all</strong> — necessary + optional analytics</li>
<li><strong>Essential only</strong> — necessary and preference storage only</li>
</ul>
<p>You may reopen choices anytime via <strong>Cookie preferences</strong> in the site footer. Choices are logged server-side where possible and linked to your account consent record when signed in.</p>

<h2>5. Third-party content</h2>
<p>Church public landing pages may embed media or links configured by each church. Third parties may set their own cookies if you interact with external content; those are governed by the third party's policies.</p>

<h2>6. Browser controls</h2>
<p>You can block or delete cookies via browser settings. Blocking strictly necessary storage will prevent login and PWA features. See <a href="https://www.aboutcookies.org">aboutcookies.org</a> for browser-specific guidance.</p>

<h2>7. Retention</h2>
<ul>
<li>Consent records: retained to demonstrate compliance</li>
<li>Session tokens: expire per security configuration or logout</li>
<li>Local storage keys: persist until cleared by you or the application</li>
</ul>

<h2>8. Updates</h2>
<p>We may update this policy when we add features affecting storage technologies. The version on this page applies from the effective date shown.</p>

<h2>9. Contact</h2>
<p>privacy@church-hub.online</p>`;

export const DATA_PROCESSING_ADDENDUM_HTML = `<h1>Data Processing Addendum (DPA)</h1>
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE_DATE}<br/>
<strong>Platform:</strong> Church Hub (<a href="${LEGAL_PLATFORM_URL}">${LEGAL_PLATFORM_URL}</a>)</p>

<h2>1. Parties and scope</h2>
<p>This Data Processing Addendum ("<strong>DPA</strong>") forms part of the agreement between <strong>${LEGAL_OPERATOR_NAME}</strong> ("<strong>Processor</strong>", trading as Church Hub) and the church or ministry customer ("<strong>Controller</strong>") for personal data processed in the Controller's Church Hub tenant.</p>
<p>It applies to membership records, pastoral notes, attendance, outreach contacts, devotional and prayer data, youth records, communications metadata, and other personal data the Controller enters or imports into Church Hub.</p>

<h2>2. Processor obligations</h2>
<p>Church Hub shall:</p>
<ul>
<li>Process personal data only on documented instructions from the Controller, including via configuration of the Service and these Terms</li>
<li>Ensure personnel with access are bound by confidentiality</li>
<li>Implement appropriate technical and organisational measures (tenant isolation, role-based access, encryption in transit, audit logging on sensitive mutations)</li>
<li>Assist the Controller with data subject requests where technically feasible, using in-app export and DSAR tooling</li>
<li>Notify the Controller without undue delay after becoming aware of a personal data breach affecting the tenant</li>
<li>Delete or return personal data at end of service, subject to legal retention and backup cycles</li>
<li>Make available information necessary to demonstrate compliance with this DPA</li>
</ul>

<h2>3. Subprocessors</h2>
<p>The Controller authorises Church Hub to engage subprocessors for hosting, database, cache, email delivery, messaging gateways, and file storage. Church Hub remains responsible for subprocessors' performance of data protection obligations.</p>

<h2>4. International transfers</h2>
<p>Where personal data is transferred outside the UK/EEA, Church Hub shall ensure appropriate safeguards (such as Standard Contractual Clauses) are in place where required by law.</p>

<h2>5. Controller obligations</h2>
<p>The Controller shall:</p>
<ul>
<li>Ensure a lawful basis exists for all personal data processed in Church Hub</li>
<li>Provide privacy notices to data subjects as required</li>
<li>Configure roles and permissions appropriately within the tenant</li>
<li>Not instruct Church Hub to process data in violation of applicable law</li>
</ul>

<h2>6. Security incidents</h2>
<p>Church Hub will provide reasonable assistance to the Controller in investigating and mitigating security incidents affecting tenant data, consistent with the Privacy Policy and support procedures.</p>

<h2>7. Term</h2>
<p>This DPA remains in effect for the duration of the Controller's use of Church Hub and survives termination until personal data is deleted or returned in accordance with the Privacy Policy.</p>

<h2>8. Contact</h2>
<p><strong>Processor contact:</strong> privacy@church-hub.online<br/>
<strong>Address:</strong> ${LEGAL_OPERATOR_ADDRESS}</p>`;
