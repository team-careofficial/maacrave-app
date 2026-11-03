import { BadgeCheck, Clock, Mail, Smartphone } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { API } from '../api';
import { useAuth } from '../auth';
import { BD_PHONE, normalizePhone } from '../format';
import { num, t, useLang } from '../i18n';
import { C, F, R, S } from '../theme';
import { Button, Input, Row, T } from './index';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_AFTER = 45;

/**
 * Add or change a phone number / email the professional way: we send a 6-digit code there,
 * and only after it's entered does it become part of the account.
 */
export function ContactVerify({ kind, current, verified = true, onVerified, label, allowChange = true }: { kind: 'phone' | 'email'; current?: string | null; verified?: boolean; onVerified?: () => void; label?: string; allowChange?: boolean }) {
  useLang();
  const { reload } = useAuth();
  const [value, setValue] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const codeRef = useRef<TextInput>(null);

  useEffect(() => { if (!sentTo) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [sentTo]);
  const resendIn = Math.max(0, RESEND_AFTER - Math.floor((now - sentAt) / 1000));
  const target = (v: string) => (kind === 'phone' ? { phone: normalizePhone(v) } : { email: v.trim().toLowerCase() });

  async function send(v = value) {
    const ok = kind === 'phone' ? BD_PHONE.test(normalizePhone(v)) : EMAIL.test(v.trim());
    if (!ok) return setError(kind === 'phone' ? 'Enter a valid Bangladeshi mobile number, e.g. 1712 345678.' : 'Enter a valid email address.');
    setBusy(true); setError(null);
    try {
      const r = await API.contactRequest(target(v));
      if (r.saved) { await reload(); setValue(''); onVerified?.(); return; } // saved directly while SMS codes aren't switched on
      setSentTo(v); setSentAt(Date.now()); setNow(Date.now()); setCode('');
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function verify(c = code) {
    if (!sentTo || c.length !== 6) return;
    setBusy(true); setError(null);
    try { await API.contactVerify(target(sentTo), c); await reload(); setSentTo(null); setValue(''); onVerified?.(); }
    catch (e) { setError((e as Error).message); setCode(''); } finally { setBusy(false); }
  }

  const Icon = kind === 'phone' ? Smartphone : Mail;
  return (
    <View style={{ gap: S.sm }}>
      {current ? (
        <Row gap={8} style={{ backgroundColor: verified ? C.okSoft : C.surface2, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12 }}>
          <BadgeCheck size={18} color={verified ? C.ok : C.muted} />
          <T v="label" style={{ flex: 1 }}>{kind === 'phone' ? `+88 ${current}` : current}</T>
          <T v="meta" color={verified ? C.ok : C.muted}>{verified ? t('Verified', 'যাচাই করা') : t('Saved', 'সেভ করা')}</T>
        </Row>
      ) : null}
      {current && !allowChange ? null : !sentTo ? (
        <Row gap={S.sm} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input label={label === '' ? (current ? (kind === 'phone' ? 'Change number' : 'Change email') : undefined) : label || (kind === 'phone' ? (current ? 'New mobile number' : 'Mobile number') : (current ? 'New email' : 'Email'))}
              prefix={kind === 'phone' ? '🇧🇩 +880' : undefined} keyboardType={kind === 'phone' ? 'phone-pad' : 'email-address'} autoCapitalize="none" autoCorrect={false}
              autoComplete={kind === 'phone' ? 'tel' : 'email'} placeholder={kind === 'phone' ? '1712 345678' : 'name@gmail.com'} maxLength={kind === 'phone' ? 14 : 120}
              value={value} onChangeText={(v) => { setValue(v); setError(null); }} onSubmitEditing={() => send()} />
          </View>
          <Button title="Send code" v="secondary" loading={busy} icon={<Icon size={16} color={C.brandText} />} onPress={() => send()} />
        </Row>
      ) : (
        <View style={{ gap: S.sm, backgroundColor: C.surface2, borderRadius: R.lg, padding: S.md }}>
          <T v="sub">{t(`Enter the 6-digit code we sent to ${kind === 'phone' ? '+88 ' + normalizePhone(sentTo) : sentTo}`, `${kind === 'phone' ? '+৮৮ ' + num(normalizePhone(sentTo)) : sentTo}-এ পাঠানো ৬ সংখ্যার কোড দিন`)}</T>
          <Pressable onPress={() => codeRef.current?.focus()} style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, backgroundColor: C.surface, borderColor: i === code.length ? C.brand : error ? C.err : C.line2, alignItems: 'center', justifyContent: 'center' }}>
                <T v="section" style={{ fontFamily: F.display }}>{code[i] || ''}</T>
              </View>
            ))}
          </Pressable>
          <TextInput ref={codeRef} value={code} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete={kind === 'phone' ? 'sms-otp' : 'one-time-code'} maxLength={6}
            onChangeText={(v) => { const d = v.replace(/\D/g, ''); setCode(d); setError(null); if (d.length === 6) verify(d); }}
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable disabled={resendIn > 0 || busy} onPress={() => send(sentTo)}>
              <Row gap={4}><Clock size={13} color={resendIn ? C.muted : C.brandText} /><T v="meta" color={resendIn ? C.muted : C.brandText}>{resendIn ? t(`Resend in ${resendIn}s`, `${num(resendIn)} সেকেন্ড পরে আবার পাঠান`) : t('Resend code', 'আবার কোড পাঠান')}</T></Row>
            </Pressable>
            <Pressable onPress={() => { setSentTo(null); setCode(''); setError(null); }}><T v="meta" color={C.brandText}>{t('Change', 'বদলান')}</T></Pressable>
          </Row>
          <Button title="Verify" loading={busy} disabled={code.length !== 6} onPress={() => verify()} />
          {kind === 'email' ? <T v="meta">{t('Can’t find it? Check Spam or Promotions.', 'খুঁজে না পেলে Spam বা Promotions দেখুন।')}</T> : null}
        </View>
      )}
      {error ? <T v="meta" color={C.err}>{error}</T> : null}
    </View>
  );
}
