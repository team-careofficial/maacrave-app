import { ChefHat, ClipboardList, LayoutDashboard, MessageSquare, User } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function KitchenTabs() {
  return <AppTabs center="index" tabs={[
    { name: 'orders', title: 'Orders', Icon: ClipboardList },
    { name: 'requests', title: 'Requests', Icon: MessageSquare },
    { name: 'index', title: 'Today', Icon: LayoutDashboard },
    { name: 'menu', title: 'Menu', Icon: ChefHat },
    { name: 'account', title: 'Kitchen', Icon: User },
  ]} />;
}
