'use client';
import type { Address } from '@/lib/validate';
import { CityField, CranePicker, ElevatorChoice, ElevatorTypePicker, Field, ParkingPicker, RoomsPicker } from './fields';

/** `origin`: the address they're moving from, which starts with the home size. */
export function AddressFields({ value, onChange, errors = {}, origin = false }: {
  value: Address; onChange: (a: Address) => void; errors?: Partial<Record<keyof Address, string>>; origin?: boolean;
}) {
  const set = <K extends keyof Address>(k: K, v: Address[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="stack">
      {origin && <RoomsPicker value={value.rooms} onChange={(v) => set('rooms', v)} error={errors.rooms} />}
      <div className="row-city">
        <CityField value={value.city} onChange={(v) => set('city', v)} error={errors.city} />
        <Field label="כתובת מלאה" value={value.address} onChange={(v) => set('address', v)} error={errors.address} autoComplete="street-address" placeholder="רחוב ומספר" />
      </div>
      {/* Floor always (before the elevator), then elevator: with one we also ask its size. No apartment number. */}
      <Field label="קומה" value={value.floor} onChange={(v) => set('floor', v)} error={errors.floor} inputMode="numeric" placeholder="קרקע = 0" />
      <ElevatorChoice value={value.elevator} onChange={(v) => onChange({ ...value, elevator: v, elevator_type: v ? value.elevator_type || '' : '' })} error={errors.elevator} />
      {value.elevator === true && <ElevatorTypePicker value={value.elevator_type} onChange={(t) => set('elevator_type', t)} error={errors.elevator_type} />}
      <CranePicker value={value.crane} onChange={(v) => set('crane', v)} error={errors.crane} />
      <ParkingPicker value={value.parking} onChange={(v) => set('parking', v)} error={errors.parking} />
    </div>
  );
}
