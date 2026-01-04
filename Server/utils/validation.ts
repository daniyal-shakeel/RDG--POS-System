/**
 * Validation utilities for input sanitization and security checks
 */

/**
 * Common patterns for detecting malicious scripts and XSS attempts
 */
const MALICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /expression\s*\(/gi, // CSS expressions
  /vbscript:/gi,
  /data:text\/html/gi,
  /&#x[0-9a-f]+;/gi, // Hex encoded characters
  /&#[0-9]+;/gi, // Decimal encoded characters
];

/**
 * Checks if a string contains malicious scripts or XSS patterns
 * @param input - The string to check
 * @returns true if malicious content is detected, false otherwise
 */
export const containsMaliciousScript = (input: string): boolean => {
  if (typeof input !== 'string') {
    return false;
  }
  
  return MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
};

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @param allowHtml - Whether to allow HTML tags (default: false)
 * @returns Sanitized string
 */
export const sanitizeString = (input: string, allowHtml: boolean = false): string => {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  if (!allowHtml) {
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    // Remove HTML entities that could be used for XSS
    sanitized = sanitized.replace(/&[#\w]+;/g, '');
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Validates and sanitizes a string input
 * @param input - The string to validate
 * @param options - Validation options
 * @returns Object with isValid flag and sanitized value
 */
export const validateString = (
  input: any,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    checkMalicious?: boolean;
  } = {}
): { isValid: boolean; value: string | null; error?: string } => {
  const {
    required = false,
    minLength,
    maxLength,
    allowHtml = false,
    checkMalicious = true,
  } = options;

  // Check if required
  if (required && (!input || (typeof input === 'string' && input.trim().length === 0))) {
    return { isValid: false, value: null, error: 'This field is required' };
  }

  // If not required and empty, return valid
  if (!input || (typeof input === 'string' && input.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  // Ensure input is a string
  if (typeof input !== 'string') {
    return { isValid: false, value: null, error: 'Invalid input type' };
  }

  // Check for malicious scripts
  if (checkMalicious && containsMaliciousScript(input)) {
    return { isValid: false, value: null, error: 'Input contains potentially malicious content' };
  }

  // Sanitize the string
  const sanitized = sanitizeString(input, allowHtml);

  // Check minimum length
  if (minLength !== undefined && sanitized.length < minLength) {
    return {
      isValid: false,
      value: null,
      error: `Minimum length is ${minLength} characters`,
    };
  }

  // Check maximum length
  if (maxLength !== undefined && sanitized.length > maxLength) {
    return {
      isValid: false,
      value: null,
      error: `Maximum length is ${maxLength} characters`,
    };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates a name (letters, spaces, apostrophes, hyphens only)
 * @param name - The name to validate
 * @param required - Whether the name is required
 * @returns Object with isValid flag and sanitized value
 */
export const validateName = (
  name: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  // Check if required
  if (required && (!name || (typeof name === 'string' && name.trim().length === 0))) {
    return { isValid: false, value: null, error: 'Name is required' };
  }

  // If not required and empty, return valid
  if (!name || (typeof name === 'string' && name.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  // Ensure input is a string
  if (typeof name !== 'string') {
    return { isValid: false, value: null, error: 'Name must be a string' };
  }

  // Check for malicious scripts
  if (containsMaliciousScript(name)) {
    return { isValid: false, value: null, error: 'Name contains potentially malicious content' };
  }

  // Sanitize
  const sanitized = sanitizeString(name.trim());

  // Check minimum length
  if (sanitized.length < 1) {
    return { isValid: false, value: null, error: 'Name must be at least 1 character' };
  }

  // Check maximum length
  if (sanitized.length > 100) {
    return { isValid: false, value: null, error: 'Name must be less than 100 characters' };
  }

  // Name should only contain letters, spaces, apostrophes, and hyphens
  // Allows names like "John O'Brien", "Mary-Jane", "José", etc.
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;

  if (!nameRegex.test(sanitized)) {
    return { isValid: false, value: null, error: 'Name can only contain letters, spaces, apostrophes, and hyphens' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates an email address
 * @param email - The email to validate
 * @param required - Whether the email is required
 * @returns Object with isValid flag and sanitized value
 */
export const validateEmail = (
  email: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  // Check if required
  if (required && (!email || (typeof email === 'string' && email.trim().length === 0))) {
    return { isValid: false, value: null, error: 'Email is required' };
  }

  // If not required and empty, return valid
  if (!email || (typeof email === 'string' && email.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  // Ensure input is a string
  if (typeof email !== 'string') {
    return { isValid: false, value: null, error: 'Email must be a string' };
  }

  // Check for malicious scripts
  if (containsMaliciousScript(email)) {
    return { isValid: false, value: null, error: 'Email contains potentially malicious content' };
  }

  // Sanitize
  const sanitized = sanitizeString(email.toLowerCase().trim());

  // Enhanced email regex pattern (RFC 5322 compliant)
  // Allows: letters, numbers, dots, hyphens, underscores, plus signs before @
  // Domain: letters, numbers, dots, hyphens
  // TLD: at least 2 letters
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, value: null, error: 'Invalid email format. Email must be in format: user@example.com' };
  }

  // Check for consecutive dots
  if (sanitized.includes('..')) {
    return { isValid: false, value: null, error: 'Invalid email format: consecutive dots are not allowed' };
  }

  // Check that email doesn't start or end with dot
  if (sanitized.startsWith('.') || sanitized.endsWith('.') || sanitized.includes('@.') || sanitized.includes('.@')) {
    return { isValid: false, value: null, error: 'Invalid email format' };
  }

  // Split email to check local and domain parts
  const [localPart, domain] = sanitized.split('@');
  
  if (!localPart || !domain) {
    return { isValid: false, value: null, error: 'Invalid email format' };
  }

  // Check local part length (max 64 characters per RFC 5321)
  if (localPart.length > 64) {
    return { isValid: false, value: null, error: 'Email local part is too long (max 64 characters)' };
  }

  // Check domain length (max 255 characters per RFC 5321)
  if (domain.length > 255) {
    return { isValid: false, value: null, error: 'Email domain is too long' };
  }

  // Check total length (max 254 characters per RFC 5321)
  if (sanitized.length > 254) {
    return { isValid: false, value: null, error: 'Email is too long (max 254 characters)' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates a phone number
 * @param phone - The phone number to validate
 * @param required - Whether the phone is required
 * @returns Object with isValid flag and sanitized value
 */
export const validatePhone = (
  phone: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  // Check if required
  if (required && (!phone || (typeof phone === 'string' && phone.trim().length === 0))) {
    return { isValid: false, value: null, error: 'Phone number is required' };
  }

  // If not required and empty, return valid
  if (!phone || (typeof phone === 'string' && phone.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  // Ensure input is a string
  if (typeof phone !== 'string') {
    return { isValid: false, value: null, error: 'Phone number must be a string' };
  }

  // Check for malicious scripts
  if (containsMaliciousScript(phone)) {
    return { isValid: false, value: null, error: 'Phone number contains potentially malicious content' };
  }

  // Sanitize - remove all non-digit characters except +, -, spaces, parentheses, and periods
  let sanitized = phone.replace(/[^\d+\-().\s]/g, '').trim();

  // Check if phone starts with + (international format)
  const isInternational = sanitized.startsWith('+');
  
  // Remove spaces and common formatting characters for validation
  const digitsOnly = sanitized.replace(/[\s\-().]/g, '');

  // If international format, remove the + for digit count
  const digitCount = isInternational ? digitsOnly.length - 1 : digitsOnly.length;

  // Validate phone number format per E.164 standard
  // International: + followed by 1-15 digits
  // National: 7-15 digits
  if (isInternational) {
    if (digitCount < 1 || digitCount > 15) {
      return { isValid: false, value: null, error: 'International phone number must have 1-15 digits after the + sign' };
    }
    // Ensure + is followed by at least one digit
    if (digitsOnly.length < 2 || !/^\+\d+$/.test(digitsOnly)) {
      return { isValid: false, value: null, error: 'Invalid international phone format. Use format: +1234567890' };
    }
  } else {
    // National format: 7-15 digits
    if (digitCount < 7 || digitCount > 15) {
      return { isValid: false, value: null, error: 'Phone number must be between 7 and 15 digits' };
    }
    // Ensure it contains only digits
    if (!/^\d+$/.test(digitsOnly)) {
      return { isValid: false, value: null, error: 'Phone number must contain only digits (or use international format: +1234567890)' };
    }
  }

  // Return formatted phone (preserve + for international, otherwise return cleaned digits)
  return { isValid: true, value: sanitized };
};

/**
 * Validates an address object
 * Only allows expected fields: street, city, state, postalCode, country
 * @param address - The address object to validate
 * @param required - Whether the address is required
 * @returns Object with isValid flag and sanitized value
 */
export const validateAddress = (
  address: any,
  required: boolean = false
): { isValid: boolean; value: any | null; error?: string } => {
  // Check if required
  if (required && (!address || typeof address !== 'object' || Array.isArray(address))) {
    return { isValid: false, value: null, error: 'Address is required' };
  }

  // If not required and empty, return valid
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    return { isValid: true, value: null };
  }

  // Define allowed address fields
  const allowedFields = ['street', 'city', 'state', 'postalCode', 'country'];
  
  // Check for unexpected fields
  const addressKeys = Object.keys(address);
  const unexpectedFields = addressKeys.filter(key => !allowedFields.includes(key));
  
  if (unexpectedFields.length > 0) {
    return { 
      isValid: false, 
      value: null, 
      error: `Address contains unexpected fields: ${unexpectedFields.join(', ')}. Only allowed fields are: ${allowedFields.join(', ')}` 
    };
  }

  const sanitizedAddress: any = {};

  // Validate and sanitize each address field
  if (address.street !== undefined) {
    if (address.street !== null && typeof address.street !== 'string') {
      return { isValid: false, value: null, error: 'Street must be a string' };
    }
    const streetValidation = validateString(address.street, {
      maxLength: 200,
      checkMalicious: true,
    });
    if (!streetValidation.isValid) {
      return { isValid: false, value: null, error: `Street: ${streetValidation.error}` };
    }
    sanitizedAddress.street = streetValidation.value || undefined;
  }

  if (address.city !== undefined) {
    if (address.city !== null && typeof address.city !== 'string') {
      return { isValid: false, value: null, error: 'City must be a string' };
    }
    const cityValidation = validateString(address.city, {
      maxLength: 100,
      checkMalicious: true,
    });
    if (!cityValidation.isValid) {
      return { isValid: false, value: null, error: `City: ${cityValidation.error}` };
    }
    sanitizedAddress.city = cityValidation.value || undefined;
  }

  if (address.state !== undefined) {
    if (address.state !== null && typeof address.state !== 'string') {
      return { isValid: false, value: null, error: 'State must be a string' };
    }
    const stateValidation = validateString(address.state, {
      maxLength: 100,
      checkMalicious: true,
    });
    if (!stateValidation.isValid) {
      return { isValid: false, value: null, error: `State: ${stateValidation.error}` };
    }
    sanitizedAddress.state = stateValidation.value || undefined;
  }

  if (address.postalCode !== undefined) {
    if (address.postalCode !== null && typeof address.postalCode !== 'string') {
      return { isValid: false, value: null, error: 'Postal code must be a string' };
    }
    const postalCodeValidation = validateString(address.postalCode, {
      maxLength: 20,
      checkMalicious: true,
    });
    if (!postalCodeValidation.isValid) {
      return { isValid: false, value: null, error: `Postal code: ${postalCodeValidation.error}` };
    }
    sanitizedAddress.postalCode = postalCodeValidation.value || undefined;
  }

  if (address.country !== undefined) {
    if (address.country !== null && typeof address.country !== 'string') {
      return { isValid: false, value: null, error: 'Country must be a string' };
    }
    const countryValidation = validateString(address.country, {
      maxLength: 100,
      checkMalicious: true,
    });
    if (!countryValidation.isValid) {
      return { isValid: false, value: null, error: `Country: ${countryValidation.error}` };
    }
    sanitizedAddress.country = countryValidation.value || undefined;
  }

  return { isValid: true, value: sanitizedAddress };
};

/**
 * Validates an ObjectId string
 * @param id - The ID to validate
 * @param required - Whether the ID is required
 * @returns Object with isValid flag and value
 */
export const validateObjectId = (
  id: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  if (required && (!id || (typeof id === 'string' && id.trim().length === 0))) {
    return { isValid: false, value: null, error: 'ID is required' };
  }

  if (!id || (typeof id === 'string' && id.trim().length === 0)) {
    return { isValid: true, value: null };
  }

  if (typeof id !== 'string') {
    return { isValid: false, value: null, error: 'ID must be a string' };
  }

  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id.trim())) {
    return { isValid: false, value: null, error: 'Invalid ID format' };
  }

  return { isValid: true, value: id.trim() };
};

