import { ChefHat, ClipboardList, LayoutDashboard, MessageSquare, User } from 'lucide-react-native';
import { AppTabs } from '@/ui/tabs';

export default function KitchenTabs() {
  return <AppTabs tabs={[
    { name: 'index', title: 'Today', Icon: LayoutDashboard },
    { name: 'orders', title: 'Orders', Icon: ClipboardList },
    { name: 'requests', title: 'Requests', Icon: MessageSquare },
    { name: 'menu', title: 'Menu', Icon: ChefHat },
    { name: 'account', title: 'Kitchen', Icon: User },
  ]} />;
}
