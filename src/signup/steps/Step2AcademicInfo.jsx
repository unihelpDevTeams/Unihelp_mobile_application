import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../shared/theme';
import SearchableDropdown from '../components/SearchableDropdown';
import SchoolTypeFilter from '../../shared/components/SchoolTypeFilter';
import { useUniversities } from '../hooks/useUniversities';
import { useDepartments } from '../hooks/useDepartments';
import { ACADEMIC_LEVELS } from '../validation';

export default function Step2AcademicInfo({ formData, errors, updateField }) {
  const { universities, loading: ul, searchText: us, setSearchText: sus, loadMore: lmu, schoolType, setSchoolType } = useUniversities();
  const { departments, loading: dl, searchText: ds, setSearchText: sds, selectUniversity } = useDepartments();

  useEffect(() => {
    if (formData.universityId) selectUniversity(formData.universityId);
  }, [formData.universityId, selectUniversity]);

  const onUni = (i) => {
    updateField('universityId', i.id);
    updateField('universityName', i.name);
    updateField('departmentId', '');
    updateField('departmentName', '');
    updateField('faculty', '');
    selectUniversity(i.id);
  };
  const onDept = (i) => {
    updateField('departmentId', i.id);
    updateField('departmentName', i.name);
    updateField('faculty', i.faculty || '');
  };
  const renderUniLabel = (i) => (i.shortName ? `${i.name} (${i.shortName})` : i.name);
  const renderDeptLabel = (i) => `${i.name}${i.faculty ? ` (${i.faculty})` : ''}`;

  return (
    <View style={st.c}>
      <View style={st.h}><Text style={st.t}>Academic Information</Text><Text style={st.sub}>Tell us about your academic background.</Text></View>
      <View style={st.card}>
        <SchoolTypeFilter value={schoolType} onChange={setSchoolType} />
        <SearchableDropdown label="School" placeholder="Search for your school..." data={universities} value={formData.universityId} onSelect={onUni} loading={ul} searchText={us} onSearchChange={sus} onLoadMore={lmu} icon="school-outline" renderItemLabel={renderUniLabel} error={errors.university} />
        <SearchableDropdown label="Department" placeholder="Search for your department..." data={departments} value={formData.departmentId} onSelect={onDept} loading={dl} searchText={ds} onSearchChange={sds} icon="layers-outline" renderItemLabel={renderDeptLabel} error={errors.department} />
        <View style={st.f}><Text style={st.l}>Academic Level</Text>
          <View style={st.grid}>{ACADEMIC_LEVELS.map((l) => { const s = formData.level === l.value; return (<Pressable key={l.value} style={({ pressed }) => [st.gi, s && st.giS, pressed && st.chP]} onPress={() => updateField('level', l.value)}><Text style={[st.gt, s && st.gtS]}>{l.label}</Text></Pressable>); })}</View>
          {errors.level && <Text style={st.e}>{errors.level}</Text>}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { gap: spacing['2xl'] }, h: { gap: spacing.xs }, t: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.grey, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.whiteTransparent, borderRadius: borderRadius['5xl'], borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.lg },
  f: { gap: 6 }, l: { color: colors.inkLight, fontSize: 12.5, fontWeight: '700' },
  errB: { borderColor: colors.rose, borderWidth: 1.5 }, e: { color: colors.rose, fontSize: 12, fontWeight: '500' },
  chP: { opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gi: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.canvasLight, borderWidth: 1, borderColor: colors.border },
  giS: { backgroundColor: colors.brand, borderColor: colors.brand }, gt: { fontSize: 13, fontWeight: '600', color: colors.ink },
  gtS: { color: colors.surface },
});
