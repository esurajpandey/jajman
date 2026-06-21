import { useState } from 'react';
import { ChevronDown, Search, LifeBuoy } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { TextField } from '../../../components/ui/TextField';
import { faqEntries } from '../../../mock/faq';

export function HelpScreen() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const q = query.trim().toLowerCase();
  const results = q ? faqEntries.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) : faqEntries;

  return (
    <>
      <AppBar title="Help & support" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <label className="flex h-11 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm">
          <Search size={18} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search FAQs" placeholder="Search help…" className="w-full bg-transparent outline-none placeholder:text-muted" />
        </label>

        <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">No results — try contacting support below.</p>
          ) : (
            results.map((f) => (
              <div key={f.id} className="border-b border-border last:border-0">
                <button type="button" onClick={() => setOpenId(openId === f.id ? null : f.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
                  <span className="flex-1">{f.question}</span>
                  <ChevronDown size={16} className={`shrink-0 text-muted transition ${openId === f.id ? 'rotate-180' : ''}`} />
                </button>
                {openId === f.id && <p className="px-4 pb-3 text-sm text-muted">{f.answer}</p>}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-md bg-surface-2 p-4 text-center">
          <LifeBuoy size={24} className="mx-auto text-primary" />
          <p className="mt-1 text-sm font-medium">Still need help?</p>
          <Button className="mt-2" onClick={() => { setSubmitted(false); setTicketOpen(true); }}>Contact support</Button>
        </div>
      </div>

      <BottomSheet open={ticketOpen} onClose={() => setTicketOpen(false)} title="Contact support">
        {submitted ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium">Ticket #1234 created (demo)</p>
            <p className="mt-1 text-xs text-muted">Our team will get back to you shortly.</p>
            <Button className="mt-4" onClick={() => setTicketOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <TextField label="Subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div>
              <span className="mb-1 block text-sm font-medium">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" rows={4} className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
            </div>
            <Button disabled={!subject.trim() || !message.trim()} onClick={() => setSubmitted(true)}>Submit ticket</Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
