import type { ItemsValue } from '@/lib/items';

/** Read-only inventory list (mover page + admin). */
export function ItemsTable({ items }: { items: ItemsValue | null | undefined }) {
  if (!items?.list?.length) return null;
  const total = items.list.reduce((n, i) => n + i.qty, 0);
  return (
    <div className="items-table">
      <table>
        <thead><tr><th>פריט</th><th>כמות</th><th>פירוק</th><th>הרכבה</th></tr></thead>
        <tbody>
          {items.list.map((i) => (
            <tr key={i.id}><td>{i.name}{i.custom ? ' *' : ''}</td><td>{i.qty}</td><td>{i.dis ? '✓' : ''}</td><td>{i.asm ? '✓' : ''}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="small muted" style={{ margin: '8px 0 0' }}>סה״כ {total} פריטים{items.boxes ? ` · כ-${items.boxes} קרטונים` : ''}{items.list.some((i) => i.custom) ? ' · * פריט שהלקוח הוסיף בעצמו' : ''}</p>
    </div>
  );
}
