import Link from 'next/link';
import { CalendarDays, History, Inbox, LogOut, Send, Truck, UserRound, Users } from 'lucide-react';
import { MoverLogo } from './MoverLogo';
import { logout } from '@/app/movers/actions';
import type { Me } from '@/lib/mover';
import '../app/admin.css';
import '../app/mover.css';

export type MoverTab = 'new' | 'offers' | 'history' | 'calendar' | 'crew' | 'profile';

/** Mover panel frame — same "סביבת מובילים" look as /admin (sidebar on the right in RTL). */
export function MoverShell({ me, active, title, counts = {}, children }: {
  me: Me; active: MoverTab | null; title: string; counts?: Partial<Record<MoverTab, number>>; children: React.ReactNode;
}) {
  const work = [
    { key: 'new', href: '/movers', label: 'פניות חדשות', icon: Inbox },
    { key: 'offers', href: '/movers/offers', label: 'הצעות שנשלחו', icon: Send },
    { key: 'history', href: '/movers/history', label: 'היסטוריה', icon: History },
  ] as const;
  const biz = [
    { key: 'calendar', href: '/movers/calendar', label: 'יומן', icon: CalendarDays },
    { key: 'crew', href: '/movers/crew', label: 'צוות', icon: Users },
  ] as const;
  const item = ({ key, href, label, icon: Icon }: { key: MoverTab; href: string; label: string; icon: typeof Inbox }) => (
    <Link key={key} href={href} className={`mmx-nav-a ${active === key ? 'on' : ''}`} aria-current={active === key ? 'page' : undefined}>
      <Icon size={19} strokeWidth={1.75} /> <span>{label}</span>{counts[key] !== undefined && <em>{counts[key]}</em>}
    </Link>
  );
  const company = me.company_name || me.name;
  return (
    <div className="mmx mv">
      <aside className="mmx-side">
        <Link href="/movers" className="mmx-brand">
          <span className="mmx-brand-ico"><Truck size={22} strokeWidth={1.75} /></span>
          <span><b dir="ltr">MoveMatch</b><small>סביבת מובילים</small></span>
        </Link>
        <nav className="mmx-nav" aria-label="ניווט ראשי">
          <span className="mmx-nav-h">ניהול עבודה</span>
          {work.map(item)}
          <span className="mmx-nav-h mv-gap">העסק שלי</span>
          {biz.map(item)}
          <Link href="/movers/profile" className={`mmx-nav-a mv-nav-profile-m ${active === 'profile' ? 'on' : ''}`} aria-current={active === 'profile' ? 'page' : undefined}>
            <UserRound size={19} strokeWidth={1.75} /> <span>פרופיל</span>
          </Link>
        </nav>
        <div className="mv-side-foot">
          <Link href="/movers/profile" className={`mv-me ${active === 'profile' ? 'on' : ''}`} aria-current={active === 'profile' ? 'page' : undefined}>
            <MoverLogo id={me.id} hasLogo={me.has_logo} name={company} size={36} />
            <span><b>{company}</b><small>פרופיל עסקי</small></span>
          </Link>
          <form action={logout}><button type="submit" className="mv-logout"><LogOut size={15} /> יציאה</button></form>
        </div>
      </aside>
      <main className="mmx-main">
        <div className="mmx-crumbs mv-crumbs"><span><b dir="ltr">MoveMatch</b> / {title}</span>
          <form action={logout} className="mv-logout-top"><button type="submit" className="mv-logout"><LogOut size={15} /> יציאה</button></form>
        </div>
        {children}
      </main>
    </div>
  );
}
