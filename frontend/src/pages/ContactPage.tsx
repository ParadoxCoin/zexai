import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, MessageSquare, Send, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send');
      }
      
      setSent(true);
      setSending(false);
    } catch {
      setError('Failed to send. Please email us directly at info@zexai.io');
      setSending(false);
    }
  };

  const contacts = [
    { icon: '📧', label: 'General Support', value: 'info@zexai.io', href: 'mailto:info@zexai.io' },
    { icon: '💰', label: 'Billing & Refunds', value: 'info@zexai.io', href: 'mailto:info@zexai.io' },
    { icon: '🔒', label: 'Privacy Requests', value: 'info@zexai.io', href: 'mailto:info@zexai.io' },
    { icon: '⚖️', label: 'Legal', value: 'info@zexai.io', href: 'mailto:info@zexai.io' },
  ];

  const socials = [
    { icon: '𝕏', label: 'Twitter / X', href: 'https://x.com/zexai_io' },
    { icon: '✈️', label: 'Telegram', href: 'https://t.me/ZexAi_Community' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Support</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
            <Mail className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[10px] uppercase tracking-widest font-black text-pink-400">ZexAi Studio</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Contact Us</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">We're here to help. Send us a message and we'll get back to you within 1–2 business days.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Contacts */}
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">Direct Contact</h2>
              <div className="space-y-4">
                {contacts.map((c) => (
                  <a key={c.label} href={c.href} className="flex items-center gap-3 group p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
                      <p className="text-sm text-purple-400 group-hover:text-purple-300 transition-colors">{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">Community</h2>
              <div className="space-y-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{s.label}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-3">Response Times</h2>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex justify-between"><span>General Support</span><span className="text-emerald-400">1–2 days</span></div>
                <div className="flex justify-between"><span>Billing Issues</span><span className="text-emerald-400">1 day</span></div>
                <div className="flex justify-between"><span>Technical Issues</span><span className="text-yellow-400">2–3 days</span></div>
                <div className="flex justify-between"><span>Legal Requests</span><span className="text-yellow-400">3–5 days</span></div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8">
              <h2 className="text-lg font-black text-white mb-6">Send a Message</h2>

              {sent ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-white mb-2">Message Sent!</h3>
                  <p className="text-gray-400 text-sm">We'll get back to you within 1–2 business days.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold transition-colors">
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Name <span className="text-pink-400">*</span></label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your name" required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email <span className="text-pink-400">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com" required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                    <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all">
                      <option value="" className="bg-gray-900">Select a topic...</option>
                      <option value="General Support" className="bg-gray-900">General Support</option>
                      <option value="Billing & Refund" className="bg-gray-900">Billing & Refund</option>
                      <option value="Technical Issue" className="bg-gray-900">Technical Issue</option>
                      <option value="Privacy Request" className="bg-gray-900">Privacy Request</option>
                      <option value="Partnership" className="bg-gray-900">Partnership / Business</option>
                      <option value="Other" className="bg-gray-900">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Message <span className="text-pink-400">*</span></label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your issue or question in detail..." rows={6} required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none" />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">⚠️ {error}</div>
                  )}

                  <button type="submit" disabled={sending}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-800 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20">
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
                  </button>

                  <p className="text-center text-xs text-gray-600">Or email us directly at <a href="mailto:info@zexai.io" className="text-purple-400 hover:text-purple-300">info@zexai.io</a></p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-10 text-center text-sm text-gray-600 flex flex-wrap gap-4 justify-center">
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/refund-policy" className="hover:text-gray-400 transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
