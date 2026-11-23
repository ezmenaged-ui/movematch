import Link from 'next/link';
import { MapPinned, Truck } from 'lucide-react';

/** Tabs at the top of /admin/movers: the roster, and who receives tenders per area. */
export function MoversTabs({ on, movers }: { on: 'list' | 'areas'; movers?: number }) {
  return (
    <nav className="adm-tabs" aria-label="מובילים">
      <Link href="/admin/movers" className={`adm-tab ${on === 'list' ? 'on' : ''}`} aria-current={on === 'list' ? 'page' : undefined}>
        <Truck size={16} /> רשימת המובילים{movers !== undefined && <span className="adm-tab-n">{movers}</span>}
      </Link>
      <Link href="/admin/movers/areas" className={`adm-tab ${on === 'areas' ? 'on' : ''}`} aria-current={on === 'areas' ? 'page' : undefined}>
        <MapPinned size={16} /> מי מקבל לפי אזור
      </Link>
    </nav>
  );
}
