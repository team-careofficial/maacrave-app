/** Map helpers. Coordinates are [lat, lng]. Area centres are approximate and used until a pin is set. */
export type Point = { lat: number; lng: number };
export const AREA_COORDS: Record<string, Point> = {
  'Mirpur 1': { lat: 23.7956, lng: 90.3537 }, 'Mirpur 2': { lat: 23.8059, lng: 90.3631 }, 'Mirpur 10': { lat: 23.8069, lng: 90.3687 }, 'Mirpur 12': { lat: 23.8285, lng: 90.3648 },
  Pallabi: { lat: 23.8268, lng: 90.3611 }, Kazipara: { lat: 23.7975, lng: 90.373 }, Shewrapara: { lat: 23.7905, lng: 90.3755 }, Agargaon: { lat: 23.7778, lng: 90.38 },
  Mohammadpur: { lat: 23.7662, lng: 90.3589 }, Dhanmondi: { lat: 23.7465, lng: 90.376 }, Lalmatia: { lat: 23.756, lng: 90.37 }, Farmgate: { lat: 23.7577, lng: 90.3897 },
  Tejgaon: { lat: 23.764, lng: 90.393 }, Banani: { lat: 23.7937, lng: 90.4066 }, Gulshan: { lat: 23.7925, lng: 90.415 }, Mohakhali: { lat: 23.7779, lng: 90.405 },
  Uttara: { lat: 23.8759, lng: 90.3795 }, Badda: { lat: 23.7806, lng: 90.4265 }, Rampura: { lat: 23.761, lng: 90.42 }, Bashundhara: { lat: 23.8193, lng: 90.4526 },
  Khilgaon: { lat: 23.751, lng: 90.429 }, Motijheel: { lat: 23.733, lng: 90.4172 }, 'Old Dhaka': { lat: 23.7104, lng: 90.4074 }, Jatrabari: { lat: 23.7104, lng: 90.435 },
};
export const DHAKA: Point = { lat: 23.7808, lng: 90.3925 };

/** A saved pin if there is one, otherwise the centre of the area. */
export function pointOf(p: { lat?: number | null; lng?: number | null; area?: string | null }): { point: Point; exact: boolean } {
  if (p.lat != null && p.lng != null) return { point: { lat: p.lat, lng: p.lng }, exact: true };
  return { point: AREA_COORDS[p.area || ''] || DHAKA, exact: false };
}

/** Straight-line distance in km. */
export function km(a: Point, b: Point) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Dhaka streets are not straight: road distance ≈ 1.35 × straight line; riders average ~16 km/h in traffic. */
export function trip(a: Point, b: Point) {
  const road = Math.max(0.4, km(a, b) * 1.35);
  const mins = Math.round(8 + (road / 16) * 60);
  return { km: road, mins };
}
