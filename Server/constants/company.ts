export const COMPANY_INFO = {
  name: 'XYZ Company Ltd. Ltd.',
  address: '22 Macoya Road West, Macoya Industrial Estate, Tunapuna',
  country: 'Trinidad & Tobago',
  phone: '+1(868)739-5025',
  website: 'www.royaldatesgalore.com',
  email: 'office@royaldatesgalore.com',
} as const;

export const COMPANY_FULL_ADDRESS = `${COMPANY_INFO.address}. ${COMPANY_INFO.country}`;
console.log(COMPANY_FULL_ADDRESS);

export const TAX_RATE = 12.5;
export const CURRENCY = 'TTD';
export const PAYMENT_TERMS = 'Net 7';
export const PAYMENT_METHOD = 'Cash';
