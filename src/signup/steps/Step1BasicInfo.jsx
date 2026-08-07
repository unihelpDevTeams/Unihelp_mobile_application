import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../shared/theme';
import { useUsernameCheck } from '../hooks/useUsernameCheck';

const L = { fn: 'First Name', ln: 'Last Name', un: 'Username', em: 'Email Address', pw: 'Password', cp: 'Confirm Password' };

export default function Step1BasicInfo({ formData, errors, updateField }) {
  const [show, setShow] = useState(false);
  const { onChangeUsername, status: uStatus, errorMessage: uError } = useUsernameCheck();

  const onChange = (f, v) => { if (f === 'username') onChangeUsername(v); updateField(f, v); };

  const uIcon = () => {
    if (!formData.username || formData.username.length < 3) return null;
    if (uStatus === 'checking') return <ActivityIndicator size="small" color={colors.grey} />;
    if (uStatus === 'available') return <Ionicons name="checkmark-circle" size={20} color={colors.green} />;
    if (uStatus === 'taken') return <Ionicons name="close-circle" size={20} color={colors.rose} />;
    return null;
  };

  const i = (field, extra) => (
    <TextInput style={[st.input, extra, errors[field] && st.errB]} placeholderTextColor={colors.greyLight}
      value={formData[field]} onChangeText={(v) => onChange(field, v)} autoCapitalize="none" autoCorrect={false} />
  );

  return (
    <View style={st.c}>
      <View style={st.h}><Text style={st.t}>Basic Information</Text><Text style={st.sub}>Let&apos;s get started with your account details.</Text></View>
      <View style={st.card}>
        <View style={st.row}>
          <View style={st.hf}><Text style={st.l}>{L.fn}</Text>{i('firstName')}{errors.firstName && <Text style={st.e}>{errors.firstName}</Text>}</View>
          <View style={st.hf}><Text style={st.l}>{L.ln}</Text>{i('lastName')}{errors.lastName && <Text style={st.e}>{errors.lastName}</Text>}</View>
        </View>
        <View style={st.f}><Text style={st.l}>{L.un}</Text>
          <View style={st.w}><TextInput style={[st.input, st.up, errors.username && st.errB]} placeholder="your_username" placeholderTextColor={colors.greyLight} value={formData.username} onChangeText={(v) => onChange('username', v)} autoCapitalize="none" autoCorrect={false} /><View style={st.ui}>{uIcon()}</View></View>
          {errors.username && <Text style={st.e}>{errors.username}</Text>}
          {uStatus === 'available' && <Text style={[st.hp, { color: colors.green }]}>Username is available!</Text>}
          {uError && uStatus === 'taken' && <Text style={[st.hp, { color: colors.rose }]}>{uError}</Text>}
        </View>
        <View style={st.f}><Text style={st.l}>{L.em}</Text>
          <TextInput style={[st.input, errors.email && st.errB]} placeholder="you@example.com" placeholderTextColor={colors.greyLight} value={formData.email} onChangeText={(v) => onChange('email', v)} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          {errors.email && <Text style={st.e}>{errors.email}</Text>}
        </View>
        <View style={st.f}><Text style={st.l}>{L.pw}</Text>
          <View style={st.w}><TextInput style={[st.input, st.pp, errors.password && st.errB]} placeholder="Create a strong password" placeholderTextColor={colors.greyLight} value={formData.password} onChangeText={(v) => onChange('password', v)} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
            <Pressable style={st.ey} onPress={() => setShow((p) => !p)}><Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={colors.grey} /></Pressable></View>
          {errors.password && <Text style={st.e}>{errors.password}</Text>}
          {formData.password && formData.password.length < 8 && <Text style={st.hp}>At least 8 characters with uppercase, lowercase & a number</Text>}
        </View>
        <View style={st.f}><Text style={st.l}>{L.cp}</Text>
          <TextInput style={[st.input, errors.confirmPassword && st.errB]} placeholder="Repeat your password" placeholderTextColor={colors.greyLight} value={formData.confirmPassword} onChangeText={(v) => onChange('confirmPassword', v)} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
          {errors.confirmPassword && <Text style={st.e}>{errors.confirmPassword}</Text>}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { gap: spacing['2xl'] }, h: { gap: spacing.xs }, t: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.grey, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.whiteTransparent, borderRadius: borderRadius['5xl'], borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md }, hf: { flex: 1, gap: 6 }, f: { gap: 6 },
  l: { color: colors.inkLight, fontSize: 12.5, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.greyLight, borderRadius: borderRadius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 15, color: colors.ink, backgroundColor: colors.surface },
  errB: { borderColor: colors.rose, borderWidth: 1.5 }, w: { position: 'relative' }, up: { paddingRight: 44 },
  ui: { position: 'absolute', right: spacing.md, top: 12 }, pp: { paddingRight: 46 },
  ey: { position: 'absolute', right: spacing.md, top: 12 }, e: { color: colors.rose, fontSize: 12, fontWeight: '500' },
  hp: { color: colors.grey, fontSize: 11, lineHeight: 16 },
});