'use client';
import { type Address, addrParts, joinAddr } from '@/lib/validate';
import { CityField, CranePicker, ElevatorChoice, ElevatorTypePicker, Field, ParkingPicker, RoomsPicker } from './fields';

/** `origin`: the address they're moving from, which starts with the home size. */
export function AddressFields({ value, onChange, errors = {}, origin = false }: {
  value: Address; onChange: (a: Address) => void; errors?: Partial<Record<keyof Address, string>>; origin?: boolean;
}) {
  const { street, number } = addrParts(value);
  const set = <K extends keyof Address>(k: K, v: Address[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="stack">
      {origin && <RoomsPicker value={value.rooms} onChange={(v) => set('rooms', v)} error={errors.rooms} />}
      {/* Two rows of two: city + street, then house number + floor. `address` keeps "street number" for movers, emails and the crew sheet. */}
      <div className="row-2">
        <CityField value={value.city} onChange={(v) => set('city', v)} error={errors.city} />
        <Field label="רחוב" value={street} onChange={(v) => onChange({ ...value, street: v, number, address: joinAddr(v, number) })} error={errors.street} autoComplete="address-line1" placeholder="שם הרחוב" />
      </div>
      <div className="row-2">
        <Field label="מספר בית" value={number} onChange={(v) => onChange({ ...value, street, number: v, address: joinAddr(street, v) })} error={errors.number} inputMode="numeric" placeholder="למשל 12" />
        {/* Floor always (before the elevator), then elevator: with one we also ask its size. No apartment number. */}
        <Field label="קומה" value={value.floor} onChange={(v) => set('floor', v)} error={errors.floor} inputMode="numeric" placeholder="קרקע = 0" />
      </div>
      <ElevatorChoice value={value.elevator} onChange={(v) => onChange({ ...value, elevator: v, elevator_type: v ? value.elevator_type || '' : '' })} error={errors.elevator} />
      {value.elevator === true && <ElevatorTypePicker value={value.elevator_type} onChange={(t) => set('elevator_type', t)} error={errors.elevator_type} />}
      <CranePicker value={value.crane} onChange={(v) => set('crane', v)} error={errors.crane} />
      <ParkingPicker value={value.parking} onChange={(v) => set('parking', v)} error={errors.parking} />
    </div>
  );
}
