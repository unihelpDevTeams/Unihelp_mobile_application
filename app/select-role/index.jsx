import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import InfoPage from '../../src/shared/screens/InfoPage';
import { useAuth } from '../../context/AuthContext';

export default function SelectRolePage() {
  const router = useRouter();
  const { saveRole } = useAuth();

  const chooseRole = async (role) => {
    await saveRole(role);
    router.replace('/(tabs)');
  };

  return (
    <InfoPage
      title="Select Role"
      subtitle="Match the website role experience."
      sections={[
        { title: 'University', text: 'Access uploads, GPA tools, and study features.' },
      ]}
    >
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => chooseRole('university')}>
          <Text style={styles.buttonText}>University</Text>
        </Pressable>
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
