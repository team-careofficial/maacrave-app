import { Bike, Navigation, User, Wallet } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function RiderTabs() {
  return <AppTabs center="index" tabs={[
    { name: 'tasks', title: 'My trips', Icon: Navigation },
    { name: 'index', title: 'Pickups', Icon: Bike },
    { name: 'earnings', title: 'Earnings', Icon: Wallet },
    { name: 'account', title: 'Account', Icon: User },
  ]} />;
}
