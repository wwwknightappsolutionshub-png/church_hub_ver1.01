import {
  PlatformCmsPageKind,
  PlatformCmsPageStatus,
} from '@prisma/client';

export type DefaultCmsPage = {
  slug: string;
  title: string;
  summary: string;
  kind: PlatformCmsPageKind;
  htmlBody: string;
};

export const DEFAULT_CMS_PAGES: DefaultCmsPage[] = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    summary: 'How Church Hub collects, uses, and protects personal data.',
    kind: PlatformCmsPageKind.PRIVACY,
    htmlBody: `<h2>Privacy Policy</h2>
<p><em>Last updated: replace this draft with your counsel-approved text before publishing.</em></p>
<p>Church Hub ("we", "us") provides church management software as a multi-tenant SaaS platform. This policy explains what personal data we process, why, and the rights available to you.</p>
<h3>Who we are</h3>
<p>Church Hub is the data controller for platform account data (signup, billing contacts, support). Each church tenant is typically the controller for their congregation membership and pastoral records; we act as processor for that tenant data under their instructions.</p>
<h3>Data we process</h3>
<ul>
<li>Account identity: name, email, phone, authentication credentials</li>
<li>Church workspace metadata and staff roles</li>
<li>Membership and ministry records entered by your church</li>
<li>Technical logs: IP address, device/browser, cookie preferences</li>
<li>Communications you send through the platform (email, in-app messages)</li>
</ul>
<h3>Lawful bases</h3>
<p>We process data to perform our contract with you, to meet legitimate interests in securing and improving the service, and where required by law. Where consent is needed (e.g. optional marketing), we record it and you may withdraw it.</p>
<h3>Your rights</h3>
<p>Depending on your location, you may have rights to access, rectify, erase, restrict, or port your personal data, and to object to certain processing. Use in-app Privacy controls or contact support to exercise these rights.</p>
<h3>Retention &amp; security</h3>
<p>We retain data while your account is active and for limited periods afterward as needed for legal, security, and backup purposes. We apply access controls, encryption in transit, and tenant isolation.</p>
<p>Contact: replace with your privacy contact email.</p>`,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    summary: 'Terms governing use of the Church Hub platform.',
    kind: PlatformCmsPageKind.TERMS,
    htmlBody: `<h2>Terms of Service</h2>
<p><em>Draft — have legal counsel review before publishing.</em></p>
<p>By creating a Church Hub workspace or using the service, you agree to these Terms.</p>
<h3>The service</h3>
<p>Church Hub provides software tools for church administration, membership, communications, and related modules. Features may change as we improve the product.</p>
<h3>Accounts &amp; tenants</h3>
<p>You are responsible for safeguarding login credentials and for activity under your church workspace. Administrators must ensure users have appropriate permission to access congregational data.</p>
<h3>Acceptable use</h3>
<p>You may not misuse the platform, attempt unauthorized access, send unlawful content, or infringe others' rights. We may suspend accounts that violate these Terms.</p>
<h3>Data</h3>
<p>Your church remains responsible for the lawfulness of membership and pastoral data you store. Our Privacy Policy describes how platform-level data is handled.</p>
<h3>Liability</h3>
<p>Replace this section with your standard limitation of liability and governing law clauses.</p>`,
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    summary: 'Cookies and similar technologies used by Church Hub.',
    kind: PlatformCmsPageKind.COOKIE,
    htmlBody: `<h2>Cookie Policy</h2>
<p><em>Draft — update before publishing.</em></p>
<p>We use cookies and similar technologies to run the site, keep you signed in, remember preferences (including cookie consent), and understand product usage.</p>
<h3>Essential</h3>
<p>Required for authentication, security, and core navigation. These cannot be disabled while using the app.</p>
<h3>Preferences</h3>
<p>Remember choices such as cookie consent and theme.</p>
<h3>Analytics (optional)</h3>
<p>If enabled, help us understand feature usage. You can decline non-essential cookies via the consent banner.</p>
<p>For more detail see our <a href="/legal/privacy-policy">Privacy Policy</a>.</p>`,
  },
  {
    slug: 'data-processing-addendum',
    title: 'Data Processing Addendum',
    summary: 'Processor terms for church tenant personal data.',
    kind: PlatformCmsPageKind.DPA,
    htmlBody: `<h2>Data Processing Addendum (DPA)</h2>
<p><em>Draft — execute a counsel-approved DPA with customers as needed.</em></p>
<p>This DPA forms part of the agreement between Church Hub (Processor) and the church customer (Controller) for personal data processed in the customer's tenant.</p>
<h3>Scope</h3>
<p>Membership records, pastoral notes, attendance, communications metadata, and other data the customer enters or imports into Church Hub.</p>
<h3>Obligations</h3>
<ul>
<li>Process data only on documented instructions from the Controller</li>
<li>Ensure confidentiality of personnel with access</li>
<li>Implement appropriate technical and organisational security measures</li>
<li>Assist with data subject requests and breach notification as required</li>
<li>Delete or return personal data at end of service, subject to legal retention</li>
</ul>
<p>Replace with your full DPA including subprocessors and international transfer clauses.</p>`,
  },
];

export const CMS_STATUS = PlatformCmsPageStatus;
export const CMS_KIND = PlatformCmsPageKind;
