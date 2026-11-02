import { Bike, Navigation, User, Wallet } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function RiderTabs() {
  return <AppTabs tabs={[
    { name: 'index', title: 'Pickups', Icon: Bike },
    { name: 'tasks', title: 'My trips', Icon: Navigation },
    { name: 'earnings', title: 'Earnings', Icon: Wallet },
    { name: 'account', title: 'Account', Icon: User },
  ]} />;
}
