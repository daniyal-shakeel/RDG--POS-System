import http from 'k6/http';
import { check, fail } from 'k6';

// Run 1 iteration per VU with 1,000 VUs to generate 1,000 concurrent requests.
export const options = {
  vus: 10000,
  iterations: 10000,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5500';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

const payload = JSON.stringify({
  customerId: '696f3619da1c61430f9baa0b',
  salesRepId: '696f960e40a3138edcce8d12',
  items: [
    {
      productCode: 'RDG-005',
      description: 'Date & Nut Energy Bars 6pk',
      quantity: 1,
      price: 80,
      discount: 50,
    },
  ],
  paymentTerms: 'net 15',
  depositReceived: 40,
});

const params = () => ({
  headers: {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  },
  timeout: '60s',
});

export default function () {
  if (!AUTH_TOKEN) {
    fail('AUTH_TOKEN environment variable is required');
  }

  const res = http.post(`${BASE_URL}/api/v1/invoice`, payload, params());

  check(res, {
    'status is 201': (r) => r.status === 201,
  }) || fail(`Unexpected status ${res.status}: ${res.body}`);
}
