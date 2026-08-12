import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const C = { ink: '#0F172A', soft: '#64748B', border: '#E2E8F0', w: '#FFF', ind: '#6366F1' };


function AddUniversityForm() {
  const [f, setF] = useState({ name: '', shortName: '', state: '', country: 'Nigeria' });
  const [s, setS] = useState(false);
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
    try { setS(true); await addDoc(collection(db, 'universities'), { ...f, name: f.name.trim(), shortName: f.shortName.trim(), state: f.state.trim(), createdAt: serverTimestamp() }); Alert.alert('Success', 'Added!'); setF({ name: '', shortName: '', state: '', country: 'Nigeria' }); }
    catch (e) { Alert.alert('Error', e?.message || 'Failed.'); } finally { setS(false); }
  };
  return (<View style={st.card}><Text style={st.ct}>Add New University</Text><TextInput style={st.i} placeholder="University Name" placeholderTextColor="#94A3B8" value={f.name} onChangeText={(v) => u('name', v)} /><TextInput style={st.i} placeholder="Short Name (e.g. UNILAG)" placeholderTextColor="#94A3B8" value={f.shortName} onChangeText={(v) => u('shortName', v)} /><TextInput style={st.i} placeholder="State" placeholderTextColor="#94A3B8" value={f.state} onChangeText={(v) => u('state', v)} /><Pressable style={[st.btn, s && { opacity: 0.6 }]} onPress={save} disabled={s}>{s ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="add-circle-outline" size={18} color="#fff" /><Text style={st.bt}>Add University</Text></>}</Pressable></View>);
}

function AddDepartmentForm() {
  const [f, setF] = useState({ name: '', faculty: '', universityId: '' });
  const [s, setS] = useState(false);
  const u = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name.trim() || !f.universityId.trim()) { Alert.alert('Error', 'Name and University ID required.'); return; }
    try { setS(true); await addDoc(collection(db, 'departments'), { ...f, name: f.name.trim(), faculty: f.faculty.trim(), universityId: f.universityId.trim(), createdAt: serverTimestamp() }); Alert.alert('Success', 'Added!'); setF({ name: '', faculty: '', universityId: '' }); }
    catch (e) { Alert.alert('Error', e?.message || 'Failed.'); } finally { setS(false); }
  };
  return (<View style={st.card}><Text style={st.ct}>Add New Department</Text><Text style={st.cs}>Need the university&apos;s Firestore document ID.</Text><TextInput style={st.i} placeholder="Department Name" placeholderTextColor="#94A3B8" value={f.name} onChangeText={(v) => u('name', v)} /><TextInput style={st.i} placeholder="Faculty" placeholderTextColor="#94A3B8" value={f.faculty} onChangeText={(v) => u('faculty', v)} /><TextInput style={st.i} placeholder="University Doc ID" placeholderTextColor="#94A3B8" value={f.universityId} onChangeText={(v) => u('universityId', v)} /><Pressable style={[st.btn, s && { opacity: 0.6 }]} onPress={save} disabled={s}>{s ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="add-circle-outline" size={18} color="#fff" /><Text style={st.bt}>Add Department</Text></>}</Pressable></View>);
}

export default function UniversityManager() {
  return (<ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}><AddUniversityForm /><AddDepartmentForm /></ScrollView>);
}

const st = StyleSheet.create({
  card: { backgroundColor: C.w, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  ct: { color: C.ink, fontSize: 15, fontWeight: '800' }, cs: { color: C.soft, fontSize: 12, lineHeight: 18 },
  i: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, backgroundColor: C.w },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ind, borderRadius: 12, paddingVertical: 12 },
  bt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});