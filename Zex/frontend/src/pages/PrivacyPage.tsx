import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Eye } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full inline-block" />
      {title}
    </h2>
    <div className="text-gray-400 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Legal</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-widest font-black text-cyan-400">ZexAi Studio</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: May 18, 2026 · Effective immediately</p>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 md:p-12">

          <Section title="1. Introduction">
            <p>ZexAi Studio ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at <strong className="text-white">app.zexai.io</strong>.</p>
            <p>Please read this policy carefully. By using ZexAi Studio, you consent to the practices described in this Privacy Policy.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-white">Account Information:</strong> When you register, we collect your email address, name, and optionally your profile picture. If you sign in via social providers (Google, GitHub, Discord), we receive basic profile information from those services.</p>
            <p><strong className="text-white">Usage Data:</strong> We automatically collect information about how you interact with our Service, including pages visited, features used, generation history, and session duration.</p>
            <p><strong className="text-white">Payment Information:</strong> Payments are processed by LemonSqueezy. We do not store your credit card details. We receive only transaction confirmation and associated order information.</p>
            <p><strong className="text-white">Generated Content:</strong> AI-generated outputs (images, videos, audio) may be stored temporarily to enable download and sharing features.</p>
            <p><strong className="text-white">Device & Technical Data:</strong> IP address, browser type, operating system, and device identifiers for security and analytics purposes.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and manage your credit balance</li>
              <li>Send important service notifications and updates</li>
              <li>Detect, investigate, and prevent fraudulent or abusive activity</li>
              <li>Analyze usage patterns to improve features and performance</li>
              <li>Comply with legal obligations</li>
              <li>Respond to your support requests</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing and Disclosure">
            <p>We do not sell your personal data. We may share your information with:</p>
            <p><strong className="text-white">AI Service Providers:</strong> Your prompts and inputs are sent to third-party AI providers (via our secure API and direct integrations) solely to generate the requested content. These providers have their own privacy policies.</p>
            <p><strong className="text-white">Payment Processor:</strong> LemonSqueezy processes payments on our behalf and handles payment data under their own privacy policy.</p>
            <p><strong className="text-white">Infrastructure:</strong> Supabase (database/auth), Cloudflare (CDN/security), and similar providers necessary for operation.</p>
            <p><strong className="text-white">Legal Requirements:</strong> If required by law, court order, or governmental authority.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your account information for as long as your account is active. Generated content is retained for a limited period (typically 30 days) unless explicitly saved by you. You may request deletion of your data at any time.</p>
          </Section>

          <Section title="6. Cookies and Tracking">
            <p>We use essential cookies for authentication and session management. We also use analytics cookies to understand how users interact with our platform. You can control cookie preferences through your browser settings, though disabling essential cookies may affect Service functionality.</p>
          </Section>

          <Section title="7. Your Rights (GDPR/CCPA)">
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-white">Correction:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
              <li><strong className="text-white">Portability:</strong> Receive your data in a portable format</li>
              <li><strong className="text-white">Objection:</strong> Object to certain types of processing</li>
              <li><strong className="text-white">Opt-out:</strong> Opt out of marketing communications at any time</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:info@zexai.io" className="text-cyan-400 hover:text-cyan-300">info@zexai.io</a>.</p>
          </Section>

          <Section title="8. Data Security">
            <p>We implement industry-standard security measures including encrypted connections (TLS/SSL), hashed passwords, row-level security in our database, and regular security audits. However, no method of transmission or storage is 100% secure.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>ZexAi Studio is not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>For questions about this Privacy Policy or our privacy practices:</p>
            <p>Email: <a href="mailto:info@zexai.io" className="text-cyan-400 hover:text-cyan-300">info@zexai.io</a></p>
            <p>Website: <a href="https://app.zexai.io/contact" className="text-cyan-400 hover:text-cyan-300">app.zexai.io/contact</a></p>
          </Section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-600 flex flex-wrap gap-4 justify-center">
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/refund-policy" className="hover:text-gray-400 transition-colors">Refund Policy</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
}
