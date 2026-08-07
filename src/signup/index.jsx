import React, { useRef, useCallback } from 'react';
import { View, SafeAreaView, ScrollView, Pressable, StyleSheet, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { darkGradients, gradients, layout, shadows } from '../shared/theme';
import { useTheme } from '../shared/theme/ThemeContext';
import { useThemeStyles } from '../shared/theme/createStyles';
import logo from '../../assets/images/favicon.png';
import ProgressIndicator from './components/ProgressIndicator';
import { useSignupForm } from './hooks/useSignupForm';
import { validateStep } from './validation';
import { createCompleteAccount, uploadProfilePicture } from './signupService';
import { Button } from '../shared/components/Button';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2AcademicInfo from './steps/Step2AcademicInfo';
import Step3Profile from './steps/Step3Profile';
import Step4Confirmation from './steps/Step4Confirmation';

const STEP_LABELS = { 1: 'Basic Information', 2: 'Academic Information', 3: 'Your Profile', 4: 'Confirmation' };

export default function SignupFlow() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currentStep, formData, errors, updateField, goToStep, setErrors } = useSignupForm();
  const [loading, setLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const scrollRef = useRef(null);

  const handleNext = useCallback(() => {
    const stepErrors = validateStep(currentStep, formData);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (currentStep < 4) {
      goToStep(currentStep + 1);
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    }
  }, [currentStep, formData, setErrors, goToStep]);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setSubmitError('');
      let uploadedPhotoURL = '';
      if (formData.photoURI) {
        uploadedPhotoURL = await uploadProfilePicture(formData.photoURI, formData.username);
      }
      await createCompleteAccount({ ...formData, photoURL: uploadedPhotoURL });
      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error?.message || 'Unable to create account.';
      setSubmitError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1BasicInfo formData={formData} errors={errors} updateField={updateField} />;
      case 2: return <Step2AcademicInfo formData={formData} errors={errors} updateField={updateField} />;
      case 3: return <Step3Profile formData={formData} errors={errors} updateField={updateField} />;
      case 4: return <Step4Confirmation formData={formData} onEditStep={goToStep} />;
      default: return null;
    }
  };

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, paddingTop: 40, backgroundColor: c.background },
    flexFill: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.screenPadding, paddingTop: s.sm },
    logoBadge: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.whiteTransparent,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingVertical: s.sm, paddingHorizontal: s.md,
    },
    logoImage: { width: 24, height: 24 },
    logoBadgeText: { color: c.ink, fontWeight: '800', fontSize: 13 },
    backButton: {
      width: 40, height: 40, borderRadius: r.lg, backgroundColor: c.whiteTransparent,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault,
    },
    backButtonPressed: { opacity: 0.7 },
    stepLabelContainer: { alignItems: 'center', gap: 2, paddingHorizontal: layout.screenPadding, marginBottom: s.sm },
    stepLabelEyebrow: { color: c.brandText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    stepLabelTitle: { color: c.ink, fontSize: 16, fontWeight: '700' },
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, marginHorizontal: layout.screenPadding, marginBottom: s.sm,
      backgroundColor: c.redLight, borderWidth: 1, borderColor: c.redBorder, borderRadius: r.lg, padding: s.md,
    },
    errorText: { color: c.rose, fontSize: 13, fontWeight: '500', flex: 1 },
    scrollContent: { paddingHorizontal: layout.screenPadding, paddingBottom: s.lg },
    actionContainer: {
      paddingHorizontal: layout.screenPadding, paddingVertical: s.lg,
      paddingBottom: Platform.OS === 'ios' ? s['3xl'] : s.lg,
      backgroundColor: c.whiteTransparent, borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={isDark ? darkGradients.auth : gradients.auth} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image source={logo} style={styles.logoImage} contentFit="contain" />
            <Text style={styles.logoBadgeText}>Unihelp</Text>
          </View>
          {currentStep > 1 && (
            <Pressable
              onPress={() => goToStep(currentStep - 1)}
              style={({ pressed }) => [styles.backButton, shadows.sm, pressed && styles.backButtonPressed]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
          )}
        </View>
        <ProgressIndicator currentStep={currentStep} totalSteps={4} />
        <View style={styles.stepLabelContainer}>
          <Text style={styles.stepLabelEyebrow}>Step {currentStep} of 4</Text>
          <Text style={styles.stepLabelTitle}>{STEP_LABELS[currentStep]}</Text>
        </View>
        {submitError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.rose} />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        )}
        <ScrollView
          ref={scrollRef}
          style={styles.flexFill}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
        <View style={styles.actionContainer}>
          {currentStep === 4
            ? <Button label="Create Account" onPress={handleSubmit} loading={loading} fullWidth icon="checkmark-circle" iconPosition="left" size="lg" />
            : <Button label="Continue" onPress={handleNext} fullWidth icon="arrow-forward" iconPosition="right" size="lg" />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}