import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { API } from './api';

/**
 * While a rider is online, share their position every ~20 seconds.
 * It decides who hears about a new pickup first and powers the customer's live map.
 * Only runs with the app open (foreground); nothing is tracked when offline.
 */
export function useRiderLocation(online: boolean) {
  const last = useRef(0);
  useEffect(() => {
    if (!online) return;
    let sub: Location.LocationSubscription | null = null;
    let stopped = false;
    const send = (lat: number, lng: number) => {
      if (Date.now() - last.current < 18_000) return;
      last.current = Date.now();
      API.riderLocation(lat, lng).catch(() => { /* next tick will retry */ });
    };
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || stopped) return;
        const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        send(now.coords.latitude, now.coords.longitude);
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 20_000, distanceInterval: 25 }, (p) => send(p.coords.latitude, p.coords.longitude));
        if (stopped) sub.remove();
      } catch { /* location unavailable — rider still works, just isn't ranked by distance */ }
    })();
    return () => { stopped = true; sub?.remove(); };
  }, [online]);
}
