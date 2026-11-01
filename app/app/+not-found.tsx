import { router } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { Empty, Screen } from '@/ui';

export default function NotFound() {
  return <Screen><Empty Icon={Compass} title="Page not found" text="This link may be old or mistyped." action="Go home" onAction={() => router.replace('/')} /></Screen>;
}
