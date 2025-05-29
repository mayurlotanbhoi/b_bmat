// /src/utils/validation.ts
import * as yup from 'yup';

// Validation schema for user registration
const registerSchema = yup.object().shape({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .required('Password is required'),
});

// Validation schema for user login
const loginSchema = yup.object().shape({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export { registerSchema, loginSchema };
