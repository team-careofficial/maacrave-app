import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { API } from '@/api';
import { tk } from '@/format';
import { useMeta } from '@/hooks';
import { C, CATEGORY_META, R, S } from '@/theme';
import { Button, CategoryTile, Chip, confirm, Field, Header, Input, Loading, Note, Row, Screen, Stepper, T, Toggle, useToast } from '@/ui';
import { Grid } from '@/ui/grid';
import { MediaSlot } from '@/ui/photo';
import { t, useLang } from '@/i18n';
import { HEALTH, REGIONS } from '@/maa';

const ALLERGENS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Nuts', 'Peanut', 'Wheat', 'Soy', 'Sesame', 'Mustard'];
const PORTIONS = ['1 person', '1 plate', '2 people', '4 people', '500 g', '1 kg'];
const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function DishEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const qc = useQueryClient();
  const toast = useToast();
  const pct = useMeta().data?.fees.commissionPct ?? 10;
  const lang = useLang();
  const fests = useQuery({ queryKey: ['home'], queryFn: API.home });
  const openFests = (fests.data?.festivals || []).filter((f) => new Date(f.closesAt) > new Date());
  const list = useQuery({ queryKey: ['kitchenDishes'], queryFn: API.kitchenDishes, enabled: !isNew });
  const existing = list.data?.find((d) => d.id === id);

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [category, setCategory] = useState('bengali');
  const [price, setPrice] = useState('');
  const [portion, setPortion] = useState('1 person');
  const [prep, setPrep] = useState(45);
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [spice, setSpice] = useState(1);
  const [capacity, setCapacity] = useState(15);
  const [available, setAvailable] = useState(true);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [healthTags, setHealthTags] = useState<string[]>([]);
  const [festivalId, setFestivalId] = useState<string | null>(null);
  const [allergenOk, setAllergenOk] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name); setNameBn(existing.nameBn || ''); setCategory(existing.category); setPrice(String(existing.price)); setPortion(existing.portion);
    setPrep(existing.prepMinutes); setIngredients(existing.ingredients.join(', ')); setAllergens(existing.allergens); setDescription(existing.description || '');
    setSpice(existing.spice); setCapacity(existing.dailyCapacity); setAvailable(existing.available);
    setPhotoId(existing.photoId || null); setRegion(existing.region || null); setHealthTags(existing.healthTags || []); setFestivalId(existing.festivalId || null); setAllergenOk(true);
  }, [existing]);

  const done = () => { qc.invalidateQueries({ queryKey: ['kitchenDishes'] }); qc.invalidateQueries({ queryKey: ['dishes'] }); };
  const save = useMutation({
    mutationFn: () => API.saveDish(isNew ? null : id, { name: name.trim(), nameBn: nameBn.trim() || undefined, category, price: Number(price), portion, prepMinutes: prep, ingredients: split(ingredients), allergens, description: description.trim(), spice, dailyCapacity: capacity, available, photoId: photoId || '', region: region || '', healthTags, festivalId: festivalId || '', allergensConfirmed: allergenOk }),
    onSuccess: () => { done(); toast(isNew ? 'Dish added to your menu' : 'Dish updated'); router.back(); },
  });
  const remove = useMutation({ mutationFn: () => API.removeDish(id), onSuccess: () => { done(); toast('Dish removed'); router.back(); } });
  const p = Number(price) || 0;
  const ok = name.trim().length >= 2 && p >= 30 && portion.length > 0 && split(ingredients).length > 0 && allergenOk;

  if (!isNew && list.isLoading) return <Screen header={<Header back title="Edit dish" />}><Loading /></Screen>;
  return (
    <Screen header={<Header back title={isNew ? 'Add a dish' : 'Edit dish'} />}
      footer={<Button title={isNew ? 'Add to menu' : 'Save dish'} size="lg" style={{ flex: 1 }} disabled={!ok} loading={save.isPending} onPress={() => save.mutate()} />}>
      <View style={{ gap: S.xl, marginTop: S.sm }}>
        <MediaSlot kind="DISH" value={photoId} onChange={setPhotoId} label={t('Add a photo of your dish', 'আপনার রান্নার ছবি দিন')}
          hint={t('A real photo of food you cooked, in daylight. Dishes with photos get far more orders.', 'নিজের রান্না করা খাবারের আসল ছবি, দিনের আলোতে তোলা। ছবি থাকলে অনেক বেশি অর্ডার আসে।')} />
        <Input label="Dish name" value={name} onChangeText={setName} placeholder="e.g. Shorshe Ilish" maxLength={60} />
        <Input label="Name in Bangla (optional)" value={nameBn} onChangeText={setNameBn} placeholder="সর্ষে ইলিশ" maxLength={60} />
        <Field label="Category">
          <Grid max={3} gap={S.sm}>
            {Object.entries(CATEGORY_META).map(([k, m]) => (
              <Pressable key={k} onPress={() => setCategory(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 1.5, borderColor: category === k ? C.brand : C.line2, backgroundColor: category === k ? C.brandSoft : C.surface }}>
                <CategoryTile category={k} size={30} /><T v="label" numberOfLines={1} style={{ flex: 1 }}>{m.label}</T>
              </Pressable>
            ))}
          </Grid>
        </Field>
        <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Input label="Price" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" prefix="৳" placeholder="180" hint={p ? `You get ${tk(p * (1 - pct / 100))}` : undefined} /></View>
          <View style={{ flex: 1 }}><Field label="Ready in (minutes)"><Stepper value={prep} onChange={setPrep} min={5} max={600} large /></Field></View>
        </Row>
        <Field label="Portion size"><Row gap={S.sm} wrap>{PORTIONS.map((x) => <Chip key={x} label={x} on={portion === x} onPress={() => setPortion(x)} />)}</Row></Field>
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="How you cook it, what comes with it" maxLength={400} multiline style={{ minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }} />
        <Input label="Main ingredients" value={ingredients} onChangeText={setIngredients} placeholder="Ilish, mustard, green chilli, mustard oil" hint={t('Required. Separate with commas', 'অবশ্যই দিন। কমা দিয়ে আলাদা করুন')} />
        <Field label="Contains allergens"><Row gap={S.sm} wrap>{ALLERGENS.map((a) => <Chip key={a} label={a} on={allergens.includes(a)} onPress={() => { setAllergens(allergens.includes(a) ? allergens.filter((x) => x !== a) : [...allergens, a]); setAllergenOk(false); }} />)}</Row></Field>
        <Toggle value={allergenOk} onChange={setAllergenOk}
          label={allergens.length ? t(`I confirm it contains: ${allergens.join(', ')}`, `আমি নিশ্চিত, এতে আছে: ${allergens.join(', ')}`) : t('I confirm it has none of these allergens', 'আমি নিশ্চিত, এতে এসব অ্যালার্জেন নেই')}
          sub={t('Customers with allergies rely on this. Wrong information can pause your kitchen.', 'অ্যালার্জি আছে এমন কাস্টমাররা এর উপর নির্ভর করেন। ভুল তথ্য দিলে রান্নাঘর বন্ধ হতে পারে।')} />
        <Field label="Spice level">
          <Row gap={S.sm}>{[0, 1, 2, 3].map((n) => <Chip key={n} label={n === 0 ? 'None' : ''} icon={n ? <Row gap={0}>{Array.from({ length: n }).map((_, i) => <Flame key={i} size={14} color={spice === n ? C.brandText : C.err} />)}</Row> : undefined} on={spice === n} onPress={() => setSpice(n)} />)}</Row>
        </Field>
        <Field label="Portions you can make a day"><Row style={{ justifyContent: 'space-between' }}><T v="sub">{capacity} portions</T><Stepper value={capacity} onChange={setCapacity} min={1} max={300} large /></Row></Field>
        <Field label={t('Good for (optional)', 'কাদের জন্য ভালো (ঐচ্ছিক)')}>
          <Row gap={S.sm} wrap>{Object.entries(HEALTH).map(([k, h]) => <Chip key={k} label={lang === 'bn' ? h.bn : h.en} on={healthTags.includes(k)} onPress={() => setHealthTags(healthTags.includes(k) ? healthTags.filter((x) => x !== k) : [...healthTags, k])} />)}</Row>
          <T v="meta" style={{ marginTop: 6 }}>{t('Only tick what’s true: e.g. Diabetic-friendly means no added sugar.', 'যা সত্যি শুধু তাই দিন: যেমন ডায়াবেটিস-বান্ধব মানে চিনি ছাড়া।')}</T>
        </Field>
        <Field label={t('District style (optional)', 'কোন জেলার রান্না (ঐচ্ছিক)')}>
          <Row gap={S.sm} wrap>{Object.entries(REGIONS).map(([k, r]) => <Chip key={k} label={lang === 'bn' ? r.bn : r.en} on={region === k} onPress={() => setRegion(region === k ? null : k)} />)}</Row>
        </Field>
        {openFests.length || festivalId ? (
          <Field label={t('Festival pre-order menu', 'উৎসবের প্রি-অর্ডার মেনু')}>
            <Row gap={S.sm} wrap>
              <Chip label={t('Everyday menu', 'প্রতিদিনের মেনু')} on={!festivalId} onPress={() => setFestivalId(null)} />
              {openFests.map((f) => <Chip key={f.id} label={`🎉 ${lang === 'bn' ? f.titleBn : f.title}`} on={festivalId === f.id} onPress={() => setFestivalId(f.id)} />)}
            </Row>
            {festivalId ? <T v="meta" style={{ marginTop: 6 }}>{t('This dish shows only on the festival page, and is delivered on the festival day. The daily portions limit counts for the whole pre-order.', 'এই পদটি শুধু উৎসবের পাতায় দেখাবে, আর উৎসবের দিনে ডেলিভারি হবে। পোর্শনের সীমা পুরো প্রি-অর্ডারের জন্য।')}</T> : null}
          </Field>
        ) : null}
        <Toggle value={available} onChange={setAvailable} label="Cooking today" sub="Customers can order it right away" />
        {save.error ? <Note tone="err">{(save.error as Error).message}</Note> : null}
        {!isNew ? <Button title="Remove from menu" v="danger" loading={remove.isPending} onPress={async () => { if (await confirm('Remove this dish?', 'It disappears from your menu. Past orders are kept.', 'Remove', true)) remove.mutate(); }} /> : null}
      </View>
    </Screen>
  );
}
