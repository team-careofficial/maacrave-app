import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Point } from '../geo';
import { C, R } from '../theme';
import { mapHtml } from './mapHtml';

/** Kitchen → delivery route map (phone apps). */
export function RouteMap({ from, to, fromLabel, toLabel, height = 190 }: { from: Point; to: Point; fromLabel: string; toLabel: string; height?: number }) {
  const html = useMemo(() => mapHtml({ id: 'r', mode: 'route', from, to, fromLabel, toLabel }), [from.lat, from.lng, to.lat, to.lng, fromLabel, toLabel]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.sunken }} pointerEvents="none">
      <WebView originWhitelist={['*']} source={{ html }} scrollEnabled={false} style={{ backgroundColor: 'transparent' }} />
    </View>
  );
}

/** Drag-the-map pin picker (phone apps). `goto` moves the map, e.g. after “Use my location”. */
export function PinPicker({ center, onChange, goto, height = 240 }: { center: Point; onChange: (p: Point) => void; goto?: Point | null; height?: number }) {
  const ref = useRef<WebView>(null);
  const html = useMemo(() => mapHtml({ id: 'p', mode: 'pick', center }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (goto) ref.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ id: 'p', goto }))}}));true;`);
  }, [goto?.lat, goto?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.sunken }}>
      <WebView ref={ref} originWhitelist={['*']} source={{ html }} nestedScrollEnabled
        onMessage={(e) => { try { const m = JSON.parse(e.nativeEvent.data); if (m.id === 'p' && typeof m.lat === 'number') onChange({ lat: m.lat, lng: m.lng }); } catch { /* ignore */ } }} />
    </View>
  );
}
