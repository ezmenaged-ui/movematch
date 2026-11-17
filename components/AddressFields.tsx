'use client';
import type { Address } from '@/lib/validate';
import { CityField, CranePicker, ElevatorChoice, ElevatorTypePicker, Field, ParkingPicker } from './fields';

export function AddressFields({ value, onChange, errors = {} }: {
  value: Address; onChange: (a: Address) => void; errors?: Partial<Record<keyof Address, string>>;
}) {
  const set = <K extends keyof Address>(k: K, v: Address[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="stack">
      <div className="row-city">
        <CityField value={value.city} onChange={(v) => set('city', v)} error={errors.city} />
        <Field label="כתובת מלאה" value={value.address} onChange={(v) => set('address', v)} error={errors.address} autoComplete="street-address" placeholder="רחוב ומספר" />
      </div>
      <div className="row-2">
        <Field label="קומה" value={value.floor} onChange={(v) => set('floor', v)} error={errors.floor} inputMode="numeric" />
        <Field label="מספר דירה" value={value.apartment} onChange={(v) => set('apartment', v)} inputMode="numeric" />
      </div>
      <ElevatorChoice value={value.elevator} onChange={(v) => onChange({ ...value, elevator: v, elevator_type: v ? value.elevator_type || '' : '' })} />
      {value.elevator === true && <ElevatorTypePicker value={value.elevator_type} onChange={(t) => set('elevator_type', t)} error={errors.elevator_type} />}
      <CranePicker value={value.crane} onChange={(v) => set('crane', v)} error={errors.crane} />
      <ParkingPicker value={value.parking} onChange={(v) => set('parking', v)} error={errors.parking} />
    </div>
  );
}
