import { useState, useCallback, useRef } from 'react';
import { validateStep } from '../validation';

const INITIAL_FORM_DATA = {
  // Step 1
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  // Step 2
  universityId: '',
  universityName: '',
  departmentId: '',
  departmentName: '',
  faculty: '',
  level: '',
  studentType: '',
  // Step 3
  photoURI: null,
  photoURL: '',
  bio: '',
  interests: [],
};

const TOTAL_STEPS = 4;

/**
 * Central hook managing multi-step signup form state, validation, and navigation.
 */
export function useSignupForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Clear error for this field when user edits
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const updateMultiple = useCallback((fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    const touchedUpdates = {};
    const errorUpdates = { ...errors };
    for (const key of Object.keys(fields)) {
      touchedUpdates[key] = true;
      if (errorUpdates[key]) delete errorUpdates[key];
    }
    setTouched((prev) => ({ ...prev, ...touchedUpdates }));
    setErrors(errorUpdates);
  }, [errors]);

  const validateAndGoNext = useCallback(() => {
    const stepErrors = validateStep(currentStep, formDataRef.current);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length === 0) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep((prev) => prev + 1);
        return true;
      }
    }
    return false;
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  }, [currentStep]);

  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
      setErrors({});
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setErrors({});
    setTouched({});
  }, []);

  const setStepErrors = useCallback((stepErrors) => {
    setErrors(stepErrors);
  }, []);

  return {
    currentStep,
    formData,
    errors,
    touched,
    totalSteps: TOTAL_STEPS,
    updateField,
    updateMultiple,
    validateAndGoNext,
    goBack,
    goToStep,
    resetForm,
    setErrors: setStepErrors,
  };
}
