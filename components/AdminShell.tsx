import Link from 'next/link';
import { ExternalLink, Inbox, Truck, UserPlus } from 'lucide-react';
import '../app/admin.css';

type Active = 'leads' | 'movers';

/** Admin frame: green sidebar (right, RTL) + main area. Matches the "סביבת מובילים" design. */
export function AdminShell({ active, title, counts = {}, children }: {
  active: Active; title: string; counts?: { leads?: number; movers?: number; pending?: number }; children: React.ReactNode;
}) {
  const nav = [
    { key: 'leads', href: '/admin', label: 'לידים', icon: Inbox, n: counts.leads },
    { key: 'movers', href: '/admin/movers', label: 'מובילים', icon: Truck, n: counts.movers },
  ] as const;
  return (
    <div className="mmx">
      <aside className="mmx-side">
        <Link href="/admin" className="mmx-brand">
          <span className="mmx-brand-ico"><Truck size={22} strokeWidth={1.75} /></span>
          <span><b>MoveMatch</b><small>ניהול</small></span>
        </Link>
        <nav className="mmx-nav" aria-label="ניהול">
          <span className="mmx-nav-h">ניהול עבודה</span>
          {nav.map(({ key, href, label, icon: Icon, n }) => (
            <Link key={key} href={href} className={`mmx-nav-a ${active === key ? 'on' : ''}`} aria-current={active === key ? 'page' : undefined}>
              <Icon size={19} strokeWidth={1.75} /> <span>{label}</span>{n !== undefined && <em>{n}</em>}
            </Link>
          ))}
          {counts.pending ? (
            <Link href="/admin/movers#pending" className="mmx-nav-a">
              <UserPlus size={19} strokeWidth={1.75} /> <span>ממתינים לאישור</span><em className="warn">{counts.pending}</em>
            </Link>
          ) : null}
        </nav>
        <a href="/" target="_blank" className="mmx-side-foot"><ExternalLink size={16} /> האתר ללקוחות</a>
      </aside>
      <main className="mmx-main">
        <div className="mmx-crumbs"><b>MoveMatch</b> / {title}</div>
        {children}
      </main>
    </div>
  );
}

/** Soft green title card at the top of each admin page. */
export function AdminHero({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <section className="mmx-hero">
      {kicker && <span className="mmx-kicker">{kicker}</span>}
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </section>
  );
}

export function StatCard({ icon, n, label }: { icon: React.ReactNode; n: number | string; label: string }) {
  return (
    <div className="mmx-stat">
      <span className="mmx-stat-ico">{icon}</span>
      <span><b>{n}</b><small>{label}</small></span>
    </div>
  );
}
