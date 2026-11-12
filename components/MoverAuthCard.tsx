import { Truck } from 'lucide-react';
import '../app/admin.css';
import '../app/mover.css';

/** Centered card for the mover sign-in / password pages (no sidebar). */
export function MoverAuthCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <main className="mmx mv mv-auth">
      <section className="mv-auth-card">
        <span className="mmx-brand-ico" aria-hidden><Truck size={22} strokeWidth={1.75} /></span>
        <h1>{title}</h1>
        {sub && <p className="mv-meta" style={{ margin: 0, fontSize: 15 }}>{sub}</p>}
        {children}
        <p className="mv-meta" style={{ margin: '18px 0 0', textAlign: 'center' }}><b dir="ltr">MoveMatch</b> · סביבת מובילים</p>
      </section>
    </main>
  );
}

export function Note({ kind, children }: { kind: 'ok' | 'warn'; children: React.ReactNode }) {
  return <p className={`mv-note ${kind}`} role={kind === 'warn' ? 'alert' : 'status'}>{children}</p>;
}
