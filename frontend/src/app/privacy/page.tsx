import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { COMPANY, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="22 October 2026">
      <p>This policy explains what {SITE_NAME}, operated by {COMPANY}, collects and how it is used. It is a plain-language template; have it reviewed against the laws that apply to your business (for example GDPR or CCPA) before launch.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and a salted hash of your password (we never store the password itself), plus an optional profile picture and theme preference.</li>
        <li><strong>Files you upload:</strong> the CSV and Excel files you choose to analyze, and the statistics we calculate from them.</li>
        <li><strong>Messages you send us:</strong> contact-form messages (with your IP address, for abuse prevention) and newsletter sign-ups.</li>
        <li><strong>Technical logs:</strong> request time, path, status and IP address, used to keep the service secure and reliable.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run the service you asked for: signing you in, analyzing your files, generating your reports, replying to your messages and preventing abuse. We do not sell your data, and we do not use your files to train models or for advertising.</p>
      <h2>Cookies and storage</h2>
      <p>We use one essential cookie to keep you signed in (it is not readable by scripts on the page). Your light/dark preference is stored in your browser. We do not use advertising or analytics cookies.</p>
      <h2>Your files and your control</h2>
      <p>Files are visible only to your account. You can delete any file from the dashboard, delete all files from Settings, or delete your account from Profile; doing so permanently removes your account and uploaded files from our systems.</p>
      <h2>Security</h2>
      <p>Passwords are hashed, sessions use secure cookies, uploads are validated, and traffic should be served over HTTPS. No system is perfectly secure, so please use a strong, unique password.</p>
      <h2>Retention</h2>
      <p>Account data and files are kept until you delete them. Contact messages are kept for as long as needed to respond and keep records. Server logs are kept for a limited period.</p>
      <h2>Contact</h2>
      <p>Questions or requests about your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
