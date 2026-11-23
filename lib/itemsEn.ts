/**
 * English names for the item catalogue (lib/items.ts), for the English site. The list a client picks is still saved with
 * the Hebrew names (movers read Hebrew); only what the client sees changes. `k` = extra English search words.
 * Items the client adds themselves keep their own text.
 */
export const ITEMS_EN: Record<string, { name: string; k?: string }> = {
  sofa1: { name: 'One-seater sofa', k: 'couch armchair' }, sofa2: { name: 'Two-seater sofa', k: 'couch loveseat' }, sofa3: { name: 'Three-seater sofa', k: 'couch' },
  sofa_l: { name: 'Corner sofa (L-shaped)', k: 'couch sectional' }, sofa_bed: { name: 'Sofa bed', k: 'couch futon' },
  recliner: { name: 'Recliner sofa / armchair', k: 'couch' }, armchair: { name: 'Armchair', k: 'chair' }, massage_chair: { name: 'Massage chair' },
  chaise: { name: 'Chaise longue', k: 'lounger' }, pouf: { name: 'Footstool / pouf', k: 'ottoman' },
  coffee: { name: 'Coffee table', k: 'living room table' }, coffee_heavy: { name: 'Heavy coffee table (marble / glass)', k: 'living room table' },
  side_table: { name: 'Side table' }, tv_unit: { name: 'TV unit', k: 'tv stand sideboard' }, tv_unit_wall: { name: 'Wall-mounted TV unit', k: 'tv stand' },
  vitrine: { name: 'Display cabinet', k: 'vitrine china cabinet' }, bookcase: { name: 'Bookcase', k: 'shelves books' },
  tv: { name: 'TV', k: 'television screen' }, tv_big: { name: 'Large TV (65" or more)', k: 'television screen' }, speakers: { name: 'Sound system / speakers', k: 'stereo' },
  piano: { name: 'Piano', k: 'grand organ keyboard' },
  bed_double: { name: 'Double bed' }, bed_queen: { name: 'Wide double bed (queen / king)', k: 'king queen' }, bed_single: { name: 'Single bed' },
  bed_wide: { name: 'Three-quarter bed', k: 'small double' }, bed_bunk: { name: 'Bunk bed' }, bed_pull: { name: 'Pull-out bed / trundle', k: 'trundle' },
  crib: { name: 'Baby cot', k: 'crib cradle' }, mattress_double: { name: 'Double mattress' }, mattress_single: { name: 'Single mattress' },
  bed_base: { name: 'Bed base / storage box', k: 'divan' },
  wardrobe2: { name: 'Wardrobe, 2 doors', k: 'closet' }, wardrobe3: { name: 'Wardrobe, 3–4 doors', k: 'closet' }, wardrobe_big: { name: 'Wardrobe, 5+ doors / sliding', k: 'closet' },
  dresser: { name: 'Chest of drawers', k: 'dresser' }, nightstand: { name: 'Bedside table', k: 'nightstand' }, vanity: { name: 'Dressing table', k: 'vanity makeup' },
  mirror: { name: 'Large mirror' },
  desk: { name: 'Computer desk', k: 'desk table' }, desk_l: { name: 'Corner computer desk (L)', k: 'desk table' }, desk_office: { name: 'Large office desk', k: 'desk table' },
  office_chair: { name: 'Office chair' }, kid_chair: { name: "Children's / student chair", k: 'kids chair' }, computer: { name: 'Computer + monitor', k: 'pc screen' },
  printer: { name: 'Printer' },
  cube_small: { name: 'Small cube shelf (up to 6 cubes)', k: 'shelving kallax' }, cube_big: { name: 'Large cube shelf (7+ cubes)', k: 'shelving kallax' },
  shelf: { name: 'Shelf / shelving unit', k: 'shelves' }, toy_box: { name: 'Toy box / cabinet', k: 'toys' },
  dining2: { name: 'Dining table for 2', k: 'kitchen table' }, dining4: { name: 'Dining table for 4', k: 'kitchen table' }, dining6: { name: 'Dining table for 6', k: 'kitchen table' },
  dining8: { name: 'Dining table for 8+', k: 'kitchen table extendable' }, dining_chair: { name: 'Dining chair', k: 'chairs' }, bar_stool: { name: 'Bar stool', k: 'stool' },
  buffet: { name: 'Buffet / sideboard', k: 'sideboard' },
  fridge: { name: 'Fridge', k: 'refrigerator' }, fridge_big: { name: 'Large / double-door fridge', k: 'refrigerator side by side' }, freezer: { name: 'Freezer' },
  oven: { name: 'Oven', k: 'cooker' }, oven_builtin: { name: 'Built-in oven', k: 'cooker' }, stove: { name: 'Hob', k: 'stove gas cooktop' },
  dishwasher: { name: 'Dishwasher' }, microwave: { name: 'Microwave' }, hood: { name: 'Cooker hood', k: 'extractor' }, kitchen_cart: { name: 'Kitchen trolley / pantry unit', k: 'cart' },
  washer: { name: 'Washing machine', k: 'washer laundry' }, dryer: { name: 'Tumble dryer', k: 'dryer laundry' }, ac: { name: 'Air conditioner (split)', k: 'aircon ac' },
  ac_portable: { name: 'Portable air conditioner', k: 'aircon ac' }, heater: { name: 'Heater / radiator' }, fan: { name: 'Fan' }, water_bar: { name: 'Water dispenser', k: 'water cooler' },
  garden_set: { name: 'Balcony seating set', k: 'garden outdoor patio' }, plants_big: { name: 'Large plant pot', k: 'plant' }, plants_small: { name: 'Small plant pot', k: 'plant' },
  bbq: { name: 'Grill / barbecue', k: 'bbq' }, bike: { name: 'Bicycle', k: 'bike' }, stroller: { name: 'Baby stroller', k: 'pram buggy' },
  storage_cab: { name: 'Utility cabinet / storage', k: 'shed' }, treadmill: { name: 'Treadmill / exercise machine', k: 'gym' }, safe: { name: 'Safe' },
  aquarium: { name: 'Aquarium', k: 'fish tank' }, suitcase: { name: 'Suitcase', k: 'luggage' },
};

export const ROOMS_EN: Record<string, string> = {
  living: 'Living room', bedroom: 'Bedrooms', office: 'Work & kids', dining: 'Dining', kitchen: 'Kitchen & appliances', storage: 'Balcony & other',
};

export const SECTIONS_EN: Record<string, string> = {
  'ספות וכורסאות': 'Sofas & armchairs', 'שולחנות ומזנונים': 'Tables & units', 'אלקטרוניקה': 'Electronics', 'מיטות': 'Beds',
  'ארונות ושידות': 'Wardrobes & chests', 'שולחנות וכיסאות': 'Tables & chairs', 'כוורות ומדפים': 'Shelving', 'מטבח': 'Kitchen',
  'כביסה ושונות': 'Laundry & more', 'מרפסת וחוץ': 'Balcony & outdoor', 'אחסון וכבדים': 'Storage & heavy items',
};
