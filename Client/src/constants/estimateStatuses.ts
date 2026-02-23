



export type EstimateStatus = 'draft' | 'pending' | 'accepted' | 'converted' | 'expired';




export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  accepted: 'Accepted',
  converted: 'Converted',
  expired: 'Expired',
};





export const ESTIMATE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: ESTIMATE_STATUS_LABELS.draft },
  { value: 'pending', label: ESTIMATE_STATUS_LABELS.pending },
  { value: 'accepted', label: ESTIMATE_STATUS_LABELS.accepted },
  { value: 'converted', label: ESTIMATE_STATUS_LABELS.converted },
  { value: 'expired', label: ESTIMATE_STATUS_LABELS.expired },
] as const;
