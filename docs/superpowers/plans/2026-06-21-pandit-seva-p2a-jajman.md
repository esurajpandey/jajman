# Pandit Seva — Phase 2a (Jajman: Chat, Favorites, Add-Address) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. **Git: commit LOCALLY only — NEVER `git push`/`git remote`/`git branch -M`/`git checkout <other>`. The user pushes manually. No push-blocking guards.**

**Goal:** Add the booking-adjacent Jajman secondary features: **in-app chat** (conversations list + thread with phone-visibility control + mock attachments, reachable from a booking's "Message" CTA), the **Favorites** tab (saved pandits + quick rebook + unfavorite), and **add-address** (an inline sheet in the booking flow backed by real address CRUD). The standalone address-management list/edit screens + Profile entry land in P2b.

**Architecture:** A new `chatStore` (threads keyed by booking, messages embedded). `bookingStore` gains address CRUD. Chat opens by `threadId` (§0.1); the booking detail "Message" CTA resolves/creates the booking's thread then routes to `/app/chat/:threadId`. Favorites reuse the existing `dataStore` `getFavorites`/`toggleFavorite`. Add-address is a `BottomSheet` over the booking flow (so the in-progress draft is preserved) — the booking flow's `startDraft` is made idempotent so returning to it doesn't wipe the draft.

**Tech Stack:** existing (React 18 + TS + Tailwind + zustand + react-router-dom 6 + lucide-react + dayjs + nanoid). Tests: Vitest + RTL.

**Builds on:** P0–P1d (on `main`). Reuse `Button`, `Card`, `Badge`, `Avatar`, `AppBar`, `BackButton`, `TextField`, `BottomSheet`, `SegmentedControl`, `PanditCard`, `cn`, `useDataStore`, `useBookingStore`, `useSessionStore`, `AppLayout`, `AppPlainLayout`. Reference spec §0.1 (chat by threadId), §0.9 (per-booking phone visibility), §15 (chat after booking).

**Working directory:** paths relative to `pandit-seva-app/` (branch `p2a-jajman`).

---

### Task 1: Chat store + address CRUD

**Files:**
- Modify: `src/mock/types.ts`
- Modify: `src/mock/seed.ts`
- Create: `src/store/chatStore.ts`
- Test: `src/store/chatStore.test.ts`
- Modify: `src/store/bookingStore.ts`
- Modify: `src/store/bookingStore.test.ts`

- [ ] **Step 1: Add chat types to `src/mock/types.ts`**

```ts
export interface ChatMessage {
  id: string;
  senderId: string; // 'me' for the jajman, or the pandit's id
  text: string;
  sentAt: string; // ISO
  attachmentName?: string;
}
export interface ChatThread {
  id: string;
  bookingId: string;
  panditId: string;
  phoneShared: boolean; // §0.9 per-booking override
  messages: ChatMessage[];
}
```

- [ ] **Step 2: Add `seedThreads` to `src/mock/seed.ts`**

```ts
import type { ChatThread } from './types';
export const seedThreads: ChatThread[] = [
  { id: 'thr-1', bookingId: 'bkg-demo-2', panditId: 'pnd-1', phoneShared: false, messages: [
    { id: 'm1', senderId: 'pnd-1', text: 'Namaste 🙏 I have accepted your Satyanarayan Katha booking.', sentAt: '2026-06-18T10:00:00.000Z' },
    { id: 'm2', senderId: 'me', text: 'Thank you, Pandit ji. Looking forward to it.', sentAt: '2026-06-18T10:05:00.000Z' },
  ] },
  { id: 'thr-2', bookingId: 'bkg-demo-1', panditId: 'pnd-2', phoneShared: true, messages: [
    { id: 'm3', senderId: 'me', text: 'Could you please bring the samagri?', sentAt: '2026-06-09T09:00:00.000Z' },
    { id: 'm4', senderId: 'pnd-2', text: 'Yes, everything is arranged.', sentAt: '2026-06-09T09:10:00.000Z' },
  ] },
];
```

- [ ] **Step 3: Write the failing test** — `src/store/chatStore.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

beforeEach(() => useChatStore.setState(useChatStore.getInitialState()));

describe('chatStore', () => {
  it('seeds threads and resolves by id and booking', () => {
    const s = useChatStore.getState();
    expect(s.threads.length).toBeGreaterThan(0);
    expect(s.getThread('thr-1')?.bookingId).toBe('bkg-demo-2');
    expect(s.getThreadForBooking('bkg-demo-1')?.id).toBe('thr-2');
  });

  it('ensureThreadForBooking returns the existing thread or creates one', () => {
    const existing = useChatStore.getState().ensureThreadForBooking('bkg-demo-1', 'pnd-2');
    expect(existing.id).toBe('thr-2');
    const created = useChatStore.getState().ensureThreadForBooking('bkg-new', 'pnd-3');
    expect(created.bookingId).toBe('bkg-new');
    expect(useChatStore.getState().getThread(created.id)).toBeTruthy();
  });

  it('sendMessage appends a message', () => {
    const before = useChatStore.getState().getThread('thr-1')!.messages.length;
    useChatStore.getState().sendMessage('thr-1', 'me', 'See you then!');
    expect(useChatStore.getState().getThread('thr-1')!.messages.length).toBe(before + 1);
    expect(useChatStore.getState().getThread('thr-1')!.messages.at(-1)?.text).toBe('See you then!');
  });

  it('togglePhoneShared flips the flag', () => {
    const before = useChatStore.getState().getThread('thr-1')!.phoneShared;
    useChatStore.getState().togglePhoneShared('thr-1');
    expect(useChatStore.getState().getThread('thr-1')!.phoneShared).toBe(!before);
  });
});
```

- [ ] **Step 4: Run to verify it fails** — `npm test -- chatStore` → FAIL (no module).

- [ ] **Step 5: Implement `src/store/chatStore.ts`**

```ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ChatThread } from '../mock/types';
import { seedThreads } from './../mock/seed';

interface ChatState {
  threads: ChatThread[];
  getThread: (id: string) => ChatThread | undefined;
  getThreadForBooking: (bookingId: string) => ChatThread | undefined;
  ensureThreadForBooking: (bookingId: string, panditId: string) => ChatThread;
  sendMessage: (threadId: string, senderId: string, text: string, attachmentName?: string) => void;
  togglePhoneShared: (threadId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: seedThreads,
  getThread: (id) => get().threads.find((t) => t.id === id),
  getThreadForBooking: (bookingId) => get().threads.find((t) => t.bookingId === bookingId),
  ensureThreadForBooking: (bookingId, panditId) => {
    const existing = get().getThreadForBooking(bookingId);
    if (existing) return existing;
    const thread: ChatThread = { id: `thr-${nanoid(6)}`, bookingId, panditId, phoneShared: false, messages: [] };
    set((s) => ({ threads: [thread, ...s.threads] }));
    return thread;
  },
  sendMessage: (threadId, senderId, text, attachmentName) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, messages: [...t.messages, { id: `m-${nanoid(6)}`, senderId, text, sentAt: new Date().toISOString(), attachmentName }] }
          : t,
      ),
    })),
  togglePhoneShared: (threadId) =>
    set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, phoneShared: !t.phoneShared } : t)) })),
}));
```

- [ ] **Step 6: Run to verify it passes** — `npm test -- chatStore` → PASS.

- [ ] **Step 7: Add address CRUD to `src/store/bookingStore.ts`** — extend the interface + store. Add to interface:

```ts
  addAddress: (addr: Omit<Address, 'id'>) => Address;
  updateAddress: (id: string, patch: Partial<Omit<Address, 'id'>>) => void;
  deleteAddress: (id: string) => void;
```

Add to the store object:

```ts
  addAddress: (addr) => {
    const created: Address = { ...addr, id: `addr-${nanoid(6)}` };
    set((s) => ({ addresses: [...s.addresses, created] }));
    return created;
  },
  updateAddress: (id, patch) => set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  deleteAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),
```

(`Address` and `nanoid` are already imported in bookingStore.)

- [ ] **Step 8: Add a bookingStore test** — in `src/store/bookingStore.test.ts`:

```ts
  it('addAddress / updateAddress / deleteAddress mutate the address list', () => {
    const created = useBookingStore.getState().addAddress({ label: 'Office', type: 'custom', line: '5 MG Rd', city: 'Pune' });
    expect(useBookingStore.getState().getAddress(created.id)?.label).toBe('Office');
    useBookingStore.getState().updateAddress(created.id, { label: 'Work' });
    expect(useBookingStore.getState().getAddress(created.id)?.label).toBe('Work');
    useBookingStore.getState().deleteAddress(created.id);
    expect(useBookingStore.getState().getAddress(created.id)).toBeUndefined();
  });
```

- [ ] **Step 9: Run all tests + typecheck** — `npm test` (all pass), `npm run typecheck` (clean).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: chat store (threads/messages, phone-visibility) + booking address CRUD"
```

---

### Task 2: Chat + address components

**Files:**
- Create: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/ChatComposer.tsx`
- Create: `src/components/chat/ConversationRow.tsx`
- Create: `src/components/booking/AddressForm.tsx`
- Test: `src/components/chat/chat-components.test.tsx`

- [ ] **Step 1: Create `src/components/chat/MessageBubble.tsx`**

```tsx
import dayjs from 'dayjs';
import { Paperclip } from 'lucide-react';
import type { ChatMessage } from '../../mock/types';
import { cn } from '../../lib/cn';

export function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-text')}>
        {message.attachmentName && (
          <span className="mb-1 flex items-center gap-1 text-xs opacity-80"><Paperclip size={12} />{message.attachmentName}</span>
        )}
        <p>{message.text}</p>
        <span className={cn('mt-0.5 block text-[10px]', mine ? 'text-primary-fg/70' : 'text-muted')}>{dayjs(message.sentAt).format('h:mm A')}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/chat/ChatComposer.tsx`**

```tsx
import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

export function ChatComposer({ onSend, onAttach }: { onSend: (text: string) => void; onAttach: () => void }) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface p-2">
      <button type="button" onClick={onAttach} aria-label="Attach" className="p-2 text-muted"><Paperclip size={20} /></button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        placeholder="Message…"
        aria-label="Message"
        className="h-10 flex-1 rounded-full bg-surface-2 px-4 text-sm outline-none"
      />
      <button type="button" onClick={send} aria-label="Send" disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-fg disabled:opacity-40">
        <Send size={18} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/chat/ConversationRow.tsx`**

```tsx
import type { ChatThread } from '../../mock/types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useDataStore } from '../../store/dataStore';

export function ConversationRow({ thread, onClick }: { thread: ChatThread; onClick: () => void }) {
  const pandit = useDataStore((s) => s.getPandit(thread.panditId));
  const last = thread.messages.at(-1);
  return (
    <Card role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`Chat with ${pandit?.name ?? 'pandit'}`} className="flex cursor-pointer items-center gap-3 p-3">
      <Avatar name={pandit?.name ?? '?'} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pandit?.name}</p>
        <p className="truncate text-xs text-muted">{last ? last.text : 'No messages yet'}</p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/booking/AddressForm.tsx`** (reused by the booking sheet now and the P2b address screen later)

```tsx
import { useState } from 'react';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import type { Address, AddressType } from '../../mock/types';

const TYPES: { value: AddressType; label: string }[] = [
  { value: 'home', label: 'Home' }, { value: 'parents', label: 'Parents' }, { value: 'relative', label: 'Relative' },
  { value: 'temple', label: 'Temple' }, { value: 'custom', label: 'Custom' },
];

export function AddressForm({ initial, onSave, submitLabel = 'Save address' }: { initial?: Partial<Address>; onSave: (a: Omit<Address, 'id'>) => void; submitLabel?: string }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [type, setType] = useState<AddressType>(initial?.type ?? 'home');
  const [line, setLine] = useState(initial?.line ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const valid = label.trim() && line.trim() && city.trim();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-sm font-medium">Type</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t.value} label={t.label} selected={type === t.value} onClick={() => setType(t.value)} />)}
        </div>
      </div>
      <TextField label="Label" name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home" />
      <TextField label="Address" name="line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Flat, building, street, area" />
      <TextField label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
      <TextField label="Notes (optional)" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parking, landmark…" />
      {/* Mock map pin — decorative for the prototype */}
      <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-surface-2 py-6 text-xs text-muted">📍 Location pin (mock)</div>
      <Button disabled={!valid} onClick={() => onSave({ label: label.trim(), type, line: line.trim(), city: city.trim(), notes: notes.trim() || undefined })}>{submitLabel}</Button>
    </div>
  );
}
```

- [ ] **Step 5: Write the test** — `src/components/chat/chat-components.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { AddressForm } from '../booking/AddressForm';

describe('chat + address components', () => {
  it('MessageBubble renders text and attachment', () => {
    render(<MessageBubble message={{ id: 'x', senderId: 'me', text: 'Hello', sentAt: '2026-06-20T09:00:00.000Z', attachmentName: 'venue.jpg' }} mine />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('venue.jpg')).toBeInTheDocument();
  });
  it('ChatComposer sends trimmed text and clears', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} onAttach={() => {}} />);
    const input = screen.getByLabelText('Message');
    fireEvent.change(input, { target: { value: '  hi  ' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(onSend).toHaveBeenCalledWith('hi');
    expect((input as HTMLInputElement).value).toBe('');
  });
  it('AddressForm validates required fields then saves', () => {
    const onSave = vi.fn();
    render(<AddressForm onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Save address' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Home' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '12 Tulsi Apt' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label: 'Home', city: 'Pune', type: 'home' }));
  });
});
```

- [ ] **Step 6: Run the test** — `npm test -- chat-components` → PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: chat components (MessageBubble, ChatComposer, ConversationRow) + AddressForm"
```

---

### Task 3: Favorites tab

**Files:**
- Create: `src/screens/jajman/FavoritesScreen.tsx`
- Test: `src/screens/jajman/FavoritesScreen.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/FavoritesScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Heart } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { PanditCard } from '../../components/ui/PanditCard';
import { Button } from '../../components/ui/Button';
import { useDataStore } from '../../store/dataStore';

export function FavoritesScreen() {
  const navigate = useNavigate();
  const favorites = useDataStore(useShallow((s) => s.getFavorites()));
  const toggleFavorite = useDataStore((s) => s.toggleFavorite);

  return (
    <>
      <AppBar title="Favorites" />
      <div className="flex-1 p-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Heart size={36} className="text-muted" />
            <p className="text-sm text-muted">No favourite pandits yet.</p>
            <button onClick={() => navigate('/app/search')} className="text-sm font-medium text-primary">Explore pandits</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {favorites.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <PanditCard p={p} onClick={() => navigate(`/app/pandit/${p.id}`)} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate(`/app/book/${p.id}`)}>Quick rebook</Button>
                  <Button variant="outline" onClick={() => toggleFavorite(p.id)} aria-label={`Remove ${p.name} from favourites`}>
                    <Heart size={18} className="fill-error text-error" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

> Lives under the tabbed `AppLayout` (Favorites bottom-tab).

- [ ] **Step 2: Write the test** — `src/screens/jajman/FavoritesScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FavoritesScreen } from './FavoritesScreen';
import { useDataStore } from '../../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews }));

describe('FavoritesScreen', () => {
  it('lists favourited pandits (pnd-1, pnd-6 seeded favourite) and can unfavourite', () => {
    render(<MemoryRouter><FavoritesScreen /></MemoryRouter>);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove Pandit Ramesh Sharma from favourites'));
    expect(screen.queryByText('Pandit Ramesh Sharma')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test** — `npm test -- FavoritesScreen` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Favorites tab (quick rebook + unfavourite)"
```

---

### Task 4: Chat screens (conversations + thread)

**Files:**
- Create: `src/screens/jajman/chat/ConversationsListScreen.tsx`
- Create: `src/screens/jajman/chat/ChatThreadScreen.tsx`
- Test: `src/screens/jajman/chat/ChatThreadScreen.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/chat/ConversationsListScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { ConversationRow } from '../../../components/chat/ConversationRow';
import { useChatStore } from '../../../store/chatStore';

export function ConversationsListScreen() {
  const navigate = useNavigate();
  const threads = useChatStore(useShallow((s) => s.threads));

  return (
    <>
      <AppBar title="Messages" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center"><div className="text-4xl">💬</div><p className="text-sm text-muted">No conversations yet. Chat opens after you request a booking.</p></div>
        ) : (
          <div className="flex flex-col gap-3">
            {threads.map((t) => <ConversationRow key={t.id} thread={t} onClick={() => navigate(`/app/chat/${t.id}`)} />)}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/screens/jajman/chat/ChatThreadScreen.tsx`** (§0.9 phone-visibility toggle, mock attachment)

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Avatar } from '../../../components/ui/Avatar';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatComposer } from '../../../components/chat/ChatComposer';
import { useChatStore } from '../../../store/chatStore';
import { useDataStore } from '../../../store/dataStore';

export function ChatThreadScreen() {
  const navigate = useNavigate();
  const { threadId = '' } = useParams();
  const thread = useChatStore((s) => s.getThread(threadId));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const togglePhoneShared = useChatStore((s) => s.togglePhoneShared);
  const pandit = useDataStore((s) => s.getPandit(thread?.panditId ?? ''));

  if (!thread) {
    return <><AppBar title="Chat" left={<BackButton />} /><div className="flex-1 p-6 text-sm text-muted">Conversation not found.</div></>;
  }

  return (
    <>
      <AppBar
        title={<span className="flex items-center gap-2"><Avatar name={pandit?.name ?? '?'} size={28} />{pandit?.name}</span>}
        left={<BackButton />}
        right={
          <button type="button" onClick={() => togglePhoneShared(thread.id)} aria-label="Toggle phone sharing" aria-pressed={thread.phoneShared} className="p-2 text-muted">
            {thread.phoneShared ? <Phone size={18} className="text-primary" /> : <PhoneOff size={18} />}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-md bg-surface-2 p-2 text-center text-xs text-muted">
          {thread.phoneShared ? 'Your phone number is shared in this booking.' : 'Phone number hidden — chat only.'}
        </div>
        <div className="flex flex-col gap-2">
          {thread.messages.map((m) => <MessageBubble key={m.id} message={m} mine={m.senderId === 'me'} />)}
        </div>
      </div>
      <ChatComposer
        onSend={(text) => sendMessage(thread.id, 'me', text)}
        onAttach={() => sendMessage(thread.id, 'me', 'Shared a photo', 'venue.jpg')}
      />
    </>
  );
}
```

- [ ] **Step 3: Write the test** — `src/screens/jajman/chat/ChatThreadScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChatThreadScreen } from './ChatThreadScreen';
import { useChatStore } from '../../../store/chatStore';

beforeEach(() => useChatStore.setState(useChatStore.getInitialState()));

describe('ChatThreadScreen', () => {
  it('shows messages and sends a new one', () => {
    render(
      <MemoryRouter initialEntries={['/app/chat/thr-1']}>
        <Routes><Route path="/app/chat/:threadId" element={<ChatThreadScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Looking forward to it/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Great, thanks!' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(screen.getByText('Great, thanks!')).toBeInTheDocument();
  });

  it('toggles phone sharing', () => {
    render(
      <MemoryRouter initialEntries={['/app/chat/thr-1']}>
        <Routes><Route path="/app/chat/:threadId" element={<ChatThreadScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Phone number hidden/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Toggle phone sharing'));
    expect(screen.getByText(/phone number is shared/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test** — `npm test -- ChatThreadScreen` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: chat conversations list + thread (phone-visibility, mock attachment)"
```

---

### Task 5: Add-address sheet + route integration + walkthrough

**Files:**
- Create: `src/screens/jajman/booking/AddAddressSheet.tsx`
- Modify: `src/screens/jajman/booking/BookingFlow.tsx`
- Modify: `src/screens/jajman/booking/BookingDetailScreen.tsx`
- Modify: `src/screens/jajman/PanditDetailScreen.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/app/social-flow.test.tsx`

- [ ] **Step 1: Create `src/screens/jajman/booking/AddAddressSheet.tsx`**

```tsx
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { AddressForm } from '../../../components/booking/AddressForm';
import { useBookingStore } from '../../../store/bookingStore';

export function AddAddressSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const addAddress = useBookingStore((s) => s.addAddress);
  return (
    <BottomSheet open={open} onClose={onClose} title="Add address">
      <AddressForm
        onSave={(a) => {
          const created = addAddress(a);
          onAdded(created.id);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Wire the sheet into `src/screens/jajman/booking/BookingFlow.tsx`** + make `startDraft` idempotent:
  - Import `useState`/`AddAddressSheet`.
  - Make the mount effect idempotent so leaving for an inline sheet (or any re-render) doesn't wipe the draft: change the effect body so it only (re)starts a draft when there isn't already one for this pandit:
    ```tsx
    useEffect(() => {
      const d = useBookingStore.getState().draft;
      if (d && d.panditId === panditId) return; // keep an in-progress draft
      const team = teamParam ? teamParam.split(',').filter(Boolean) : [];
      startDraft(panditId, {
        isEmergency,
        type: modeParam ? 'multi' : 'single',
        assignmentMode: modeParam === 'build' || modeParam === 'lead' ? modeParam : undefined,
        teamPanditIds: team,
        pujaId: pujaParam ?? null,
      });
    }, [panditId, isEmergency, teamParam, modeParam, pujaParam, startDraft]);
    ```
  - Add `const [addrOpen, setAddrOpen] = useState(false);`. Change the AddressPicker's `onAdd` (currently sets the inline note) to `onAdd={() => setAddrOpen(true)}`. Render at the end of the component: `<AddAddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} onAdded={(id) => patchDraft({ addressId: id })} />`. (Remove the now-unused `showAddrNote` state + inline note from Task P1c.)

- [ ] **Step 3: Wire the booking-detail "Message" CTA to a real thread** — in `src/screens/jajman/booking/BookingDetailScreen.tsx`: import `useChatStore`; add `const ensureThread = useChatStore((s) => s.ensureThreadForBooking);`. Change the "Message pandit" button's onClick from navigating to `/app/chat/:panditId` to:
  ```tsx
  onClick={() => { const t = ensureThread(booking.id, booking.panditId); navigate(`/app/chat/${t.id}`); }}
  ```

- [ ] **Step 4: Point the pandit-detail Chat CTA at the conversations list** — in `src/screens/jajman/PanditDetailScreen.tsx`, change the Chat button's navigate target from `/app/chat/${pandit.id}` to `/app/chat` (chat is post-booking; the conversations list is the right destination pre-booking).

- [ ] **Step 5: Wire routes in `src/app/router.tsx`** — import `FavoritesScreen`, `ConversationsListScreen`, `ChatThreadScreen`. Add `{ path: '/app/favorites', element: <FavoritesScreen /> }` to the RequireAuth+AppLayout (tabbed) children. Add to the RequireAuth+AppPlainLayout children: `{ path: '/app/chat', element: <ConversationsListScreen /> }` and `{ path: '/app/chat/:threadId', element: <ChatThreadScreen /> }`.

- [ ] **Step 6: Write the integration test** — `src/app/social-flow.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useChatStore } from '../store/chatStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useChatStore.setState(useChatStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('social flow (integration)', () => {
  it('Favorites tab shows favourites and quick-rebook navigates to booking', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/favorites'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
  });

  it('Conversations → open a thread → send a message', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/chat'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getAllByText(/Pandit|Acharya/)[0]); // open first conversation
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Namaste ji' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(screen.getByText('Namaste ji')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the full suite + typecheck + build + dev smoke** — `npm test` (all pass), `npm run typecheck` (clean), `npm run build` (succeeds). Boot `npm run dev` background, curl localhost → 200, stop.

- [ ] **Step 8: Commit** (commit only — do NOT push)

```bash
git add -A
git commit -m "feat: add-address sheet (+ idempotent booking draft), wire chat Message CTA + favorites/chat routes (P2a complete)"
```

---

## Self-Review

**Spec coverage (P2a):**
- In-app chat (conversations + thread, opened by threadId §0.1; phone-visibility §0.9; mock attachment) → Tasks 1,2,4,5. ✔
- Favorites tab (list + quick rebook + unfavourite) → Task 3. ✔
- Add-address (inline sheet preserving the booking draft; real address CRUD) → Tasks 1,2,5. ✔
- Booking "Message" CTA → real thread (ensureThreadForBooking) → Task 5. ✔

**Deferred (correct, → P2b):** standalone address-management list/edit/delete screens + their Profile entry (the CRUD store actions exist + are tested now); profile/settings, notifications center, disputes, referrals. Pandit-side chat → P3. i18n → P5.

**Placeholder scan:** every step has complete code or exact edits. The mock map pin, mock attachment ("venue.jpg"), and `new Date()` in app code are intentional prototype choices.

**Type consistency:** `ChatThread`/`ChatMessage` (Task 1) used by chatStore + components + screens. `useChatStore` actions (`getThread`/`getThreadForBooking`/`ensureThreadForBooking`/`sendMessage`/`togglePhoneShared`) consistent across Tasks 4-5. `addAddress`/`updateAddress`/`deleteAddress` (bookingStore) used by AddAddressSheet. `AddressForm`/`MessageBubble`/`ChatComposer`/`ConversationRow` (Task 2) consumed by Tasks 4-5. `routes` consumed by `social-flow.test.tsx`. Idempotent `startDraft` guard prevents the add-address sheet from wiping the booking draft.
