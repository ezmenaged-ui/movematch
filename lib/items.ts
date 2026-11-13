/**
 * Funnel D item catalog. Grouped by room → section, like the inventory in a move quote.
 * `k` = extra search words (synonyms, common spellings). `d` = can be disassembled, `a` = can be reassembled.
 */
export type CatalogItem = { id: string; name: string; icon: string; k?: string; d?: boolean; a?: boolean };
export type Section = { title: string; items: CatalogItem[] };
export type Room = { id: string; name: string; icon: string; sections: Section[] };

export const ROOMS: Room[] = [
  {
    id: 'living', name: 'סלון', icon: '🛋️', sections: [
      { title: 'ספות וכורסאות', items: [
        { id: 'sofa1', name: 'ספה יחיד', icon: '🛋️', k: 'ספה כורסה מושב' },
        { id: 'sofa2', name: 'ספה דו מושבית', icon: '🛋️', k: 'ספה זוגית ספה 2' },
        { id: 'sofa3', name: 'ספה תלת מושבית', icon: '🛋️', k: 'ספה 3 ספה גדולה' },
        { id: 'sofa_l', name: 'ספת פינה (ריש / L)', icon: '🛋️', k: 'ספה פינתית ספת ריש פינה שזלונג' },
        { id: 'sofa_bed', name: 'ספה נפתחת', icon: '🛋️', k: 'ספה מיטה' },
        { id: 'recliner', name: 'ספה / כורסת ריקליינר', icon: '💺', k: 'ריקליינר טלוויזיה' },
        { id: 'armchair', name: 'כורסה', icon: '💺', k: 'כורסא' },
        { id: 'massage_chair', name: 'כורסת עיסוי', icon: '💺', k: 'עיסוי מסאז' },
        { id: 'chaise', name: 'שזלונג', icon: '🛋️', k: 'שיזלונג' },
        { id: 'pouf', name: 'הדום / פוף', icon: '🟤', k: 'פוף הדום' },
      ] },
      { title: 'שולחנות ומזנונים', items: [
        { id: 'coffee', name: 'שולחן סלון', icon: '🟫', k: 'שולחן קפה' },
        { id: 'coffee_heavy', name: 'שולחן סלון כבד (שיש / זכוכית)', icon: '🟫', k: 'שולחן שיש זכוכית' },
        { id: 'side_table', name: 'שולחן צד', icon: '🟫', k: 'שולחנון' },
        { id: 'tv_unit', name: 'מזנון', icon: '📺', k: 'מזנון טלוויזיה', d: true, a: true },
        { id: 'tv_unit_wall', name: 'מזנון תלוי', icon: '📺', k: 'מזנון קיר', d: true, a: true },
        { id: 'vitrine', name: 'ויטרינה / ארון תצוגה', icon: '🗄️', k: 'ויטרינה תצוגה', d: true, a: true },
        { id: 'bookcase', name: 'ספרייה', icon: '📚', k: 'ספריה מדפים ספרים', d: true, a: true },
      ] },
      { title: 'אלקטרוניקה', items: [
        { id: 'tv', name: 'טלוויזיה', icon: '📺', k: 'טלויזיה מסך tv', d: true, a: true },
        { id: 'tv_big', name: 'טלוויזיה גדולה (65 אינץ׳ ומעלה)', icon: '📺', k: 'טלויזיה מסך גדול', d: true, a: true },
        { id: 'speakers', name: 'מערכת שמע / רמקולים', icon: '🔊', k: 'סטריאו רמקול' },
        { id: 'piano', name: 'פסנתר', icon: '🎹', k: 'פסנתר כנף אורגן' },
      ] },
    ],
  },
  {
    id: 'bedroom', name: 'חדרי שינה', icon: '🛏️', sections: [
      { title: 'מיטות', items: [
        { id: 'bed_double', name: 'מיטה זוגית', icon: '🛏️', k: 'מיטה כפולה מיטת זוג', d: true, a: true },
        { id: 'bed_queen', name: 'מיטה זוגית רחבה (קווין / קינג)', icon: '🛏️', k: 'קווין קינג מיטה גדולה', d: true, a: true },
        { id: 'bed_single', name: 'מיטת יחיד', icon: '🛏️', k: 'מיטה יחיד', d: true, a: true },
        { id: 'bed_wide', name: 'מיטה וחצי', icon: '🛏️', k: 'מיטה 120 נוער', d: true, a: true },
        { id: 'bed_bunk', name: 'מיטת קומותיים', icon: '🛏️', k: 'קומתיים מיטת קומות', d: true, a: true },
        { id: 'bed_pull', name: 'מיטה נשלפת / מיטת חבר', icon: '🛏️', k: 'נשלפת חבר', d: true, a: true },
        { id: 'crib', name: 'מיטת תינוק', icon: '👶', k: 'עריסה לול תינוק', d: true, a: true },
        { id: 'mattress_double', name: 'מזרן זוגי', icon: '🛏️', k: 'מזרון' },
        { id: 'mattress_single', name: 'מזרן יחיד', icon: '🛏️', k: 'מזרון' },
        { id: 'bed_base', name: 'בסיס מיטה / ארגז מצעים', icon: '🛏️', k: 'ארגז מצעים בסיס', d: true, a: true },
      ] },
      { title: 'ארונות ושידות', items: [
        { id: 'wardrobe2', name: 'ארון בגדים 2 דלתות', icon: '🚪', k: 'ארון בגדים', d: true, a: true },
        { id: 'wardrobe3', name: 'ארון בגדים 3–4 דלתות', icon: '🚪', k: 'ארון בגדים גדול', d: true, a: true },
        { id: 'wardrobe_big', name: 'ארון בגדים 5 דלתות ומעלה / הזזה', icon: '🚪', k: 'ארון הזזה ענק', d: true, a: true },
        { id: 'dresser', name: 'שידה / קומודה', icon: '🗄️', k: 'שידת מגירות קומודה' },
        { id: 'nightstand', name: 'שידת לילה', icon: '🗄️', k: 'שידה ליד המיטה' },
        { id: 'vanity', name: 'שולחן איפור / קוסמטיקה', icon: '🪞', k: 'איפור קוסמטיקה טואלט', d: true, a: true },
        { id: 'mirror', name: 'מראה גדולה', icon: '🪞', k: 'מראה' },
      ] },
    ],
  },
  {
    id: 'office', name: 'עבודה וילדים', icon: '💻', sections: [
      { title: 'שולחנות וכיסאות', items: [
        { id: 'desk', name: 'שולחן מחשב', icon: '🖥️', k: 'שולחן כתיבה', d: true, a: true },
        { id: 'desk_l', name: 'שולחן מחשב פינתי (L)', icon: '🖥️', k: 'שולחן פינתי שלוחה', d: true, a: true },
        { id: 'desk_office', name: 'שולחן משרדי גדול', icon: '🖥️', k: 'שולחן מנהל', d: true, a: true },
        { id: 'office_chair', name: 'כיסא משרדי', icon: '🪑', k: 'כסא מחשב כסא מנהל' },
        { id: 'kid_chair', name: 'כיסא ילדים / תלמיד', icon: '🪑', k: 'כסא תלמיד' },
        { id: 'computer', name: 'מחשב + מסך', icon: '💻', k: 'מחשב שולחני מסך' },
        { id: 'printer', name: 'מדפסת', icon: '🖨️', k: 'מדפסת' },
      ] },
      { title: 'כוורות ומדפים', items: [
        { id: 'cube_small', name: 'כוורת קטנה (עד 6 תאים)', icon: '🧊', k: 'כוורת מדף' },
        { id: 'cube_big', name: 'כוורת גדולה (7 תאים ומעלה)', icon: '🧊', k: 'כוורת גדולה', d: true, a: true },
        { id: 'shelf', name: 'מדף / עמודת מדפים', icon: '📚', k: 'מדפים', d: true, a: true },
        { id: 'toy_box', name: 'ארגז / ארון צעצועים', icon: '🧸', k: 'צעצועים' },
      ] },
    ],
  },
  {
    id: 'dining', name: 'פינת אוכל', icon: '🍽️', sections: [
      { title: 'שולחנות וכיסאות', items: [
        { id: 'dining2', name: 'פינת אוכל ל-2', icon: '🍽️', k: 'שולחן אוכל קטן' },
        { id: 'dining4', name: 'פינת אוכל ל-4', icon: '🍽️', k: 'שולחן אוכל', d: true, a: true },
        { id: 'dining6', name: 'פינת אוכל ל-6', icon: '🍽️', k: 'שולחן אוכל', d: true, a: true },
        { id: 'dining8', name: 'פינת אוכל ל-8 ומעלה', icon: '🍽️', k: 'שולחן אוכל גדול נפתח', d: true, a: true },
        { id: 'dining_chair', name: 'כיסא אוכל', icon: '🪑', k: 'כסא כיסאות' },
        { id: 'bar_stool', name: 'כיסא בר', icon: '🪑', k: 'כסא בר שרפרף' },
        { id: 'buffet', name: 'בופה / קומודת אוכל', icon: '🗄️', k: 'בופה' },
      ] },
    ],
  },
  {
    id: 'kitchen', name: 'מטבח וחשמל', icon: '🧊', sections: [
      { title: 'מטבח', items: [
        { id: 'fridge', name: 'מקרר', icon: '🧊', k: 'מקרר רגיל' },
        { id: 'fridge_big', name: 'מקרר גדול / דו דלתי (SBS)', icon: '🧊', k: 'מקרר מקפיא דו דלתי סייד' },
        { id: 'freezer', name: 'מקפיא', icon: '🧊', k: 'מקפיא' },
        { id: 'oven', name: 'תנור אפייה', icon: '🔥', k: 'תנור', d: true },
        { id: 'oven_builtin', name: 'תנור בילד-אין', icon: '🔥', k: 'תנור בנוי', d: true, a: true },
        { id: 'stove', name: 'כיריים', icon: '🔥', k: 'גז כיריים', d: true, a: true },
        { id: 'dishwasher', name: 'מדיח כלים', icon: '🍽️', k: 'מדיח', d: true, a: true },
        { id: 'microwave', name: 'מיקרוגל', icon: '📦', k: 'מיקרו' },
        { id: 'hood', name: 'קולט אדים', icon: '💨', k: 'קולט', d: true, a: true },
        { id: 'kitchen_cart', name: 'עגלת מטבח / מזווה', icon: '🛒', k: 'מזווה עגלה' },
      ] },
      { title: 'כביסה ושונות', items: [
        { id: 'washer', name: 'מכונת כביסה', icon: '🫧', k: 'כביסה מכונה', d: true, a: true },
        { id: 'dryer', name: 'מייבש כביסה', icon: '🫧', k: 'מייבש', d: true, a: true },
        { id: 'ac', name: 'מזגן עילי', icon: '❄️', k: 'מזגן מפוצל', d: true, a: true },
        { id: 'ac_portable', name: 'מזגן נייד', icon: '❄️', k: 'מזגן' },
        { id: 'heater', name: 'תנור חימום / רדיאטור', icon: '♨️', k: 'רדיאטור מפזר חום חימום' },
        { id: 'fan', name: 'מאוורר', icon: '🌀', k: 'מאוורר עמוד' },
        { id: 'water_bar', name: 'בר מים', icon: '💧', k: 'מתקן מים' },
      ] },
    ],
  },
  {
    id: 'storage', name: 'מרפסת ושונות', icon: '📦', sections: [
      { title: 'מרפסת וחוץ', items: [
        { id: 'garden_set', name: 'פינת ישיבה למרפסת', icon: '🪴', k: 'מרפסת גינה פינת ישיבה' },
        { id: 'plants_big', name: 'עציץ גדול', icon: '🪴', k: 'עציץ צמח' },
        { id: 'plants_small', name: 'עציץ קטן', icon: '🌱', k: 'עציץ צמח' },
        { id: 'bbq', name: 'גריל / מנגל', icon: '🍖', k: 'מנגל ברביקיו' },
        { id: 'bike', name: 'אופניים', icon: '🚲', k: 'אופנים' },
        { id: 'stroller', name: 'עגלת תינוק', icon: '👶', k: 'עגלה' },
      ] },
      { title: 'אחסון וכבדים', items: [
        { id: 'storage_cab', name: 'ארון שירות / מחסן', icon: '🗄️', k: 'ארון שירות מחסן', d: true, a: true },
        { id: 'treadmill', name: 'הליכון / מכשיר כושר', icon: '🏃', k: 'הליכון אופני כושר מכשיר', d: true, a: true },
        { id: 'safe', name: 'כספת', icon: '🔒', k: 'כספת' },
        { id: 'aquarium', name: 'אקווריום', icon: '🐠', k: 'אקווריום' },
        { id: 'suitcase', name: 'מזוודה', icon: '🧳', k: 'מזוודה' },
      ] },
    ],
  },
];

export const ALL_ITEMS: (CatalogItem & { room: string; section: string })[] =
  ROOMS.flatMap((r) => r.sections.flatMap((s) => s.items.map((i) => ({ ...i, room: r.name, section: s.title }))));

const norm = (s: string) => s.toLowerCase().replace(/[׳"'״\-()/]/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/כסא/g, 'כיסא').replace(/טלויזיה/g, 'טלוויזיה').replace(/מזרון/g, 'מזרן').replace(/כורסא/g, 'כורסה')
  .replace(/([א-ת]{2,})ת(?=\s|$)/g, '$1ה'); // construct state: "מיטת" ≈ "מיטה", "כורסת" ≈ "כורסה"

/** Search the catalog: every typed word must appear in the item's name or keywords. Plural "ות/ים" endings are relaxed. */
export function searchItems(q: string, limit = 12) {
  const words = norm(q).split(' ').filter(Boolean).map((w) => (w.length > 3 ? w.replace(/(ים|ות)$/, '') : w));
  if (!words.length) return [];
  const scored = ALL_ITEMS.map((i) => {
    const name = norm(i.name), hay = `${name} ${norm(i.k || '')}`;
    if (!words.every((w) => hay.includes(w))) return null;
    const score = (name.startsWith(words[0]) ? 0 : 1) + (words.every((w) => name.includes(w)) ? 0 : 1);
    return { i, score };
  }).filter(Boolean) as { i: (typeof ALL_ITEMS)[number]; score: number }[];
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.i);
}

/** `dis` / `asm`: true = yes, false = no, missing = the client hasn't answered yet. */
export type PickedItem = { id: string; name: string; qty: number; dis?: boolean; asm?: boolean; custom?: boolean };

/** Which questions an item gets: catalog items by their `d`/`a` flags, typed (custom) items both. */
export function itemAsks(p: Pick<PickedItem, 'id' | 'custom'>) {
  if (p.custom || p.id.startsWith('custom:')) return { d: true, a: true };
  const c = ALL_ITEMS.find((i) => i.id === p.id);
  return { d: !!c?.d, a: !!c?.a };
}
/** Items where the client hasn't said yes/no to a disassembly or assembly question that applies. */
export function itemsMissingFlags(v: ItemsValue) {
  return v.list.filter((p) => { const k = itemAsks(p); return (k.d && p.dis === undefined) || (k.a && p.asm === undefined); });
}
export type ItemsValue = { list: PickedItem[]; boxes: number };
export const emptyItems = (): ItemsValue => ({ list: [], boxes: 20 });
export const itemsCount = (v: ItemsValue | null | undefined) => (v?.list || []).reduce((n, i) => n + i.qty, 0);

/** One-line summary for messages/admin: "ספה תלת מושבית ×1 (פירוק), מקרר ×1 … · 20 קרטונים". */
export function itemsSummary(v: ItemsValue | null | undefined, max = 40) {
  if (!v?.list?.length) return '';
  const parts = v.list.slice(0, max).map((i) => `${i.name} ×${i.qty}${i.dis || i.asm ? ` (${[i.dis && 'פירוק', i.asm && 'הרכבה'].filter(Boolean).join('+')})` : ''}`);
  return parts.join(', ') + (v.list.length > max ? ` ועוד ${v.list.length - max}` : '') + (v.boxes ? ` · כ-${v.boxes} קרטונים` : '');
}
