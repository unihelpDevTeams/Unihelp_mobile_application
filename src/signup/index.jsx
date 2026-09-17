import React, { useRef, useCallback } from 'react';
import { View, SafeAreaView, ScrollView, Pressable, StyleSheet, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { darkGradients, gradients, layout } from '../shared/theme';
import { useTheme } from '../shared/theme/ThemeContext';
import { useThemeStyles } from '../shared/theme/createStyles';
import logo from '../../assets/images/favicon.png';
import ProgressIndicator from './components/ProgressIndicator';
import { useSignupForm } from './hooks/useSignupForm';
import { validateStep } from './validation';
import { createCompleteAccount, uploadProfilePicture } from './signupService';
import { deleteCloudinaryAssets } from '../../services/mediaCleanup';
import { Button } from '../shared/components/Button';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2AcademicInfo from './steps/Step2AcademicInfo';
import Step3HeardFrom from './steps/Step3HeardFrom';
import Step4Profile from './steps/Step3Profile';
import Step5Confirmation from './steps/Step4Confirmation';

const STEP_LABELS = { 1: 'Basic Information', 2: 'Academic Information', 3: 'Where do you hear us from?', 4: 'Your Profile', 5: 'Confirmation' };

const getSignupErrorMessage = (error) => {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in instead.',
    'auth/username-already-in-use': 'That username is already taken. Please choose another one.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Your password is too weak. Use at least 8 characters with uppercase, lowercase, and a number.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/operation-not-allowed': 'Email signup is currently unavailable. Please contact support.',
    'permission-denied': 'Your account could not be saved because access was denied. Please try again or contact support.',
    'unavailable': 'The service is temporarily unavailable. Check your connection and try again.',
  };
  return messages[code] || error?.message || 'Unable to create account. Please try again.';
};

export default function SignupFlow() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currentStep, formData, errors, updateField, goToStep, setErrors } = useSignupForm();
  const [loading, setLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const scrollRef = useRef(null);

  const handleNext = useCallback(() => {
    setSubmitError('');
    const stepErrors = validateStep(currentStep, formData);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (currentStep < 5) {
      goToStep(currentStep + 1);
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    }
  }, [currentStep, formData, setErrors, goToStep]);

  const handleSubmit = useCallback(async () => {
    try {
      const combinedErrors = [1, 2, 3].reduce((allErrors, step) => ({
        ...allErrors,
        ...validateStep(step, formData),
      }), {});
      if (Object.keys(combinedErrors).length > 0) {
        const firstInvalidStep = Object.keys(combinedErrors).some((field) => ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'].includes(field))
          ? 1
          : Object.keys(combinedErrors).some((field) => ['university', 'department', 'studentType', 'level'].includes(field))
            ? 2
            : 3;
        goToStep(firstInvalidStep);
        setErrors(combinedErrors);
        setSubmitError('Please review the highlighted fields before creating your account.');
        return;
      }

      setLoading(true);
      setSubmitError('');
      let uploadedPhotoURL = '';
      let uploadedPhotoAsset = null;
      if (formData.photoURI) {
        const uploadedPhoto = await uploadProfilePicture(formData.photoURI, formData.username);
        uploadedPhotoURL = uploadedPhoto.url;
        uploadedPhotoAsset = uploadedPhoto.asset;
      }
      try {
        await createCompleteAccount({ ...formData, photoURL: uploadedPhotoURL, photoAsset: uploadedPhotoAsset });
        
        const { auth } = require('../../firebase/config');
        const { sendEmailVerification } = require('firebase/auth');
        if (!auth.currentUser) {
          throw new Error('Your account was created, but the verification email could not be sent. Please log in and resend it.');
        }
        await sendEmailVerification(auth.currentUser);

        router.replace({ pathname: '/(auth)/verify-email', params: { email: formData.email } });
      } catch (accountError) {
        if (uploadedPhotoAsset) {
          await deleteCloudinaryAssets({ assets: [uploadedPhotoAsset] }).catch(() => {});
        }
        throw accountError;
      }
    } catch (error) {
      const errorMessage = getSignupErrorMessage(error);
      setSubmitError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, goToStep, router, setErrors]);

  const confirmSubmit = useCallback(() => {
    if (loading) return;
    Alert.alert(
      'Create your account?',
      'Please confirm that your signup details are correct.',
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'Create Account', style: 'default', onPress: handleSubmit },
      ]
    );
  }, [handleSubmit, loading]);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1BasicInfo formData={formData} errors={errors} updateField={updateField} />;
      case 2: return <Step2AcademicInfo formData={formData} errors={errors} updateField={updateField} />;
      case 3: return <Step3HeardFrom formData={formData} errors={errors} updateField={updateField} />;
      case 4: return <Step4Profile formData={formData} errors={errors} updateField={updateField} />;
      case 5: return <Step5Confirmation formData={formData} onEditStep={goToStep} />;
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
      <KeyboardAvoidingView style={styles.flexFill} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image source={logo} style={styles.logoImage} contentFit="contain" />
            <Text style={styles.logoBadgeText}>Unihelp</Text>
          </View>
          {(
            <Pressable
              onPress={() => {
                if (currentStep > 1) {
                  goToStep(currentStep - 1);
                } else {
                  router.replace('/(auth)/login');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={currentStep > 1 ? 'Go to previous signup step' : 'Return to sign in'}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Ionicons name={currentStep > 1 ? 'chevron-back' : 'close'} size={22} color={colors.ink} />
            </Pressable>
          )}
        </View>
        <ProgressIndicator currentStep={currentStep} totalSteps={5} />
        <View style={styles.stepLabelContainer}>
          <Text style={styles.stepLabelEyebrow}>Step {currentStep} of 5</Text>
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
          {currentStep === 5
            ? <Button label="Create Account" onPress={confirmSubmit} loading={loading} fullWidth icon="checkmark-circle" iconPosition="left" size="lg" />
            : <Button label="Continue" onPress={handleNext} fullWidth icon="arrow-forward" iconPosition="right" size="lg" />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
