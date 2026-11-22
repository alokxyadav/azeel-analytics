import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { COMPANY, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="22 October 2026">
      <p>These terms govern your use of {SITE_NAME}, provided by {COMPANY}. By creating an account you agree to them. This is a plain-language template; have it reviewed by a lawyer before launch.</p>
      <h2>Your account</h2>
      <p>You are responsible for your login details and for activity under your account. Provide accurate information and tell us promptly if you suspect unauthorized access.</p>
      <h2>Your data</h2>
      <p>You keep all rights to the files you upload. You give us permission to process them solely to provide the service to you. Only upload data you are allowed to use, and do not upload data you are not permitted to share with a service provider.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not upload malware, attempt to break or probe the service, or bypass its limits.</li>
        <li>Do not use the service to break the law or infringe the rights of others.</li>
        <li>Do not overload the service with automated requests.</li>
      </ul>
      <h2>Service and accuracy</h2>
      <p>Analysis, statistics and charts are generated automatically from your data and are provided as an aid to decision-making. Check important results before relying on them. The service is provided &ldquo;as is&rdquo; without warranties, and we may change or suspend features with reasonable notice where we can.</p>
      <h2>Limits and liability</h2>
      <p>Usage limits (file size, storage, request rates) apply. To the extent permitted by law, {COMPANY} is not liable for indirect or consequential losses arising from use of the service.</p>
      <h2>Ending your account</h2>
      <p>You can delete your account at any time from Profile. We may suspend accounts that breach these terms.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  );
}
