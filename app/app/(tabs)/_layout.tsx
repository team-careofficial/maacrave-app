import { Home, MessageSquare, Receipt, Search, User } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function CustomerTabs() {
  return <AppTabs center="index" tabs={[
    { name: 'browse', title: 'Browse', Icon: Search },
    { name: 'requests', title: 'Request', Icon: MessageSquare },
    { name: 'index', title: 'Home', Icon: Home },
    { name: 'orders', title: 'Orders', Icon: Receipt },
    { name: 'account', title: 'Account', Icon: User },
  ]} />;
}
