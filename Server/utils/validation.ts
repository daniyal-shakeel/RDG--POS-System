






const MALICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, 
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /expression\s*\(/gi, 
  /vbscript:/gi,
  /data:text\/html/gi,
  /&#x[0-9a-f]+;/gi, 
  /&#[0-9]+;/gi, 
];






export const containsMaliciousScript = (input: string): boolean => {
  if (typeof input !== 'string') {
    return false;
  }
  
  return MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
};







export const sanitizeString = (input: string, allowHtml: boolean = false): string => {
  if (typeof input !== 'string') {
    return '';
  }

  
  let sanitized = input.replace(/\0/g, '');

  if (!allowHtml) {
    
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    sanitized = sanitized.replace(/&[#\w]+;/g, '');
  }

  
  sanitized = sanitized.trim();

  return sanitized;
};







export const validateString = (
  input: any,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    checkMalicious?: boolean;
    fieldName?: string;
  } = {}
): { isValid: boolean; value: string | null; error?: string } => {
  const {
    required = false,
    minLength,
    maxLength,
    allowHtml = false,
    checkMalicious = true,
    fieldName,
  } = options;

  
  if (required && (!input || (typeof input === 'string' && input.trim().length === 0))) {
    console.log('fieldName', fieldName);
    console.log('input', input);
    console.log('required', required);
    const fieldLabel = fieldName ? fieldName.trim() : '';
    return {
      isValid: false,
      value: null,
      error: fieldLabel ? `${fieldLabel} is required` : 'This field is required',
    };
  }

  
  if (!input || (typeof input === 'string' && input.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  
  if (typeof input !== 'string') {
    return { isValid: false, value: null, error: 'Invalid input type' };
  }

  
  if (checkMalicious && containsMaliciousScript(input)) {
    return { isValid: false, value: null, error: 'Input contains potentially malicious content' };
  }

  
  const sanitized = sanitizeString(input, allowHtml);

  
  if (minLength !== undefined && sanitized.length < minLength) {
    return {
      isValid: false,
      value: null,
      error: `Minimum length is ${minLength} characters`,
    };
  }

  
  if (maxLength !== undefined && sanitized.length > maxLength) {
    return {
      isValid: false,
      value: null,
      error: `Maximum length is ${maxLength} characters`,
    };
  }

  return { isValid: true, value: sanitized };
};







export const validateName = (
  name: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  
  if (required && (!name || (typeof name === 'string' && name.trim().length === 0))) {
    return { isValid: false, value: null, error: 'Name is required' };
  }

  
  if (!name || (typeof name === 'string' && name.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  
  if (typeof name !== 'string') {
    return { isValid: false, value: null, error: 'Name must be a string' };
  }

  
  if (containsMaliciousScript(name)) {
    return { isValid: false, value: null, error: 'Name contains potentially malicious content' };
  }

  
  const sanitized = sanitizeString(name.trim());

  
  if (sanitized.length < 1) {
    return { isValid: false, value: null, error: 'Name must be at least 1 character' };
  }

  
  if (sanitized.length > 100) {
    return { isValid: false, value: null, error: 'Name must be less than 100 characters' };
  }

  
  
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

  
  const [localPart, domain] = sanitized.split('@');
  
  if (!localPart || !domain) {
    return { isValid: false, value: null, error: 'Invalid email format' };
  }

  
  if (localPart.length > 64) {
    return { isValid: false, value: null, error: 'Email local part is too long (max 64 characters)' };
  }

  
  if (domain.length > 255) {
    return { isValid: false, value: null, error: 'Email domain is too long' };
  }

  
  if (sanitized.length > 254) {
    return { isValid: false, value: null, error: 'Email is too long (max 254 characters)' };
  }

  return { isValid: true, value: sanitized };
};







export const validatePhone = (
  phone: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  
  if (required && (!phone || (typeof phone === 'string' && phone.trim().length === 0))) {
    return { isValid: false, value: null, error: 'Phone number is required' };
  }

  
  if (!phone || (typeof phone === 'string' && phone.trim().length === 0)) {
    return { isValid: true, value: '' };
  }

  
  if (typeof phone !== 'string') {
    return { isValid: false, value: null, error: 'Phone number must be a string' };
  }

  
  if (containsMaliciousScript(phone)) {
    return { isValid: false, value: null, error: 'Phone number contains potentially malicious content' };
  }

  
  let sanitized = phone.replace(/[^\d+\-().\s]/g, '').trim();

  
  const isInternational = sanitized.startsWith('+');
  
  
  const digitsOnly = sanitized.replace(/[\s\-().]/g, '');

  
  const digitCount = isInternational ? digitsOnly.length - 1 : digitsOnly.length;

  
  
  
  if (isInternational) {
    if (digitCount < 1 || digitCount > 15) {
      return { isValid: false, value: null, error: 'International phone number must have 1-15 digits after the + sign' };
    }
    
    if (digitsOnly.length < 2 || !/^\+\d+$/.test(digitsOnly)) {
      return { isValid: false, value: null, error: 'Invalid international phone format. Use format: +1234567890' };
    }
  } else {
    
    if (digitCount < 7 || digitCount > 15) {
      return { isValid: false, value: null, error: 'Phone number must be between 7 and 15 digits' };
    }
    
    if (!/^\d+$/.test(digitsOnly)) {
      return { isValid: false, value: null, error: 'Phone number must contain only digits (or use international format: +1234567890)' };
    }
  }

  
  return { isValid: true, value: sanitized };
};








export const validateAddress = (
  address: any,
  required: boolean = false
): { isValid: boolean; value: any | null; error?: string } => {
  
  if (required && (!address || typeof address !== 'object' || Array.isArray(address))) {
    return { isValid: false, value: null, error: 'Address is required' };
  }

  
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    return { isValid: true, value: null };
  }

  
  const allowedFields = ['street', 'city', 'state', 'postalCode', 'country'];
  
  
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

  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id.trim())) {
    return { isValid: false, value: null, error: 'Invalid ID format' };
  }

  return { isValid: true, value: id.trim() };
};

