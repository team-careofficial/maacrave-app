import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, Bike, CalendarDays, MonitorSmartphone, Smartphone, ChefHat, ChevronRight, FileText, Globe, Heart, HelpCircle, LogOut, MapPin, Shield, ShoppingBag, Trash2, type LucideIcon } from 'lucide-react-native';
import { Linking, Pressable, Text, View } from 'react-native';
import { API } from '@/api';
import { setLang, useLang } from '@/i18n';
import { homeFor, useAuth } from '@/auth';
import { C, ON_GLOSS, ON_GLOSS_SOFT, R, S } from '@/theme';
import { Badge, Card, confirm, Divider, Glossy, Header, IconTile, Rings, Screen, Section, T, useToast } from '@/ui';

function Item({ Icon, label, sub, onPress, right, danger }: { Icon: LucideIcon; label: string; sub?: string; onPress: () => void; right?: React.ReactNode; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 14, paddingHorizontal: S.lg }, pressed && { backgroundColor: C.sunken }]}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: danger ? C.errSoft : C.surface, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={danger ? C.err : C.brand} /></View>
      <View style={{ flex: 1 }}>
        <T v="body" color={danger ? C.err : C.text} style={{ fontSize: 15 }}>{label}</T>
        {sub ? <T v="meta">{sub}</T> : null}
      </View>
      {right ?? <ChevronRight size={18} color={C.muted} />}
    </Pressable>
  );
}
const Group = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden' }}>{children}</View>
);

function LangSwitch({ value, onChange }: { value: 'en' | 'bn'; onChange: (l: 'en' | 'bn') => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.sunken, borderRadius: R.pill, padding: 3 }}>
      {(['en', 'bn'] as const).map((l) => (
        <Pressable key={l} onPress={() => onChange(l)} style={{ paddingHorizontal: 12, height: 30, borderRadius: R.pill, justifyContent: 'center', backgroundColor: value === l ? C.ink : 'transparent' }}>
          <Text style={{ fontFamily: l === 'bn' ? 'HindSiliguri_600SemiBold' : 'PlusJakartaSans_700Bold', fontSize: 13, color: value === l ? '#fff' : C.text2 }}>{l === 'en' ? 'English' : 'বাংলা'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Account() {
  const current = useLang();
  const { me, signOut, canUse, roleStatus, setMode, reload } = useAuth();
  const toast = useToast();
  const lang = useMutation({ mutationFn: (language: 'en' | 'bn') => { setLang(language); return API.updateMe({ language }); }, onSuccess: () => { reload(); toast('Language updated'); } });
  async function signOutAll() {
    if (!(await confirm('Sign out of all devices?', 'Every phone and browser signed in to your account is signed out, including this one.', 'Sign out everywhere', true))) return;
    try { await API.signOutEverywhere(); } catch { /* signing out locally anyway */ }
    signOut();
  }
  async function deleteAccount() {
    if (!(await confirm('Delete your account?', 'Your name, phone, email, addresses and saved items will be removed. Past orders are kept without your details. This cannot be undone.', 'Continue', true))) return;
    if (!(await confirm('Are you sure?', 'This permanently deletes your MaaCrave account.', 'Delete account', true))) return;
    try { await API.deleteAccount(); toast('Your account was deleted'); await signOut(); } catch (e) { toast((e as Error).message); }
  }
  if (!me) return null;

  const roleRow = (role: 'COOK' | 'RIDER') => {
    const st = roleStatus(role);
    const Icon = role === 'COOK' ? ChefHat : Bike;
    const name = role === 'COOK' ? 'Mother / Cook' : 'Rider';
    if (canUse(role)) return <Item Icon={Icon} label={`Switch to ${name} mode`} sub={role === 'COOK' ? 'Manage menu, requests and batches' : 'Go online and deliver'} onPress={async () => { await setMode(role); router.replace(homeFor(role)); }} />;
    if (st === 'PENDING') return <Item Icon={Icon} label={`${name} application`} sub="Under review — we’ll notify you" onPress={() => undefined} right={<Badge label="Pending" tone="warn" />} />;
    const note = me?.roles.find((r) => r.role === role)?.note;
    if (st === 'REJECTED') return <Item Icon={Icon} label={`${name} application needs changes`} sub={note ? `“${note}” — tap to fix and resubmit` : 'Tap to fix and resubmit'} onPress={() => router.push(`/apply/${role.toLowerCase()}`)} right={<Badge label="Resubmit" tone="warn" />} />;
    if (st === 'SUSPENDED') return <Item Icon={Icon} label={`${name} account`} sub={note || 'Suspended — contact support'} onPress={() => Linking.openURL('mailto:support@maacrave.app')} right={<Badge label="Suspended" tone="err" />} />;
    return <Item Icon={Icon} label={role === 'COOK' ? 'Cook with MaaCrave' : 'Ride with MaaCrave'} sub={role === 'COOK' ? 'Earn from your home kitchen' : 'Flexible delivery earnings'} onPress={() => router.push(`/apply/${role.toLowerCase()}`)} />;
  };

  return (
    <Screen header={<Header title="Account" />}>
      <Glossy style={{ marginTop: S.sm }}>
        <View style={{ padding: S.xl, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Rings size={200} right={-60} top={-70} />
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <T v="section" color={C.brand}>{(me.name || 'You').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T v="section" color={ON_GLOSS}>{me.name}</T>
            <T v="sub" color={ON_GLOSS_SOFT}>{me.phone || me.email}{me.area ? ` · ${me.area}` : ''}</T>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8 }}>
            <T v="price" color={ON_GLOSS}>{me.loyaltyPoints}</T>
            <T v="meta" color={ON_GLOSS_SOFT}>points</T>
          </View>
        </View>
      </Glossy>

      <Section title="Your food">
        <Group>
          <Item Icon={ShoppingBag} label="Orders" onPress={() => router.push('/orders')} /><Divider />
          <Item Icon={CalendarDays} label="Meal plans" sub="Breakfast, lunch or dinner · weekly or monthly" onPress={() => router.push('/plans')} /><Divider />
          <Item Icon={Heart} label="Saved dishes & cooks" onPress={() => router.push('/favorites')} /><Divider />
          <Item Icon={MapPin} label="Delivery addresses" onPress={() => router.push('/addresses')} /><Divider />
          <Item Icon={Smartphone} label="Phone & email" sub={[me.phone ? `+88 ${me.phone}` : null, me.email].filter(Boolean).join(' · ')} onPress={() => router.push('/contact')} /><Divider />
          <Item Icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
        </Group>
      </Section>

      <Section title="Work with us">
        <Group>{roleRow('COOK')}<Divider />{roleRow('RIDER')}</Group>
      </Section>

      <Section title="Settings">
        <Group>
          <Item Icon={Globe} label="Language" sub={current === 'bn' ? 'বাংলা' : 'English'} onPress={() => lang.mutate(current === 'bn' ? 'en' : 'bn')}
            right={<LangSwitch value={current} onChange={(l) => lang.mutate(l)} />} /><Divider />
          <Item Icon={HelpCircle} label="Help & support" sub="Chat with us, call or email" onPress={() => router.push('/support')} /><Divider />
          <Item Icon={Shield} label="Privacy policy" onPress={() => router.push('/privacy')} /><Divider />
          <Item Icon={FileText} label="Terms of service" onPress={() => router.push('/terms')} /><Divider />
          <Item Icon={FileText} label="Refund & cancellation policy" onPress={() => router.push('/refund')} /><Divider />
          <Item Icon={MonitorSmartphone} label="Sign out of all devices" sub="If you lost a phone or shared your account" onPress={signOutAll} /><Divider />
          <Item Icon={Trash2} label="Delete account" sub="Removes your personal data permanently" danger onPress={deleteAccount} right={<View />} /><Divider />
          <Item Icon={LogOut} label="Sign out" danger onPress={async () => { if (await confirm('Sign out?', 'You can sign back in with your phone number or email.', 'Sign out', true)) signOut(); }} right={<View />} />
        </Group>
      </Section>
      {me.referralCode ? (
        <Card style={{ marginTop: S.xl, flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.brandSoft, borderColor: C.brandSoft }}>
          <IconTile Icon={Heart} />
          <View style={{ flex: 1 }}><T v="label">Your invite code: {me.referralCode}</T><T v="meta">Share it with friends who love home food. You earn 1 point for every ৳10 you spend.</T></View>
        </Card>
      ) : null}
      <T v="meta" center style={{ marginTop: S.xl }}>MaaCrave · Version 1.0.0</T>
    </Screen>
  );
}
