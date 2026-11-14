import { AREAS } from '@/lib/areas';

/** Multi-select of service areas (checkbox tiles). Used on /movers/join and in /admin/movers. Field name: "areas". */
export function AreaPicker({ idPrefix, selected = [], legend, errorId }:
  { idPrefix: string; selected?: string[]; legend: string; errorId?: string }) {
  return (
    <fieldset className="area-pick" aria-describedby={errorId}>
      <legend>{legend}</legend>
      <div className="area-grid">
        {AREAS.map((a, i) => (
          <label key={a} className="check-row" htmlFor={`${idPrefix}-${i}`}>
            <input id={`${idPrefix}-${i}`} type="checkbox" name="areas" value={a} defaultChecked={selected.includes(a)} />
            <span className="check-box" aria-hidden />
            <span>{a}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
