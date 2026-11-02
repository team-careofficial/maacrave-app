import { Home, MessageSquare, Receipt, Search, User } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function CustomerTabs() {
  return <AppTabs tabs={[
    { name: 'index', title: 'Home', Icon: Home },
    { name: 'browse', title: 'Browse', Icon: Search },
    { name: 'requests', title: 'Request', Icon: MessageSquare },
    { name: 'orders', title: 'Orders', Icon: Receipt },
    { name: 'account', title: 'Account', Icon: User },
  ]} />;
}
