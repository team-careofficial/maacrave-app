import { createElement, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import type { Point } from '../geo';
import { C, R } from '../theme';
import { mapHtml } from './mapHtml';

let seq = 0;
const frame = (html: string, ref?: React.Ref<HTMLIFrameElement>, interactive = true) =>
  createElement('iframe', { ref, srcDoc: html, title: 'Map', style: { border: 0, width: '100%', height: '100%', pointerEvents: interactive ? 'auto' : 'none' } });

/** Kitchen → delivery route map (website). */
export function RouteMap({ from, to, fromLabel, toLabel, rider, height = 190 }: { from: Point; to: Point; fromLabel: string; toLabel: string; rider?: Point | null; height?: number }) {
  const id = useMemo(() => `r${++seq}`, []);
  const ref = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => mapHtml({ id, mode: 'route', from, to, fromLabel, toLabel, rider }), [id, from.lat, from.lng, to.lat, to.lng, fromLabel, toLabel]); // eslint-disable-line react-hooks/exhaustive-deps
  // Move the rider marker without reloading the map.
  useEffect(() => { if (rider) ref.current?.contentWindow?.postMessage(JSON.stringify({ id, rider }), '*'); }, [rider?.lat, rider?.lng, id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.sunken }}>{frame(html, ref, false)}</View>;
}

/** Drag-the-map pin picker (website). */
export function PinPicker({ center, onChange, goto, height = 240 }: { center: Point; onChange: (p: Point) => void; goto?: Point | null; height?: number }) {
  const id = useMemo(() => `p${++seq}`, []);
  const html = useMemo(() => mapHtml({ id, mode: 'pick', center }), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const ref = useRef<HTMLIFrameElement>(null);
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    const on = (e: MessageEvent) => { try { const m = JSON.parse(e.data); if (m.id === id && typeof m.lat === 'number') cb.current({ lat: m.lat, lng: m.lng }); } catch { /* not ours */ } };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [id]);
  useEffect(() => { if (goto) ref.current?.contentWindow?.postMessage(JSON.stringify({ id, goto }), '*'); }, [goto?.lat, goto?.lng, id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.sunken }}>{frame(html, ref)}</View>;
}
