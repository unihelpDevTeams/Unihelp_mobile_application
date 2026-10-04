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
  { label: '100 level', value: '100 level' },
  { label: '200 level', value: '200 level' },
  { label: '300 level', value: '300 level' },
  { label: '400 level', value: '400 level' },
  { label: '500 level', value: '500 level' },
  { label: '600 level', value: '600 level' },
  { label: 'ND 1', value: 'ND 1' },
  { label: 'ND 2', value: 'ND 2' },
  { label: 'HND 1', value: 'HND 1' },
  { label: 'HND 2', value: 'HND 2' },
];

export const GENDER_OPTIONS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Another identity', value: 'another_identity' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export function parseDateOfBirth(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const dateString = trimmedValue.includes('T') ? trimmedValue.split('T')[0] : trimmedValue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatDateOfBirth(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateOfBirth(value, now = new Date()) {
  const date = value instanceof Date ? value : parseDateOfBirth(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const earliest = new Date(1900, 0, 1);
  return date >= earliest && date <= today;
}

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
  'comedian',
  'Politics',
  'Sports',
  'Music',
  'Art',
  'Travel',
  'Food',
  'Gaming',
  'Fitness',
  'Photography',
  'Fashion',
  'Technology',
  'Environment',
  'History',
  'Psychology',
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
      if (!data.departmentId) {
        errors.department = 'Please select a department.';
      }
      if (!data.level) {
        errors.level = 'Please select your academic level.';
      }
      break;
    }
    case 3: {
      if (!data.heardFrom) {
        errors.heardFrom = 'Please tell us where you heard about UniHelp.';
      }
      if ((data.heardFrom === 'Other' || data.heardFrom === 'other') && !String(data.heardFromOther || '').trim()) {
        errors.heardFromOther = 'Please tell us which source or partner you heard about us from.';
      }
      break;
    }
    case 4: {
      if (!data.photoURI) {
        errors.photoURI = 'Please add a profile picture to continue.';
      }
      if (data.gender && !GENDER_OPTIONS.some((option) => option.value === data.gender)) {
        errors.gender = 'Please select a valid gender option.';
      }
      if (data.dateOfBirth && !isValidDateOfBirth(data.dateOfBirth)) {
        errors.dateOfBirth = 'Please select a valid date that is not in the future.';
      }
      break;
    }
    default:
      break;
  }

  return errors;
}
