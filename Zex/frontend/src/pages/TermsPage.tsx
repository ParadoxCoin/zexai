import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, FileText } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full inline-block" />
      {title}
    </h2>
    <div className="text-gray-400 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function TermsPage() {
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
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Legal</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] uppercase tracking-widest font-black text-purple-400">ZexAi Studio</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: May 18, 2026 · Effective immediately</p>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 md:p-12">

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using ZexAi Studio ("Service", "Platform") at <strong className="text-white">app.zexai.io</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Service.</p>
            <p>These terms apply to all visitors, users, and others who access or use the Service. ZexAi is operated by the ZexAi team ("we", "us", or "our").</p>
          </Section>

          <Section title="2. Description of Service">
            <p>ZexAi Studio is an AI-powered creative platform that provides:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Text-to-Image generation (FLUX, Ideogram, GPT-4o, Imagen 4, Seedream, etc.)</li>
              <li>Text-to-Video and Image-to-Video generation (Veo, Sora, Kling, Runway, Wan)</li>
              <li>Text-to-Speech and Music generation (ElevenLabs, Suno AI)</li>
              <li>AI Chat capabilities (multiple LLM providers)</li>
              <li>NFT minting and digital asset management</li>
              <li>ZEX token staking and reward mechanisms</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>To access certain features of our Service, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Provide accurate, current, and complete registration information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized account access</li>
              <li>Take responsibility for all activities that occur under your account</li>
            </ul>
            <p>We reserve the right to terminate accounts that violate these terms, at our sole discretion.</p>
          </Section>

          <Section title="4. Credits and Payments">
            <p>ZexAi Studio uses a credit-based system (ZEX Credits) to access AI generation features. By purchasing credits, you acknowledge:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Payments are processed securely through LemonSqueezy</li>
              <li>Credits are non-transferable and non-refundable except as described in our Refund Policy</li>
              <li>Credits do not expire but may be subject to future policy changes with advance notice</li>
              <li>Pricing is subject to change with reasonable notice to existing users</li>
              <li>All prices are listed in USD unless otherwise stated</li>
            </ul>
          </Section>

          <Section title="5. Acceptable Use Policy">
            <p>You agree NOT to use the Service to generate content that:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Is illegal, harmful, threatening, abusive, or harassing</li>
              <li>Depicts or promotes violence, self-harm, or illegal activities</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains sexually explicit material involving minors</li>
              <li>Spreads disinformation or impersonates real individuals maliciously</li>
              <li>Is used for automated abuse, spam, or scraping of our systems</li>
            </ul>
            <p>Violation of these policies may result in immediate account termination without refund.</p>
          </Section>

          <Section title="6. Intellectual Property">
            <p><strong className="text-white">Your Content:</strong> You retain ownership of the content you create using our Service, subject to the licenses you grant to providers through our platform.</p>
            <p><strong className="text-white">Our Content:</strong> The ZexAi platform, including its design, code, logos, and documentation, is owned by ZexAi and protected by intellectual property laws.</p>
            <p><strong className="text-white">AI-Generated Content:</strong> The intellectual property rights of AI-generated content may vary by jurisdiction. You assume all responsibility for commercial use of generated content.</p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>Our Service integrates with third-party AI providers including but not limited to: Google (Veo, Imagen, Gemini), OpenAI (GPT-4o, Sora, DALL-E), ElevenLabs, Suno AI, Kling AI, Runway ML, and others via our custom secure API routing. Your use of these integrated services is subject to their respective terms of service.</p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that AI-generated outputs will meet your specific requirements.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by law, ZexAi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service, even if we have been advised of the possibility of such damages.</p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes by updating the "Last updated" date and, where appropriate, via email notification. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </Section>

          <Section title="11. Contact Information">
            <p>For questions about these Terms of Service, please contact us:</p>
            <p>Email: <a href="mailto:info@zexai.io" className="text-purple-400 hover:text-purple-300">info@zexai.io</a></p>
            <p>Website: <a href="https://app.zexai.io/contact" className="text-purple-400 hover:text-purple-300">app.zexai.io/contact</a></p>
          </Section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-600 flex flex-wrap gap-4 justify-center">
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/refund-policy" className="hover:text-gray-400 transition-colors">Refund Policy</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
}
