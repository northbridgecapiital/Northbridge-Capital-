import { supabase, supabaseConfigError } from './supabase';
import { normalizeAdminRole } from './adminPermissions';
import type {
  AccountRecord,
  AdminActionLogRecord,
  AdminRole,
  AdminUserRecord,
  ApiResult,
  BroadcastRecord,
  ClientInvestmentRecord,
  ClientNotificationRecord,
  CommunityCommentRecord,
  ComplianceReviewRecord,
  FinancialRequestRecord,
  FundAdjustmentCategory,
  HoldingRecord,
  InvestmentProductRecord,
  LeadRecord,
  LedgerEntryRecord,
  PayoutDestinationRecord,
  ProfileRecord,
  SupportThreadMessage,
  VerificationDocumentRecord,
} from '../types/database';

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function isMissingRpcError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as PostgrestLikeError;
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === 'PGRST202' ||
    e.code === '42883' ||
    msg.includes('could not find the function') ||
    (msg.includes('function') && msg.includes('does not exist'))
  );
}

export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as PostgrestLikeError;
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

export function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as PostgrestLikeError;
  const msg = (e.message || '').toLowerCase();
  return e.code === '42703' || (msg.includes('column') && msg.includes('does not exist'));
}

export function formatSafeDatabaseError(err: unknown, fallbackMessage: string): string {
  if (!err || typeof err !== 'object') {
    return fallbackMessage;
  }
  const e = err as PostgrestLikeError;
  const msg = (e.message || '').toLowerCase();

  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetcherror') ||
    msg.includes('load failed')
  ) {
    return 'Unable to connect to the Supabase project. Verify VITE_SUPABASE_URL and network connectivity.';
  }
  if (isMissingTableError(err)) {
    const rawMsg = e.message || '';
    const match =
      rawMsg.match(/relation\s+"?([a-zA-Z0-9_.]+)"?\s+does not exist/i) ||
      rawMsg.match(/table\s+'?([a-zA-Z0-9_.]+)'?/i);
    const tableName = match?.[1];
    return tableName
      ? `The database table "${tableName}" does not exist yet in the connected Supabase schema. Run the SQL setup script in Supabase SQL Editor.`
      : 'This database table does not exist yet in the connected Supabase schema. Run the SQL setup script in Supabase SQL Editor.';
  }
  if (e.code === '42703' || (msg.includes('column') && msg.includes('does not exist'))) {
    const rawMsg = e.message || '';
    const match = rawMsg.match(/column\s+"?([a-zA-Z0-9_.]+)"?\s+does not exist/i);
    const colName = match?.[1];
    return colName
      ? `The connected Supabase schema is missing expected column "${colName}". Run the SQL setup script in Supabase SQL Editor.`
      : 'The connected Supabase schema is missing an expected column for this view.';
  }
  if (e.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Access to this operation is restricted by database security policies.';
  }
  if (e.code === '23505' || msg.includes('duplicate key')) {
    return 'A matching record already exists.';
  }
  if (e.code === '23503') {
    return 'The referenced account or client record could not be verified.';
  }
  if (e.code === '23514' || msg.includes('check constraint')) {
    const constraintMatch = (e.message || '').match(/constraint\s+"?([a-zA-Z0-9_]+)"?/i);
    const constraintName = constraintMatch?.[1];
    return constraintName
      ? `Database constraint "${constraintName}" rejected this value. Run the updated SQL setup script in Supabase SQL Editor.`
      : 'A legacy database constraint rejected this value. Run the updated SQL setup script in Supabase SQL Editor.';
  }
  if (e.code === '23502' || msg.includes('null value in column')) {
    const colMatch = (e.message || '').match(/column\s+"?([a-zA-Z0-9_]+)"?/i);
    const colName = colMatch?.[1];
    return colName
      ? `Required database column "${colName}" cannot be empty. Run the updated SQL setup script in Supabase SQL Editor.`
      : 'A required database column was missing or empty.';
  }
  if (e.code === '42804' || e.code === '22P02') {
    return e.message
      ? `Database column or value type mismatch (${e.code}): ${e.message}. Run the updated SQL setup script in Supabase SQL Editor.`
      : `Database column or value type mismatch (${e.code}). Run the updated SQL setup script in Supabase SQL Editor.`;
  }
  if (msg.includes('jwt') || msg.includes('session') || msg.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (e.code === 'P0001' && e.message) {
    return e.message;
  }
  if (isMissingRpcError(err)) {
    return 'This administrative function is not currently configured in the Supabase database.';
  }
  if (e.code && e.message) {
    return `${fallbackMessage} (${e.code}: ${e.message})`;
  }
  return fallbackMessage;
}

function getClientOrError<T>(): { client: NonNullable<typeof supabase> } | { failure: ApiResult<T> } {
  if (!supabase) {
    return {
      failure: {
        data: null,
        error:
          supabaseConfigError ||
          'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
      },
    };
  }
  return { client: supabase };
}

export async function fetchUserProfile(userId: string): Promise<ApiResult<ProfileRecord>> {
  const ctx = getClientOrError<ProfileRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: formatSafeDatabaseError(error, 'Unable to load client profile.') };
  }
  return { data: (data as ProfileRecord | null) ?? null, error: null };
}

export async function updateClientProfile(params: {
  userId: string;
  fullName: string;
  phone?: string;
  country: string;
}): Promise<ApiResult<ProfileRecord>> {
  const ctx = getClientOrError<ProfileRecord>();
  if ('failure' in ctx) return ctx.failure;

  const cleanName = params.fullName.trim();
  if (cleanName.length < 2) {
    return { data: null, error: 'Full name must be at least 2 characters.' };
  }

  const updatePayload: Record<string, unknown> = {
    full_name: cleanName.slice(0, 120),
    country: params.country.trim().slice(0, 80) || null,
  };
  if (params.phone !== undefined) {
    updatePayload.phone = params.phone.trim().slice(0, 40) || null;
  }

  const { data, error } = await ctx.client
    .from('profiles')
    .update(updatePayload)
    .eq('id', params.userId)
    .select()
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to update your profile details. Please submit a request via Support Centre for administrative assistance.'
      ),
    };
  }
  return { data: (data as ProfileRecord | null) ?? null, error: null };
}

export async function fetchUserAccount(userId: string): Promise<ApiResult<AccountRecord>> {
  const ctx = getClientOrError<AccountRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error && error.code === '42703') {
    // Fallback if accounts primary key matches auth.uid() directly without user_id column
    const fallback = await ctx.client
      .from('accounts')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (fallback.error) {
      return {
        data: null,
        error: formatSafeDatabaseError(fallback.error, 'Unable to load account details.'),
      };
    }
    return { data: (fallback.data as AccountRecord | null) ?? null, error: null };
  }

  if (error) {
    return { data: null, error: formatSafeDatabaseError(error, 'Unable to load account details.') };
  }
  return { data: (data as AccountRecord | null) ?? null, error: null };
}

export async function fetchUserHoldings(userId: string): Promise<ApiResult<HoldingRecord[]>> {
  const ctx = getClientOrError<HoldingRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    return { data: [], error: formatSafeDatabaseError(error, 'Unable to load portfolio holdings.') };
  }
  return { data: (data as HoldingRecord[]) ?? [], error: null };
}

export async function fetchUserLedger(userId: string): Promise<ApiResult<LedgerEntryRecord[]>> {
  const ctx = getClientOrError<LedgerEntryRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('account_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: formatSafeDatabaseError(error, 'Unable to load account ledger entries.') };
  }
  return { data: (data as LedgerEntryRecord[]) ?? [], error: null };
}

export async function fetchUserFinancialRequests(
  userId: string
): Promise<ApiResult<FinancialRequestRecord[]>> {
  const ctx = getClientOrError<FinancialRequestRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('financial_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: formatSafeDatabaseError(error, 'Unable to load financial requests.') };
  }
  return { data: (data as FinancialRequestRecord[]) ?? [], error: null };
}

export async function submitFinancialRequest(params: {
  userId: string;
  accountId?: string | null;
  requestType: string;
  amount: number;
  currency: string;
  notes: string;
  paymentMethod?: string;
  paymentReference?: string;
  payoutDestination?: string;
  feeAmount?: number;
  receiptReference?: string;
}): Promise<ApiResult<FinancialRequestRecord>> {
  const ctx = getClientOrError<FinancialRequestRecord>();
  if ('failure' in ctx) return ctx.failure;

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return { data: null, error: 'Please enter a valid positive amount.' };
  }
  if (!params.requestType.trim()) {
    return { data: null, error: 'Please select a request classification.' };
  }

  const insertPayload: Record<string, unknown> = {
    user_id: params.userId,
    request_type: params.requestType.trim(),
    amount: Number(params.amount.toFixed(2)),
    currency: params.currency.trim().toUpperCase(),
    notes: params.notes.trim().slice(0, 1000),
    status: 'pending',
  };
  if (params.accountId) insertPayload.account_id = params.accountId;
  if (params.paymentMethod) insertPayload.payment_method = params.paymentMethod.trim().slice(0, 80);
  if (params.paymentReference) insertPayload.payment_reference = params.paymentReference.trim().slice(0, 120);
  if (params.payoutDestination) insertPayload.payout_destination = params.payoutDestination.trim().slice(0, 200);
  if (typeof params.feeAmount === 'number' && Number.isFinite(params.feeAmount)) {
    insertPayload.fee_amount = Number(params.feeAmount.toFixed(2));
  }
  if (params.receiptReference) insertPayload.receipt_reference = params.receiptReference.trim().slice(0, 200);

  const { data, error } = await ctx.client
    .from('financial_requests')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to submit administrative request.'),
    };
  }
  return { data: data as FinancialRequestRecord, error: null };
}

export async function fetchUserSupportThreads(
  userId: string
): Promise<ApiResult<SupportThreadMessage[]>> {
  const ctx = getClientOrError<SupportThreadMessage[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('support_threads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error: formatSafeDatabaseError(error, 'Unable to load client support messages.') };
  }
  return { data: (data as SupportThreadMessage[]) ?? [], error: null };
}

export async function sendClientSupportMessage(params: {
  userId: string;
  subject: string;
  message: string;
  category?: string;
  attachmentName?: string;
  threadId?: string | null;
}): Promise<ApiResult<SupportThreadMessage>> {
  const ctx = getClientOrError<SupportThreadMessage>();
  if ('failure' in ctx) return ctx.failure;

  const cleanMessage = params.message.trim();
  const cleanSubject = params.subject.trim();
  if (!cleanMessage) {
    return { data: null, error: 'Please enter a message before sending.' };
  }

  const payload: Record<string, unknown> = {
    user_id: params.userId,
    subject: cleanSubject || 'Client Services Inquiry',
    message: cleanMessage.slice(0, 2000),
    sender_role: 'client',
    status: 'open',
  };

  if (params.category) payload.category = params.category.trim().slice(0, 80);
  if (params.attachmentName) payload.attachment_name = params.attachmentName.trim().slice(0, 160);
  if (params.threadId) payload.thread_id = params.threadId;

  const { data, error } = await ctx.client
    .from('support_threads')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to send support message.'),
    };
  }
  return { data: data as SupportThreadMessage, error: null };
}

export async function fetchBroadcasts(): Promise<ApiResult<BroadcastRecord[]>> {
  const ctx = getClientOrError<BroadcastRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { data: [], error: formatSafeDatabaseError(error, 'Unable to load announcements.') };
  }
  return { data: (data as BroadcastRecord[]) ?? [], error: null };
}

export async function fetchCommunityComments(): Promise<ApiResult<CommunityCommentRecord[]>> {
  const ctx = getClientOrError<CommunityCommentRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('community_comments')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: [],
        error: null,
        tableMissing: true,
      };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load community discussion entries.'),
    };
  }
  return { data: (data as CommunityCommentRecord[]) ?? [], error: null, tableMissing: false };
}

export async function submitCommunityComment(params: {
  broadcastId: string;
  userId: string;
  authorName: string;
  comment: string;
}): Promise<ApiResult<CommunityCommentRecord>> {
  const ctx = getClientOrError<CommunityCommentRecord>();
  if ('failure' in ctx) return ctx.failure;

  const cleanComment = params.comment.trim();
  if (cleanComment.length < 3) {
    return { data: null, error: 'Please enter at least 3 characters before posting.' };
  }

  const { data, error } = await ctx.client
    .from('community_comments')
    .insert({
      broadcast_id: params.broadcastId,
      user_id: params.userId,
      author_name: params.authorName.trim().slice(0, 120) || 'Client',
      comment: cleanComment.slice(0, 1200),
      status: 'published',
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: null,
        error:
          'The public.community_comments table is not yet configured in Supabase. Your comment was not posted.',
        tableMissing: true,
      };
    }
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to publish community response.'),
    };
  }
  return { data: data as CommunityCommentRecord, error: null };
}

export async function submitLeadInquiry(lead: LeadRecord): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const cleanEmail = lead.email.trim().toLowerCase();
  const cleanName = (lead.full_name || lead.name || '').trim();
  const cleanMessage = lead.message.trim();

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return { data: null, error: 'Please complete all required fields.' };
  }

  const { error } = await ctx.client.from('leads').insert({
    full_name: cleanName.slice(0, 120),
    email: cleanEmail.slice(0, 160),
    phone: lead.phone ? lead.phone.trim().slice(0, 40) : null,
    subject: lead.subject ? lead.subject.trim().slice(0, 160) : 'Private Client Inquiry',
    message: cleanMessage.slice(0, 2000),
    source: lead.source || 'website_contact',
  });

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to submit your inquiry at this moment.'),
    };
  }
  return { data: null, error: null };
}

// ==========================================
// Administrator Verification & RPC Operations
// ==========================================

export async function verifyAdminStatus(): Promise<{
  isAdmin: boolean;
  adminRole: AdminRole | null;
  roleRpcMissing: boolean;
  error: string | null;
  rpcMissing: boolean;
}> {
  if (!supabase) {
    return {
      isAdmin: false,
      adminRole: null,
      roleRpcMissing: false,
      error: 'Supabase client is not configured.',
      rpcMissing: false,
    };
  }

  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    return {
      isAdmin: false,
      adminRole: null,
      roleRpcMissing: false,
      error: formatSafeDatabaseError(error, 'Administrator verification could not be completed.'),
      rpcMissing: isMissingRpcError(error),
    };
  }

  if (data !== true) {
    return {
      isAdmin: false,
      adminRole: null,
      roleRpcMissing: false,
      error: null,
      rpcMissing: false,
    };
  }

  const roleRes = await supabase.rpc('get_admin_role');
  if (roleRes.error) {
    const missing = isMissingRpcError(roleRes.error);
    return {
      isAdmin: true,
      adminRole: 'SUPER_ADMIN',
      roleRpcMissing: missing,
      error: null,
      rpcMissing: false,
    };
  }

  return {
    isAdmin: true,
    adminRole: normalizeAdminRole(roleRes.data),
    roleRpcMissing: false,
    error: null,
    rpcMissing: false,
  };
}

export interface AdminWorkspaceDataset {
  profiles: ProfileRecord[];
  accounts: AccountRecord[];
  holdings: HoldingRecord[];
  investmentProducts: InvestmentProductRecord[];
  investmentProductsMissing: boolean;
  clientInvestments: ClientInvestmentRecord[];
  clientInvestmentsMissing: boolean;
  verificationDocuments: VerificationDocumentRecord[];
  verificationDocumentsMissing: boolean;
  ledger: LedgerEntryRecord[];
  requests: FinancialRequestRecord[];
  supportMessages: SupportThreadMessage[];
  broadcasts: BroadcastRecord[];
  communityComments: CommunityCommentRecord[];
  communityCommentsMissing: boolean;
  complianceReviews: ComplianceReviewRecord[];
  complianceReviewsMissing: boolean;
  adminUsers: AdminUserRecord[];
  adminUsersMissing: boolean;
  actionLogs: AdminActionLogRecord[];
  leads: LeadRecord[];
  warnings: string[];
}

export async function fetchAdminWorkspaceData(): Promise<ApiResult<AdminWorkspaceDataset>> {
  const ctx = getClientOrError<AdminWorkspaceDataset>();
  if ('failure' in ctx) return ctx.failure;

  const warnings: string[] = [];

  const sb = ctx.client;

  async function queryWithOrderFallback(
    table: string,
    orderCol: string,
    ascending: boolean,
    rowLimit?: number
  ) {
    let q = sb.from(table).select('*').order(orderCol, { ascending });
    if (rowLimit) q = q.limit(rowLimit);
    const first = await q;
    if (first.error && isMissingColumnError(first.error)) {
      let fallback = sb.from(table).select('*');
      if (rowLimit) fallback = fallback.limit(rowLimit);
      return await fallback;
    }
    return first;
  }

  const [
    profilesRes,
    accountsRes,
    holdingsRes,
    productsRes,
    clientInvRes,
    verDocsRes,
    ledgerRes,
    requestsRes,
    supportRes,
    broadcastsRes,
    commentsRes,
    complianceRes,
    adminUsersRes,
    logsRes,
    leadsRes,
  ] = await Promise.all([
    queryWithOrderFallback('profiles', 'created_at', false),
    queryWithOrderFallback('accounts', 'created_at', false),
    queryWithOrderFallback('holdings', 'created_at', false),
    queryWithOrderFallback('investment_products', 'created_at', false),
    queryWithOrderFallback('client_investments', 'created_at', false),
    queryWithOrderFallback('verification_documents', 'created_at', false, 200),
    queryWithOrderFallback('account_ledger', 'created_at', false, 2000),
    queryWithOrderFallback('financial_requests', 'created_at', false),
    queryWithOrderFallback('support_threads', 'created_at', true),
    queryWithOrderFallback('broadcasts', 'created_at', false, 100),
    queryWithOrderFallback('community_comments', 'created_at', false, 200),
    queryWithOrderFallback('compliance_reviews', 'created_at', false, 200),
    queryWithOrderFallback('admin_users', 'created_at', false),
    queryWithOrderFallback('admin_action_log', 'created_at', false, 500),
    queryWithOrderFallback('leads', 'created_at', false, 200),
  ]);

  if (profilesRes.error) warnings.push(`Profiles: ${formatSafeDatabaseError(profilesRes.error, 'Restricted or unavailable')}`);
  if (accountsRes.error) warnings.push(`Accounts: ${formatSafeDatabaseError(accountsRes.error, 'Restricted or unavailable')}`);
  if (holdingsRes.error) warnings.push(`Holdings: ${formatSafeDatabaseError(holdingsRes.error, 'Restricted or unavailable')}`);
  if (ledgerRes.error) warnings.push(`Account Ledger: ${formatSafeDatabaseError(ledgerRes.error, 'Restricted or unavailable')}`);
  if (requestsRes.error) warnings.push(`Financial Requests: ${formatSafeDatabaseError(requestsRes.error, 'Restricted or unavailable')}`);
  if (supportRes.error) warnings.push(`Support Threads: ${formatSafeDatabaseError(supportRes.error, 'Restricted or unavailable')}`);
  if (broadcastsRes.error) warnings.push(`Broadcasts: ${formatSafeDatabaseError(broadcastsRes.error, 'Restricted or unavailable')}`);

  const investmentProductsMissing = Boolean(productsRes.error && isMissingTableError(productsRes.error));
  if (productsRes.error && !investmentProductsMissing) {
    warnings.push(`Investment Products: ${formatSafeDatabaseError(productsRes.error, 'Restricted or unavailable')}`);
  }

  const clientInvestmentsMissing = Boolean(clientInvRes.error && isMissingTableError(clientInvRes.error));
  if (clientInvRes.error && !clientInvestmentsMissing) {
    warnings.push(`Client Investments: ${formatSafeDatabaseError(clientInvRes.error, 'Restricted or unavailable')}`);
  }

  const verificationDocumentsMissing = Boolean(verDocsRes.error && isMissingTableError(verDocsRes.error));
  if (verDocsRes.error && !verificationDocumentsMissing) {
    warnings.push(`Verification Documents: ${formatSafeDatabaseError(verDocsRes.error, 'Restricted or unavailable')}`);
  }

  const communityCommentsMissing = Boolean(commentsRes.error && isMissingTableError(commentsRes.error));
  if (commentsRes.error && !communityCommentsMissing) {
    warnings.push(`Community Comments: ${formatSafeDatabaseError(commentsRes.error, 'Restricted or unavailable')}`);
  }

  const complianceReviewsMissing = Boolean(complianceRes.error && isMissingTableError(complianceRes.error));
  if (complianceRes.error && !complianceReviewsMissing) {
    warnings.push(`Compliance Reviews: ${formatSafeDatabaseError(complianceRes.error, 'Restricted or unavailable')}`);
  }

  const adminUsersMissing = Boolean(adminUsersRes.error && isMissingTableError(adminUsersRes.error));
  if (adminUsersRes.error && !adminUsersMissing) {
    warnings.push(`Admin Users: ${formatSafeDatabaseError(adminUsersRes.error, 'Restricted or unavailable')}`);
  }

  if (logsRes.error) warnings.push(`Admin Action Log: ${formatSafeDatabaseError(logsRes.error, 'Restricted or unavailable')}`);
  if (leadsRes.error) warnings.push(`Leads: ${formatSafeDatabaseError(leadsRes.error, 'Restricted or unavailable')}`);

  return {
    data: {
      profiles: (profilesRes.data as ProfileRecord[]) ?? [],
      accounts: (accountsRes.data as AccountRecord[]) ?? [],
      holdings: (holdingsRes.data as HoldingRecord[]) ?? [],
      investmentProducts: (productsRes.data as InvestmentProductRecord[]) ?? [],
      investmentProductsMissing,
      clientInvestments: (clientInvRes.data as ClientInvestmentRecord[]) ?? [],
      clientInvestmentsMissing,
      verificationDocuments: (verDocsRes.data as VerificationDocumentRecord[]) ?? [],
      verificationDocumentsMissing,
      ledger: (ledgerRes.data as LedgerEntryRecord[]) ?? [],
      requests: (requestsRes.data as FinancialRequestRecord[]) ?? [],
      supportMessages: (supportRes.data as SupportThreadMessage[]) ?? [],
      broadcasts: (broadcastsRes.data as BroadcastRecord[]) ?? [],
      communityComments: (commentsRes.data as CommunityCommentRecord[]) ?? [],
      communityCommentsMissing,
      complianceReviews: (complianceRes.data as ComplianceReviewRecord[]) ?? [],
      complianceReviewsMissing,
      adminUsers: ((adminUsersRes.data as AdminUserRecord[]) ?? []).map((au) => ({
        ...au,
        role: normalizeAdminRole(au.role),
      })),
      adminUsersMissing,
      actionLogs: (logsRes.data as AdminActionLogRecord[]) ?? [],
      leads: (leadsRes.data as LeadRecord[]) ?? [],
      warnings,
    },
    error: null,
  };
}

export type AdminRequestDecision =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'settled';

export async function invokeAdminReviewRequest(params: {
  requestId: string;
  decision: AdminRequestDecision;
  adminNotes: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client.rpc('admin_review_request', {
    p_request_id: params.requestId,
    p_decision: params.decision,
    p_notes: params.adminNotes.trim(),
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_review_request(p_request_id, p_decision, p_notes) was not found or has a different signature. Ensure the secure RPC exists with SECURITY DEFINER and is_admin() verification.'
        : formatSafeDatabaseError(error, 'Unable to update financial request.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function invokeAdminUpdateProfile(params: {
  userId: string;
  fullName: string;
  country: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.fullName.trim()) {
    return { data: null, error: 'Client full name cannot be empty.' };
  }

  const { data, error } = await ctx.client.rpc('admin_update_profile', {
    p_user_id: params.userId,
    p_full_name: params.fullName.trim().slice(0, 120),
    p_country: params.country.trim().slice(0, 80),
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_update_profile(p_user_id, p_full_name, p_country) was not found. Execute the provided SQL setup script to enable administrative profile editing.'
        : formatSafeDatabaseError(error, 'Unable to update client profile.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export type AdminAccountStatus =
  | 'pending_review'
  | 'active'
  | 'restricted'
  | 'suspended'
  | 'closed';

export async function invokeAdminUpdateAccount(params: {
  accountId?: string | null;
  userId: string;
  status: AdminAccountStatus;
  currency: string;
  accountNumber?: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  const cleanCurrency = params.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
    return { data: null, error: 'Currency must be a valid 3-letter ISO code (e.g. USD, GBP, EUR, CHF).' };
  }

  const { data, error } = await ctx.client.rpc('admin_update_account', {
    p_account_id: params.accountId || null,
    p_user_id: params.userId,
    p_status: params.status,
    p_currency: cleanCurrency,
    p_account_number: params.accountNumber?.trim() || null,
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_update_account(p_account_id, p_user_id, p_status, p_currency, p_account_number) was not found. Execute the provided SQL setup script to enable account provisioning and status controls.'
        : formatSafeDatabaseError(error, 'Unable to update client account record.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function invokeAdminLedgerAdjustment(params: {
  mode: 'credit' | 'debit';
  accountId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  reference: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return { data: null, error: 'Adjustment amount must be a positive number.' };
  }
  if (!params.reason.trim()) {
    return { data: null, error: 'An administrative justification is mandatory for ledger entries.' };
  }

  const rpcName = params.mode === 'credit' ? 'admin_credit' : 'admin_debit';
  const { data, error } = await ctx.client.rpc(rpcName, {
    p_account_id: params.accountId,
    p_user_id: params.userId,
    p_amount: Number(params.amount.toFixed(2)),
    p_currency: params.currency.trim().toUpperCase(),
    p_reason: params.reason.trim(),
    p_reference: params.reference.trim(),
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? `The Supabase RPC function ${rpcName}(p_account_id, p_user_id, p_amount, p_currency, p_reason, p_reference) was not found or uses a different parameter signature. Configure this secure RPC in Supabase before posting administrative adjustments.`
        : formatSafeDatabaseError(error, `Unable to execute ${rpcName}.`),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function invokeAdminBroadcast(params: {
  title: string;
  message: string;
  category: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.title.trim() || !params.message.trim()) {
    return { data: null, error: 'Announcement title and body are required.' };
  }

  const { data, error } = await ctx.client.rpc('admin_broadcast', {
    p_title: params.title.trim(),
    p_message: params.message.trim(),
    p_category: params.category.trim() || 'Institutional Notice',
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_broadcast(p_title, p_message, p_category) was not found or uses a different parameter signature. Configure this secure RPC in Supabase to publish broadcasts.'
        : formatSafeDatabaseError(error, 'Unable to publish announcement.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function sendAdminSupportReply(params: {
  clientUserId: string;
  subject: string;
  message: string;
  threadId?: string | null;
  adminId: string;
}): Promise<ApiResult<SupportThreadMessage>> {
  const ctx = getClientOrError<SupportThreadMessage>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.message.trim()) {
    return { data: null, error: 'Reply message cannot be empty.' };
  }

  const payload: Record<string, unknown> = {
    user_id: params.clientUserId,
    subject: params.subject || 'Client Services Reply',
    message: params.message.trim().slice(0, 2000),
    sender_role: 'admin',
    sender_id: params.adminId,
    status: 'answered',
  };
  if (params.threadId) {
    payload.thread_id = params.threadId;
  }

  const { data, error } = await ctx.client
    .from('support_threads')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to send administrative reply.'),
    };
  }
  return { data: data as SupportThreadMessage, error: null };
}

export async function addAdminClientHolding(params: {
  userId: string;
  accountId?: string | null;
  assetName: string;
  assetCategory: string;
  quantity: number;
  reportedValue: number;
  currency: string;
}): Promise<ApiResult<HoldingRecord>> {
  const ctx = getClientOrError<HoldingRecord>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.assetName.trim() || !params.assetCategory.trim()) {
    return { data: null, error: 'Asset name and asset category are required.' };
  }
  if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
    return { data: null, error: 'Quantity must be a positive number.' };
  }
  if (!Number.isFinite(params.reportedValue) || params.reportedValue < 0) {
    return { data: null, error: 'Reported value must be zero or greater.' };
  }

  const payload: Record<string, unknown> = {
    user_id: params.userId,
    asset_name: params.assetName.trim().slice(0, 120),
    asset_category: params.assetCategory.trim().slice(0, 80),
    quantity: params.quantity,
    reported_value: Number(params.reportedValue.toFixed(2)),
    currency: params.currency.trim().toUpperCase(),
  };
  if (params.accountId) {
    payload.account_id = params.accountId;
  }

  const { data, error } = await ctx.client
    .from('holdings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to add holding record. Verify admin insert RLS policy on public.holdings.'
      ),
    };
  }
  return { data: data as HoldingRecord, error: null };
}

export async function updateAdminClientHolding(params: {
  holdingId: string;
  assetName: string;
  assetCategory: string;
  quantity: number;
  reportedValue: number;
  currency: string;
}): Promise<ApiResult<HoldingRecord>> {
  const ctx = getClientOrError<HoldingRecord>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.assetName.trim() || !params.assetCategory.trim()) {
    return { data: null, error: 'Asset name and category are required.' };
  }
  if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
    return { data: null, error: 'Quantity must be a positive number.' };
  }
  if (!Number.isFinite(params.reportedValue) || params.reportedValue < 0) {
    return { data: null, error: 'Reported value must be zero or greater.' };
  }

  const { data, error } = await ctx.client
    .from('holdings')
    .update({
      asset_name: params.assetName.trim().slice(0, 120),
      asset_category: params.assetCategory.trim().slice(0, 80),
      quantity: params.quantity,
      reported_value: Number(params.reportedValue.toFixed(2)),
      currency: params.currency.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.holdingId)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to update holding record. Verify admin update RLS policy on public.holdings.'
      ),
    };
  }
  return { data: data as HoldingRecord, error: null };
}

export async function deleteAdminClientHolding(holdingId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client.from('holdings').delete().eq('id', holdingId);
  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to remove holding record.'),
    };
  }
  return { data: null, error: null };
}

export type AdminSupportStatus = 'open' | 'under_review' | 'answered' | 'resolved' | 'closed';

export async function invokeAdminUpdateSupportStatus(params: {
  clientUserId: string;
  threadId?: string | null;
  subject: string;
  status: AdminSupportStatus;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client.rpc('admin_update_support_status', {
    p_user_id: params.clientUserId,
    p_thread_id: params.threadId || null,
    p_subject: params.subject,
    p_status: params.status,
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_update_support_status(p_user_id, p_thread_id, p_subject, p_status) was not found. Execute the provided SQL setup script to update support thread statuses.'
        : formatSafeDatabaseError(error, 'Unable to update support thread status.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function invokeAdminUpdateBroadcast(params: {
  broadcastId: string;
  title: string;
  message: string;
  category: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.title.trim() || !params.message.trim()) {
    return { data: null, error: 'Announcement title and body are required.' };
  }

  const { data, error } = await ctx.client.rpc('admin_update_broadcast', {
    p_broadcast_id: params.broadcastId,
    p_title: params.title.trim(),
    p_message: params.message.trim(),
    p_category: params.category.trim() || 'Institutional Notice',
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_update_broadcast(p_broadcast_id, p_title, p_message, p_category) was not found. Execute the provided SQL setup script to edit published announcements.'
        : formatSafeDatabaseError(error, 'Unable to update community announcement.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function deleteAdminBroadcast(broadcastId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client.from('broadcasts').delete().eq('id', broadcastId);
  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to remove community announcement. Verify admin delete RLS policy on public.broadcasts.'
      ),
    };
  }
  return { data: null, error: null };
}

export async function deleteAdminCommunityComment(commentId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client.from('community_comments').delete().eq('id', commentId);
  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to remove community comment. Verify admin delete RLS policy on public.community_comments.'
      ),
    };
  }
  return { data: null, error: null };
}

export async function updateAdminLeadStatus(
  leadId: string,
  status: 'new' | 'under_review' | 'contacted' | 'archived'
): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to update lead status. Run the provided SQL script to ensure leads.status and admin update RLS policy exist.'
      ),
    };
  }
  return { data: null, error: null };
}

export async function deleteAdminLead(leadId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client.from('leads').delete().eq('id', leadId);
  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(
        error,
        'Unable to remove lead inquiry. Verify admin delete RLS policy on public.leads.'
      ),
    };
  }
  return { data: null, error: null };
}

export async function invokeAdminComplianceReview(params: {
  userId: string;
  accountId?: string | null;
  reviewType: string;
  status: 'pending_review' | 'verified' | 'flagged' | 'restricted' | 'cleared';
  riskLevel: 'low' | 'medium' | 'high';
  notes: string;
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.notes.trim()) {
    return { data: null, error: 'Compliance review notes are required for audit traceability.' };
  }

  const { data, error } = await ctx.client.rpc('admin_submit_compliance_review', {
    p_user_id: params.userId,
    p_account_id: params.accountId || null,
    p_review_type: params.reviewType.trim() || 'KYC Verification',
    p_status: params.status,
    p_risk_level: params.riskLevel,
    p_notes: params.notes.trim().slice(0, 2000),
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_submit_compliance_review(...) was not found. Run the updated SQL script in Supabase SQL Editor.'
        : formatSafeDatabaseError(error, 'Unable to record compliance review.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

export async function invokeAdminManageRole(params: {
  targetEmail: string;
  role: AdminRole;
  action: 'assign' | 'revoke';
}): Promise<ApiResult<unknown>> {
  const ctx = getClientOrError<unknown>();
  if ('failure' in ctx) return ctx.failure;

  const cleanEmail = params.targetEmail.trim().toLowerCase();
  if (!cleanEmail) {
    return { data: null, error: 'Target administrator email is required.' };
  }

  const { data, error } = await ctx.client.rpc('admin_manage_role', {
    p_target_email: cleanEmail,
    p_role: params.role,
    p_action: params.action,
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC function admin_manage_role(...) was not found. Run the updated SQL script in Supabase SQL Editor.'
        : formatSafeDatabaseError(error, 'Unable to update administrator role permissions.'),
      rpcMissing: isMissingRpcError(error),
    };
  }
  return { data, error: null };
}

// ==========================================
// Client Portal Extended Endpoints
// ==========================================

export async function fetchUserNotifications(
  userId: string
): Promise<ApiResult<ClientNotificationRecord[]>> {
  const ctx = getClientOrError<ClientNotificationRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('client_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load notifications.'),
    };
  }
  return { data: (data as ClientNotificationRecord[]) ?? [], error: null, tableMissing: false };
}

export async function markNotificationRead(notificationId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client
    .from('client_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    return { data: null, error: formatSafeDatabaseError(error, 'Unable to mark notification as read.') };
  }
  return { data: null, error: null };
}

export async function markAllNotificationsRead(userId: string): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client
    .from('client_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    return { data: null, error: formatSafeDatabaseError(error, 'Unable to mark notifications as read.') };
  }
  return { data: null, error: null };
}

export async function fetchInvestmentProducts(): Promise<ApiResult<InvestmentProductRecord[]>> {
  const ctx = getClientOrError<InvestmentProductRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('investment_products')
    .select('*')
    .eq('is_active', true)
    .order('min_amount', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load available investment products.'),
    };
  }
  return { data: (data as InvestmentProductRecord[]) ?? [], error: null, tableMissing: false };
}

export async function fetchUserClientInvestments(
  userId: string
): Promise<ApiResult<ClientInvestmentRecord[]>> {
  const ctx = getClientOrError<ClientInvestmentRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('client_investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load investment positions.'),
    };
  }
  return { data: (data as ClientInvestmentRecord[]) ?? [], error: null, tableMissing: false };
}

export async function fetchUserPayoutDestinations(
  userId: string
): Promise<ApiResult<PayoutDestinationRecord[]>> {
  const ctx = getClientOrError<PayoutDestinationRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('payout_destinations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load saved payout destinations.'),
    };
  }
  return { data: (data as PayoutDestinationRecord[]) ?? [], error: null, tableMissing: false };
}

export async function addPayoutDestination(params: {
  userId: string;
  label: string;
  methodType: string;
  institutionName: string;
  accountEnding: string;
  currency: string;
}): Promise<ApiResult<PayoutDestinationRecord>> {
  const ctx = getClientOrError<PayoutDestinationRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('payout_destinations')
    .insert({
      user_id: params.userId,
      label: params.label.trim().slice(0, 80),
      method_type: params.methodType.trim().slice(0, 60),
      institution_name: params.institutionName.trim().slice(0, 120),
      account_ending: params.accountEnding.trim().slice(-8),
      currency: params.currency.trim().toUpperCase(),
      is_verified: true,
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to save payout destination.'),
    };
  }
  return { data: data as PayoutDestinationRecord, error: null };
}

export async function fetchUserVerificationDocs(
  userId: string
): Promise<ApiResult<VerificationDocumentRecord[]>> {
  const ctx = getClientOrError<VerificationDocumentRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('verification_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load verification records.'),
    };
  }
  return { data: (data as VerificationDocumentRecord[]) ?? [], error: null, tableMissing: false };
}

export async function submitVerificationDoc(params: {
  userId: string;
  documentType: string;
  documentReference: string;
  fileName?: string;
}): Promise<ApiResult<VerificationDocumentRecord>> {
  const ctx = getClientOrError<VerificationDocumentRecord>();
  if ('failure' in ctx) return ctx.failure;

  if (!params.documentType.trim() || !params.documentReference.trim()) {
    return { data: null, error: 'Document type and reference number are required.' };
  }

  const { data, error } = await ctx.client
    .from('verification_documents')
    .insert({
      user_id: params.userId,
      document_type: params.documentType.trim().slice(0, 80),
      document_reference: params.documentReference.trim().slice(0, 120),
      file_name: params.fileName?.trim().slice(0, 160) || null,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to submit verification record.'),
      tableMissing: isMissingTableError(error),
    };
  }
  return { data: data as VerificationDocumentRecord, error: null };
}

// ==========================================
// Admin Fund Management, Products & Contracts
// ==========================================

export async function invokeAdminFundAdjustment(params: {
  userId: string;
  accountId: string;
  direction: 'credit' | 'debit';
  category: FundAdjustmentCategory;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  highValueAuthorized: boolean;
  notifyClient: boolean;
}): Promise<ApiResult<{ transaction_uid?: string; balance_before?: number; balance_after?: number }>> {
  const ctx = getClientOrError<{ transaction_uid?: string; balance_before?: number; balance_after?: number }>();
  if ('failure' in ctx) return ctx.failure;

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return { data: null, error: 'Exact adjustment amount must be greater than zero.' };
  }
  if (!params.description.trim() || !params.reference.trim()) {
    return { data: null, error: 'Mandatory transaction description and settlement reference are required.' };
  }

  const { data, error } = await ctx.client.rpc('admin_post_fund_adjustment', {
    p_user_id: params.userId,
    p_account_id: params.accountId,
    p_direction: params.direction,
    p_category: params.category,
    p_amount: Number(params.amount.toFixed(2)),
    p_currency: params.currency.trim().toUpperCase(),
    p_description: params.description.trim().slice(0, 500),
    p_reference: params.reference.trim().slice(0, 120),
    p_high_value_authorized: params.highValueAuthorized,
    p_notify_client: params.notifyClient,
  });

  if (error) {
    return {
      data: null,
      error: isMissingRpcError(error)
        ? 'The Supabase RPC admin_post_fund_adjustment(...) was not found. Execute the updated SQL migration script in Supabase SQL Editor to enable atomic Client Funds Management.'
        : formatSafeDatabaseError(error, 'Unable to execute fund adjustment.'),
      rpcMissing: isMissingRpcError(error),
    };
  }

  return {
    data: (data as { transaction_uid?: string; balance_before?: number; balance_after?: number }) ?? null,
    error: null,
  };
}

export async function createInvestmentProduct(params: {
  name: string;
  category: string;
  currency: string;
  minAmount: number;
  durationMonths: number;
  contractualTerms: string;
  riskClassification: string;
}): Promise<ApiResult<InvestmentProductRecord>> {
  const ctx = getClientOrError<InvestmentProductRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('investment_products')
    .insert({
      name: params.name.trim(),
      category: params.category.trim(),
      currency: params.currency.trim().toUpperCase(),
      min_amount: Number(params.minAmount.toFixed(2)),
      duration_months: Math.max(1, Math.round(params.durationMonths)),
      contractual_terms: params.contractualTerms.trim(),
      risk_classification: params.riskClassification.trim(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to create investment product.'),
      tableMissing: isMissingTableError(error),
    };
  }
  return { data: data as InvestmentProductRecord, error: null };
}

export async function addClientInvestmentContract(params: {
  userId: string;
  accountId?: string | null;
  productId?: string | null;
  productName: string;
  referenceNumber: string;
  principalAmount: number;
  recordedEarnings: number;
  currency: string;
  contractualTerms: string;
  startDate: string;
  maturityDate: string;
  status: 'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled';
}): Promise<ApiResult<ClientInvestmentRecord>> {
  const ctx = getClientOrError<ClientInvestmentRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('client_investments')
    .insert({
      user_id: params.userId,
      account_id: params.accountId || null,
      product_id: params.productId || null,
      product_name: params.productName.trim(),
      reference_number: params.referenceNumber.trim(),
      principal_amount: Number(params.principalAmount.toFixed(2)),
      recorded_earnings: Number(params.recordedEarnings.toFixed(2)),
      currency: params.currency.trim().toUpperCase(),
      contractual_terms: params.contractualTerms.trim(),
      start_date: params.startDate || null,
      maturity_date: params.maturityDate || null,
      status: params.status,
    })
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to record client investment position.'),
      tableMissing: isMissingTableError(error),
    };
  }
  return { data: data as ClientInvestmentRecord, error: null };
}

export async function updateClientInvestmentContract(params: {
  investmentId: string;
  recordedEarnings: number;
  status: 'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled';
}): Promise<ApiResult<ClientInvestmentRecord>> {
  const ctx = getClientOrError<ClientInvestmentRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('client_investments')
    .update({
      recorded_earnings: Number(params.recordedEarnings.toFixed(2)),
      status: params.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.investmentId)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to update investment contract.'),
    };
  }
  return { data: data as ClientInvestmentRecord, error: null };
}

export async function reviewVerificationDocument(params: {
  docId: string;
  status: 'verified' | 'rejected';
  reviewerNotes: string;
}): Promise<ApiResult<null>> {
  const ctx = getClientOrError<null>();
  if ('failure' in ctx) return ctx.failure;

  const { error } = await ctx.client
    .from('verification_documents')
    .update({
      status: params.status,
      reviewer_notes: params.reviewerNotes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.docId);

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to update verification document status.'),
    };
  }
  return { data: null, error: null };
}

export async function fetchUserComplianceReviews(
  userId: string
): Promise<ApiResult<ComplianceReviewRecord[]>> {
  const ctx = getClientOrError<ComplianceReviewRecord[]>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('compliance_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, tableMissing: true };
    }
    return {
      data: [],
      error: formatSafeDatabaseError(error, 'Unable to load compliance review records.'),
    };
  }
  return { data: (data as ComplianceReviewRecord[]) ?? [], error: null, tableMissing: false };
}

export async function toggleInvestmentProductStatus(
  productId: string,
  isActive: boolean
): Promise<ApiResult<InvestmentProductRecord>> {
  const ctx = getClientOrError<InvestmentProductRecord>();
  if ('failure' in ctx) return ctx.failure;

  const { data, error } = await ctx.client
    .from('investment_products')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: formatSafeDatabaseError(error, 'Unable to update investment product status.'),
    };
  }
  return { data: data as InvestmentProductRecord, error: null };
}
