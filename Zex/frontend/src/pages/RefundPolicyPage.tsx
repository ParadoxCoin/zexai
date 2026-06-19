import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Coins } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full inline-block" />
      {title}
    </h2>
    <div className="text-gray-400 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Legal</span>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400">ZexAi Studio</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Refund Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: May 18, 2026 · Effective immediately</p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 md:p-12">
          <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 text-sm mb-8">
            <strong>30-Day Satisfaction Guarantee:</strong> If you are not satisfied with your purchase, you may request a full refund within 30 days of purchase, subject to the conditions below.
          </div>

          <Section title="1. Overview">
            <p>ZexAi Studio processes payments through <strong className="text-white">LemonSqueezy</strong> as our Merchant of Record. LemonSqueezy handles all payment processing, tax collection, and refund fulfillment on our behalf.</p>
          </Section>

          <Section title="2. Eligible Refund Scenarios">
            <p>You are eligible for a full refund if:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Request within <strong className="text-white">30 days</strong> of the original purchase</li>
              <li>Less than <strong className="text-white">20%</strong> of allocated platform resources consumed</li>
              <li>Significant technical issues prevented proper use of the Service</li>
              <li>Duplicate or incorrect charges occurred</li>
              <li>The Service was unavailable for more than 24 consecutive hours</li>
            </ul>
          </Section>

          <Section title="3. Non-Refundable Scenarios">
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>More than 30 days have passed since the purchase</li>
              <li>More than 20% of allocated platform resources have been consumed</li>
              <li>Account terminated due to Terms of Service violation</li>
              <li>Dissatisfaction with AI-generated content quality (outputs are non-deterministic)</li>
              <li>Resources used for technically successful completed generations or operations</li>
            </ul>
          </Section>

          <Section title="4. How to Request a Refund">
            <p>Contact us via:</p>
            <div className="bg-white/5 rounded-2xl p-4 space-y-2 my-3">
              <p>📧 Email: <a href="mailto:info@zexai.io" className="text-emerald-400 hover:text-emerald-300">info@zexai.io</a></p>
              <p>🌐 Contact Form: <Link to="/contact" className="text-emerald-400 hover:text-emerald-300">app.zexai.io/contact</Link></p>
            </div>
            <p>Include: your registered email, order/transaction ID, purchase date, and reason for refund.</p>
          </Section>

          <Section title="5. Processing Time">
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-white">Credit/Debit Card:</strong> 5–10 business days</li>
              <li><strong className="text-white">PayPal:</strong> 3–5 business days</li>
              <li><strong className="text-white">Other methods:</strong> Up to 14 business days</li>
            </ul>
          </Section>

          <Section title="6. Disputes">
            <p>If unsatisfied with our decision, you may initiate a dispute through LemonSqueezy or your payment provider. We encourage contacting us first — we are committed to resolving issues fairly.</p>
          </Section>

          <Section title="7. Contact">
            <p>Email: <a href="mailto:info@zexai.io" className="text-emerald-400 hover:text-emerald-300">info@zexai.io</a> · Response within 1–2 business days</p>
          </Section>
        </div>
        <div className="mt-8 text-center text-sm text-gray-600 flex flex-wrap gap-4 justify-center">
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
}
