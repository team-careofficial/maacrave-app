import { router } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { homeFor, useAuth } from '../auth';
import { C } from '../theme';
import { Button } from './index';

/** Switches back to customer mode (or another approved mode). */
export function ModeSwitch({ to = 'CUSTOMER' }: { to?: 'CUSTOMER' | 'COOK' | 'RIDER' }) {
  const { setMode } = useAuth();
  const label = to === 'CUSTOMER' ? 'Switch to ordering food' : to === 'COOK' ? 'Switch to Mother / Cook' : 'Switch to Rider';
  return <Button v="outline" title={label} icon={<Repeat size={16} color={C.text} />} onPress={async () => { await setMode(to); router.replace(homeFor(to)); }} />;
}
