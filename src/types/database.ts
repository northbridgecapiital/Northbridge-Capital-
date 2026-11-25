export interface ProfileRecord {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  phone?: string | null;
  country?: string | null;
  verification_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface AccountRecord {
  id: string;
  user_id?: string | null;
  account_number?: string | null;
  currency?: string | null;
  status?: string | null;
  balance?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface HoldingRecord {
  id: string;
  user_id?: string | null;
  account_id?: string | null;
  asset_name?: string | null;
  name?: string | null;
  symbol?: string | null;
  asset_category?: string | null;
  category?: string | null;
  quantity?: number | string | null;
  reported_value?: number | string | null;
  value?: number | string | null;
  market_value?: number | string | null;
  currency?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export type FundAdjustmentCategory =
  | 'Verified deposit credit'
  | 'Authorized withdrawal debit'
  | 'Refund'
  | 'Account correction'
  | 'Reversal'
  | 'Approved promotional credit';

export interface LedgerEntryRecord {
  id: string;
  transaction_uid?: string | null;
  user_id?: string | null;
  account_id?: string | null;
  created_at?: string | null;
  posted_at?: string | null;
  description?: string | null;
  memo?: string | null;
  reference?: string | null;
  category?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  entry_type?: string | null;
  type?: string | null;
  status?: string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  executed_by?: string | null;
  is_manual_adjustment?: boolean | null;
  [key: string]: unknown;
}

export interface FinancialRequestRecord {
  id: string;
  user_id?: string | null;
  account_id?: string | null;
  request_type?: string | null;
  type?: string | null;
  amount?: number | string | null;
  fee_amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payout_destination?: string | null;
  receipt_reference?: string | null;
  notes?: string | null;
  reason?: string | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface SupportThreadMessage {
  id: string;
  user_id?: string | null;
  thread_id?: string | null;
  category?: string | null;
  subject?: string | null;
  message?: string | null;
  body?: string | null;
  content?: string | null;
  attachment_name?: string | null;
  sender_role?: string | null;
  sender_id?: string | null;
  is_admin?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface BroadcastRecord {
  id: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  content?: string | null;
  category?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  [key: string]: unknown;
}

export interface LeadRecord {
  id?: string;
  full_name?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  source?: string | null;
  status?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface AdminActionLogRecord {
  id: string;
  admin_id?: string | null;
  action?: string | null;
  target_user_id?: string | null;
  target_id?: string | null;
  details?: unknown;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface CommunityCommentRecord {
  id: string;
  broadcast_id: string;
  user_id: string;
  author_name?: string | null;
  comment: string;
  status?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'FINANCE_ADMIN'
  | 'INVESTMENT_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'COMPLIANCE_ADMIN';

export interface AdminUserRecord {
  user_id: string;
  email?: string | null;
  role: AdminRole;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface ComplianceReviewRecord {
  id: string;
  user_id: string;
  account_id?: string | null;
  review_type: string;
  status: 'pending_review' | 'verified' | 'flagged' | 'restricted' | 'cleared' | string;
  risk_level: 'low' | 'medium' | 'high' | string;
  notes?: string | null;
  reviewed_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface InvestmentProductRecord {
  id: string;
  name: string;
  category: string;
  currency: string;
  min_amount: number | string;
  duration_months: number;
  contractual_terms: string;
  risk_classification: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientInvestmentRecord {
  id: string;
  user_id: string;
  account_id?: string | null;
  product_id?: string | null;
  product_name: string;
  reference_number: string;
  principal_amount: number | string;
  recorded_earnings: number | string;
  currency: string;
  contractual_terms?: string | null;
  start_date?: string | null;
  maturity_date?: string | null;
  status: 'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled' | string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientNotificationRecord {
  id: string;
  user_id: string;
  category: string;
  title: string;
  message: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PayoutDestinationRecord {
  id: string;
  user_id: string;
  label: string;
  method_type: string;
  institution_name: string;
  account_ending: string;
  currency: string;
  is_verified: boolean;
  created_at?: string | null;
}

export interface VerificationDocumentRecord {
  id: string;
  user_id: string;
  document_type: string;
  document_reference: string;
  file_name?: string | null;
  status: 'pending_review' | 'verified' | 'rejected' | string;
  reviewer_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  rpcMissing?: boolean;
  tableMissing?: boolean;
}
