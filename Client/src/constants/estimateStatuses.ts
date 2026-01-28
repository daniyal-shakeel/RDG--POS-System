/**
 * Estimate statuses matching the server model definition
 * Source: Server/models/Estimate.ts
 */
export type EstimateStatus = 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';

/**
 * Human-readable labels for estimate statuses
 */
export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  accepted: 'Accepted',
  converted: 'Converted',
  expired: 'Expired',
};

/**
 * Filter options for estimate status filters
 * Includes "all" option for showing all statuses
 */
export const ESTIMATE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: ESTIMATE_STATUS_LABELS.draft },
  { value: 'pending', label: ESTIMATE_STATUS_LABELS.pending },
  { value: 'accepted', label: ESTIMATE_STATUS_LABELS.accepted },
  { value: 'converted', label: ESTIMATE_STATUS_LABELS.converted },
  { value: 'expired', label: ESTIMATE_STATUS_LABELS.expired },
] as const;
