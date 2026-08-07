/**
 * Validation rules for the signup multi-step flow.
 */

export const VALIDATION_RULES = {
  firstName: {
    required: true,
    minLength: 1,
    message: 'First name is required.',
  },
  lastName: {
    required: true,
    minLength: 1,
    message: 'Last name is required.',
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-30 characters (letters, numbers, underscores).',
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message:
      'Password must be at least 8 characters with uppercase, lowercase, and a number.',
  },
  confirmPassword: {
    required: true,
    message: 'Passwords do not match.',
  },
};

export const ACADEMIC_LEVELS = [
  { label: '100 Level', value: '100' },
  { label: '200 Level', value: '200' },
  { label: '300 Level', value: '300' },
  { label: '400 Level', value: '400' },
  { label: '500 Level', value: '500' },
  { label: '600 Level', value: '600' },
  { label: 'Postgraduate', value: 'postgraduate' },
];

export const STUDENT_TYPES = [
  { label: 'University Student', value: 'university' },
];

export const INTEREST_OPTIONS = [
  'Programming',
  'Medicine',
  'Engineering',
  'Scholarships',
  'Business',
  'Artificial Intelligence',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Accounting',
  'Law',
];

/**
 * Validate a single field value.
 */
export function validateField(fieldName, value, allValues = {}) {
  const rule = VALIDATION_RULES[fieldName];
  if (!rule) return null;

  if (fieldName === 'confirmPassword') {
    return value !== allValues.password ? rule.message : null;
  }

  if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rule.message;
  }

  if (typeof value === 'string' && value.trim()) {
    if (rule.minLength && value.trim().length < rule.minLength) {
      return rule.message;
    }
    if (rule.maxLength && value.trim().length > rule.maxLength) {
      return rule.message;
    }
    if (rule.pattern && !rule.pattern.test(value.trim())) {
      return rule.message;
    }
  }

  return null;
}

/**
 * Validate an entire step.
 */
export function validateStep(step, data) {
  const errors = {};

  switch (step) {
    case 1: {
      const fields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];
      for (const field of fields) {
        const error = validateField(field, data[field], data);
        if (error) errors[field] = error;
      }
      break;
    }
    case 2: {
      if (!data.universityId) {
        errors.university = 'Please select a university.';
      }
      if (data.studentType === 'university') {
        if (!data.departmentId) {
          errors.department = 'Please select a department.';
        }
        if (!data.level) {
          errors.level = 'Please select your academic level.';
        }
      }
      if (!data.studentType) {
        errors.studentType = 'Please select your student type.';
      }
      break;
    }
    case 3: {
      // All fields are optional in step 3
      break;
    }
    default:
      break;
  }

  return errors;
}
