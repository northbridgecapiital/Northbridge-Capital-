import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckSquare,
  ChevronRight,
  Download,
  Edit3,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { PortalShell, type PortalNavItem } from '../components/layout/PortalShell';
import {
  AlertBanner,
  EmptyState,
  StatusTag,
  SupabaseConfigNotice,
  TableSkeleton,
} from '../components/ui/StateDisplay';
import { ConfirmDialog, type ConfirmDialogDetail } from '../components/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import {
  AdminHoldingsAnalytics,
  AdminOverviewAnalytics,
} from '../components/admin/AdminAnalyticsPanel';
import { ClientFundsManagement, type FundPrefillPayload } from '../components/admin/ClientFundsManagement';
import { useAuth } from '../contexts/AuthContext';
import {
  ADMIN_ROLE_DEFINITIONS,
  ALL_ADMIN_ROLES,
  canAccessAdminSection,
  hasAdminCapability,
  type AdminSectionId,
} from '../lib/adminPermissions';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  normalizeStatusLabel,
} from '../lib/formatters';
import {
  addAdminClientHolding,
  addClientInvestmentContract,
  createInvestmentProduct,
  deleteAdminBroadcast,
  deleteAdminClientHolding,
  deleteAdminCommunityComment,
  deleteAdminLead,
  fetchAdminWorkspaceData,
  invokeAdminBroadcast,
  invokeAdminComplianceReview,
  invokeAdminLedgerAdjustment,
  invokeAdminManageRole,
  invokeAdminReviewRequest,
  invokeAdminUpdateAccount,
  invokeAdminUpdateBroadcast,
  invokeAdminUpdateProfile,
  invokeAdminUpdateSupportStatus,
  reviewVerificationDocument,
  sendAdminSupportReply,
  toggleInvestmentProductStatus,
  updateAdminClientHolding,
  updateAdminLeadStatus,
  updateClientInvestmentContract,
  type AdminAccountStatus,
  type AdminRequestDecision,
  type AdminSupportStatus,
  type AdminWorkspaceDataset,
} from '../lib/portalApi';
import type {
  AccountRecord,
  AdminActionLogRecord,
  AdminRole,
  AdminUserRecord,
  BroadcastRecord,
  ClientInvestmentRecord,
  ComplianceReviewRecord,
  FinancialRequestRecord,
  HoldingRecord,
  InvestmentProductRecord,
  LeadRecord,
  LedgerEntryRecord,
  ProfileRecord,
} from '../types/database';

interface AdminNavDefinition extends PortalNavItem {
  id: AdminSectionId;
}

const ALL_ADMIN_NAV: AdminNavDefinition[] = [
  { id: 'overview', label: 'Overview & Analytics', icon: LayoutDashboard, group: 'Command Center' },
  { id: 'clients', label: 'Client Directory', icon: Users, group: 'Command Center' },
  { id: 'funds', label: 'Client Funds Management', icon: Wallet, group: 'Operations & Risk' },
  { id: 'finance', label: 'Finance & Ledger', icon: Landmark, group: 'Operations & Risk' },
  { id: 'investments', label: 'Investments & Holdings', icon: Briefcase, group: 'Operations & Risk' },
  { id: 'compliance', label: 'Compliance & KYC', icon: ShieldAlert, group: 'Operations & Risk' },
  { id: 'support', label: 'Support & Leads', icon: MessageSquare, group: 'Governance' },
  { id: 'broadcasts', label: 'Broadcasts & Audit Log', icon: Megaphone, group: 'Governance' },
  { id: 'roles', label: 'Admin Roles & RBAC', icon: KeyRound, group: 'Governance' },
];

const ACCOUNT_STATUS_OPTIONS: { value: AdminAccountStatus; label: string }[] = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'active', label: 'Active' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'closed', label: 'Closed' },
];

const REQUEST_DECISION_OPTIONS: {
  value: AdminRequestDecision;
  label: string;
  buttonClass: string;
}[] = [
  { value: 'pending', label: 'Set Pending', buttonClass: 'border border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#0B1320]' },
  { value: 'under_review', label: 'Under Review', buttonClass: 'bg-[#92400E] text-white hover:opacity-90' },
  { value: 'approved', label: 'Approve', buttonClass: 'bg-[#166534] text-white hover:opacity-90' },
  { value: 'rejected', label: 'Reject', buttonClass: 'bg-[#991B1B] text-white hover:opacity-90' },
  { value: 'settled', label: 'Mark Settled', buttonClass: 'bg-[#0B1320] text-white hover:bg-[#18263D]' },
];

const SUPPORT_STATUS_OPTIONS: { value: AdminSupportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'answered', label: 'Answered' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const COMPLIANCE_STATUS_OPTIONS: {
  value: 'pending_review' | 'verified' | 'flagged' | 'restricted' | 'cleared';
  label: string;
}[] = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'cleared', label: 'Cleared' },
];

interface PendingConfirmationState {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  details?: ConfirmDialogDetail[];
  onConfirm: () => Promise<void>;
}

interface ReconciliationRow {
  accountId: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  accountNumber: string;
  status: string;
  currency: string;
  recordedBalance: number;
  ledgerCredits: number;
  ledgerDebits: number;
  netLedger: number;
  variance: number;
  entryCount: number;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboardPage() {
  const {
    user,
    isAdmin,
    adminRole,
    roleRpcMissing,
    adminCheckError,
    adminRpcMissing,
    loading: authLoading,
    isConfigured,
    signOut,
  } = useAuth();
  const navigate = useNavigate();
  const ledgerSectionRef = useRef<HTMLDivElement | null>(null);
  const clientInspectorRef = useRef<HTMLDivElement | null>(null);

  const activeRole: AdminRole = adminRole || 'SUPER_ADMIN';

  const visibleNavItems = useMemo(
    () => ALL_ADMIN_NAV.filter((item) => canAccessAdminSection(activeRole, item.id)),
    [activeRole]
  );

  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataset, setDataset] = useState<AdminWorkspaceDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Unified Confirmation Modal
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmationState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Client Directory & Inspector
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [fundsTargetUserId, setFundsTargetUserId] = useState<string | null>(null);
  const [fundsPrefill, setFundsPrefill] = useState<FundPrefillPayload | null>(null);

  // Client Profile Editor
  const [editingProfileOpen, setEditingProfileOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileCountry, setEditProfileCountry] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Client Account Editor / Provisioner
  const [editingAccountOpen, setEditingAccountOpen] = useState(false);
  const [editAccountStatus, setEditAccountStatus] = useState<AdminAccountStatus>('active');
  const [editAccountCurrency, setEditAccountCurrency] = useState('USD');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Financial Requests Review
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'settled'
  >('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Master Ledger & Reconciliation & Adjustments
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [reconciliationFilter, setReconciliationFilter] = useState<'all' | 'variance' | 'reconciled'>('all');
  const [adjustmentClientId, setAdjustmentClientId] = useState<string>('');
  const [adjustmentEnabled, setAdjustmentEnabled] = useState(false);
  const [adjustmentConfirmed, setAdjustmentConfirmed] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<'credit' | 'debit'>('credit');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentReference, setAdjustmentReference] = useState('');
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<{
    tone: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Investments / Portfolio Holdings
  const [holdingsSearch, setHoldingsSearch] = useState('');
  const [holdingsCategoryFilter, setHoldingsCategoryFilter] = useState('all');
  const [holdingTargetClientId, setHoldingTargetClientId] = useState('');
  const [holdingAssetName, setHoldingAssetName] = useState('');
  const [holdingCategory, setHoldingCategory] = useState('Fixed Income');
  const [holdingQuantity, setHoldingQuantity] = useState('');
  const [holdingValue, setHoldingValue] = useState('');
  const [holdingSubmitting, setHoldingSubmitting] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [editHoldingName, setEditHoldingName] = useState('');
  const [editHoldingCategory, setEditHoldingCategory] = useState('Fixed Income');
  const [editHoldingQty, setEditHoldingQty] = useState('');
  const [editHoldingValue, setEditHoldingValue] = useState('');
  const [editHoldingCurrency, setEditHoldingCurrency] = useState('USD');
  const [editHoldingSaving, setEditHoldingSaving] = useState(false);
  const [holdingFeedback, setHoldingFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  // Compliance & KYC Reviews
  const [complianceSearch, setComplianceSearch] = useState('');
  const [complianceStatusFilter, setComplianceStatusFilter] = useState('all');
  const [complianceTargetClientId, setComplianceTargetClientId] = useState('');
  const [complianceReviewType, setComplianceReviewType] = useState('KYC Verification');
  const [complianceStatus, setComplianceStatus] = useState<
    'pending_review' | 'verified' | 'flagged' | 'restricted' | 'cleared'
  >('verified');
  const [complianceRiskLevel, setComplianceRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [complianceSyncAccountStatus, setComplianceSyncAccountStatus] = useState<string>('none');
  const [complianceSubmitting, setComplianceSubmitting] = useState(false);
  const [complianceFeedback, setComplianceFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Support & Website Leads
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>('all');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedSupportKey, setSelectedSupportKey] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportStatusUpdating, setSupportStatusUpdating] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [leadFeedback, setLeadFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [leadBusyId, setLeadBusyId] = useState<string | null>(null);

  // Broadcasts & Audit Logs
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState('Institutional Notice');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [editBroadcastTitle, setEditBroadcastTitle] = useState('');
  const [editBroadcastCategory, setEditBroadcastCategory] = useState('Institutional Notice');
  const [editBroadcastMessage, setEditBroadcastMessage] = useState('');
  const [editBroadcastSaving, setEditBroadcastSaving] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Admin Role Assignment (SUPER_ADMIN)
  const [roleTargetEmail, setRoleTargetEmail] = useState('');
  const [roleTargetSelection, setRoleTargetSelection] = useState<AdminRole>('FINANCE_ADMIN');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFeedback, setRoleFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Investment Products & Client Contracts
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Fixed Income');
  const [prodCurrency, setProdCurrency] = useState('USD');
  const [prodMinAmount, setProdMinAmount] = useState('10000');
  const [prodDuration, setProdDuration] = useState('12');
  const [prodRisk, setProdRisk] = useState('Moderate');
  const [prodTerms, setProdTerms] = useState('');
  const [prodSaving, setProdSaving] = useState(false);

  const [ciUserId, setCiUserId] = useState('');
  const [ciProductId, setCiProductId] = useState('');
  const [ciProductName, setCiProductName] = useState('');
  const [ciReference, setCiReference] = useState('');
  const [ciPrincipal, setCiPrincipal] = useState('');
  const [ciEarnings, setCiEarnings] = useState('0');
  const [ciTerms, setCiTerms] = useState('');
  const [ciStartDate, setCiStartDate] = useState('');
  const [ciMaturityDate, setCiMaturityDate] = useState('');
  const [ciStatus, setCiStatus] = useState<'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled'>('active');
  const [ciSaving, setCiSaving] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editContractEarnings, setEditContractEarnings] = useState('0');
  const [editContractStatus, setEditContractStatus] = useState<'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled'>('active');

  // Verification documents adjudication
  const [verDocBusyId, setVerDocBusyId] = useState<string | null>(null);
  const [verDocNotes, setVerDocNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canAccessAdminSection(activeRole, activeSection)) {
      setActiveSection('overview');
    }
  }, [activeRole, activeSection]);

  useEffect(() => {
    if (!authLoading && !user && isConfigured) {
      navigate('/login', { replace: true, state: { from: '/admin' } });
    }
  }, [authLoading, user, isConfigured, navigate]);

  const loadAdminData = useCallback(async () => {
    if (!user || !isAdmin) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setLoadError(null);
    const res = await fetchAdminWorkspaceData();
    if (res.error) {
      setLoadError(res.error);
    } else if (res.data) {
      setDataset(res.data);
      if (res.data.profiles.length > 0) {
        const firstId = res.data.profiles[0].id;
        setSelectedClientId((prev) => prev ?? firstId);
        setAdjustmentClientId((prev) => prev || firstId);
        setHoldingTargetClientId((prev) => prev || firstId);
        setComplianceTargetClientId((prev) => prev || firstId);
        setCiUserId((prev) => prev || firstId);
      }
    }
    setDataLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadAdminData();
    } else if (!authLoading) {
      setDataLoading(false);
    }
  }, [authLoading, user, isAdmin, loadAdminData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function executePendingConfirmation() {
    if (!pendingConfirm) return;
    setConfirmBusy(true);
    try {
      await pendingConfirm.onConfirm();
    } finally {
      setConfirmBusy(false);
      setPendingConfirm(null);
    }
  }

  const profiles = dataset?.profiles ?? [];
  const accounts = dataset?.accounts ?? [];
  const holdings = dataset?.holdings ?? [];
  const investmentProducts = dataset?.investmentProducts ?? [];
  const clientInvestments = dataset?.clientInvestments ?? [];
  const verificationDocuments = dataset?.verificationDocuments ?? [];
  const ledger = dataset?.ledger ?? [];
  const requests = dataset?.requests ?? [];
  const supportMessages = dataset?.supportMessages ?? [];
  const broadcasts = dataset?.broadcasts ?? [];
  const communityComments = dataset?.communityComments ?? [];
  const communityCommentsMissing = dataset?.communityCommentsMissing ?? false;
  const complianceReviews = dataset?.complianceReviews ?? [];
  const complianceReviewsMissing = dataset?.complianceReviewsMissing ?? false;
  const adminUsers = dataset?.adminUsers ?? [];
  const actionLogs = dataset?.actionLogs ?? [];
  const leads = dataset?.leads ?? [];

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRecord>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  const accountByUserId = useMemo(() => {
    const map = new Map<string, AccountRecord>();
    accounts.forEach((a) => {
      const uid = a.user_id || a.id;
      if (uid) map.set(uid, a);
    });
    return map;
  }, [accounts]);

  const latestComplianceByUser = useMemo(() => {
    const map = new Map<string, ComplianceReviewRecord>();
    complianceReviews.forEach((rev) => {
      if (!map.has(rev.user_id)) {
        map.set(rev.user_id, rev);
      }
    });
    return map;
  }, [complianceReviews]);

  const holdingsCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    holdings.forEach((h) => {
      if (h.user_id) {
        map.set(h.user_id, (map.get(h.user_id) || 0) + 1);
      }
    });
    return map;
  }, [holdings]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return profiles.filter((p) => {
      const acc = accountByUserId.get(p.id);
      const status = String(acc?.status || 'no_account').toLowerCase();
      if (clientStatusFilter !== 'all') {
        if (clientStatusFilter === 'no_account' && acc) return false;
        if (clientStatusFilter !== 'no_account' && status !== clientStatusFilter) return false;
      }
      if (!q) return true;
      const name = String(p.full_name || '').toLowerCase();
      const email = String(p.email || '').toLowerCase();
      const accNum = String(acc?.account_number || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        accNum.includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [profiles, accountByUserId, clientSearch, clientStatusFilter]);

  const selectedClient = useMemo(
    () => profiles.find((p) => p.id === selectedClientId) ?? null,
    [profiles, selectedClientId]
  );

  const selectedClientAccount = useMemo(
    () => (selectedClient ? accountByUserId.get(selectedClient.id) ?? null : null),
    [selectedClient, accountByUserId]
  );

  const selectedClientLedger = useMemo(() => {
    if (!selectedClient) return [];
    return ledger.filter(
      (entry) =>
        entry.user_id === selectedClient.id ||
        (selectedClientAccount && entry.account_id === selectedClientAccount.id)
    );
  }, [ledger, selectedClient, selectedClientAccount]);

  const selectedClientHoldings = useMemo(() => {
    if (!selectedClient) return [];
    return holdings.filter(
      (h) =>
        h.user_id === selectedClient.id ||
        (selectedClientAccount && h.account_id === selectedClientAccount.id)
    );
  }, [holdings, selectedClient, selectedClientAccount]);

  const selectedClientRequests = useMemo(() => {
    if (!selectedClient) return [];
    return requests.filter((r) => r.user_id === selectedClient.id);
  }, [requests, selectedClient]);

  const selectedClientCompliance = useMemo(() => {
    if (!selectedClient) return [];
    return complianceReviews.filter((c) => c.user_id === selectedClient.id);
  }, [complianceReviews, selectedClient]);

  const requestCounts = useMemo(() => {
    const counts = {
      all: requests.length,
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      settled: 0,
    };
    requests.forEach((r) => {
      const s = String(r.status || 'pending').toLowerCase();
      if (s === 'under_review') counts.under_review += 1;
      else if (s.includes('pend')) counts.pending += 1;
      else if (s.includes('approv')) counts.approved += 1;
      else if (s.includes('reject')) counts.rejected += 1;
      else if (s.includes('settl')) counts.settled += 1;
    });
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return requests.filter((r) => {
      const status = String(r.status || 'pending').toLowerCase();
      if (requestStatusFilter !== 'all') {
        if (requestStatusFilter === 'pending' && !status.includes('pend')) return false;
        if (requestStatusFilter === 'under_review' && status !== 'under_review') return false;
        if (requestStatusFilter === 'approved' && !status.includes('approv')) return false;
        if (requestStatusFilter === 'rejected' && !status.includes('reject')) return false;
        if (requestStatusFilter === 'settled' && !status.includes('settl')) return false;
      }
      if (!q) return true;
      const client = r.user_id ? profileMap.get(r.user_id) : undefined;
      const hay = [
        r.request_type,
        r.type,
        r.notes,
        r.reason,
        r.admin_notes,
        r.status,
        client?.full_name,
        client?.email,
        r.user_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [requests, requestStatusFilter, requestSearch, profileMap]);

  const reconciliationRows = useMemo<ReconciliationRow[]>(() => {
    const rows = accounts.map((acc) => {
      const uid = acc.user_id || acc.id;
      const client = profileMap.get(uid);
      const relatedLedger = ledger.filter(
        (entry) => entry.account_id === acc.id || (!entry.account_id && entry.user_id === uid)
      );
      let credits = 0;
      let debits = 0;
      relatedLedger.forEach((entry) => {
        const amt = Math.abs(Number(entry.amount || 0));
        const kind = String(entry.entry_type || entry.type || '').toLowerCase();
        if (kind.includes('debit') || kind.includes('withdraw')) {
          debits += amt;
        } else {
          credits += amt;
        }
      });
      const recordedBalance = Number(acc.balance || 0);
      const netLedger = Number((credits - debits).toFixed(2));
      const variance = Number((recordedBalance - netLedger).toFixed(2));
      return {
        accountId: acc.id,
        userId: uid,
        clientName: client?.full_name || 'Client',
        clientEmail: client?.email || uid.slice(0, 8),
        accountNumber: acc.account_number || 'Pending',
        status: acc.status || 'active',
        currency: String(acc.currency || 'USD').toUpperCase(),
        recordedBalance,
        ledgerCredits: credits,
        ledgerDebits: debits,
        netLedger,
        variance,
        entryCount: relatedLedger.length,
      };
    });

    if (reconciliationFilter === 'variance') {
      return rows.filter((r) => Math.abs(r.variance) >= 0.01);
    }
    if (reconciliationFilter === 'reconciled') {
      return rows.filter((r) => Math.abs(r.variance) < 0.01);
    }
    return rows;
  }, [accounts, ledger, profileMap, reconciliationFilter]);

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return ledger.filter((entry) => {
      const kind = String(entry.entry_type || entry.type || 'credit').toLowerCase();
      const isDebit = kind.includes('debit') || kind.includes('withdraw');
      if (ledgerTypeFilter === 'credit' && isDebit) return false;
      if (ledgerTypeFilter === 'debit' && !isDebit) return false;
      if (!q) return true;
      const client = entry.user_id ? profileMap.get(entry.user_id) : undefined;
      const hay = [
        entry.reference,
        entry.description,
        entry.memo,
        entry.currency,
        entry.entry_type,
        entry.type,
        client?.full_name,
        client?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, ledgerTypeFilter, ledgerSearch, profileMap]);

  const holdingCategories = useMemo(() => {
    const set = new Set<string>();
    holdings.forEach((h) => {
      const c = String(h.asset_category || h.category || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    const q = holdingsSearch.trim().toLowerCase();
    return holdings.filter((h) => {
      const cat = String(h.asset_category || h.category || '');
      if (holdingsCategoryFilter !== 'all' && cat !== holdingsCategoryFilter) {
        return false;
      }
      if (!q) return true;
      const client = h.user_id ? profileMap.get(h.user_id) : undefined;
      const hay = [
        h.asset_name,
        h.name,
        h.symbol,
        cat,
        h.currency,
        client?.full_name,
        client?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [holdings, holdingsCategoryFilter, holdingsSearch, profileMap]);

  const filteredComplianceReviews = useMemo(() => {
    const q = complianceSearch.trim().toLowerCase();
    return complianceReviews.filter((rev) => {
      if (complianceStatusFilter !== 'all' && rev.status !== complianceStatusFilter) {
        return false;
      }
      if (!q) return true;
      const client = profileMap.get(rev.user_id);
      const hay = [
        rev.review_type,
        rev.status,
        rev.risk_level,
        rev.notes,
        client?.full_name,
        client?.email,
        rev.user_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [complianceReviews, complianceStatusFilter, complianceSearch, profileMap]);

  const supportThreads = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        clientUserId: string;
        threadId: string | null;
        subject: string;
        status: string;
        messages: typeof supportMessages;
        lastUpdated: string;
      }
    >();

    supportMessages.forEach((msg) => {
      const uid = msg.user_id || 'unknown';
      const key = `${uid}::${msg.thread_id || msg.subject || msg.id}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          clientUserId: uid,
          threadId: msg.thread_id || null,
          subject: msg.subject || 'Client Support Inquiry',
          status: msg.status || 'open',
          messages: [msg],
          lastUpdated: msg.created_at || '',
        });
      } else {
        existing.messages.push(msg);
        if (msg.status) existing.status = msg.status;
        if (msg.created_at) existing.lastUpdated = msg.created_at;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      (b.lastUpdated || '').localeCompare(a.lastUpdated || '')
    );
  }, [supportMessages]);

  const filteredSupportThreads = useMemo(() => {
    const q = supportSearch.trim().toLowerCase();
    return supportThreads.filter((thread) => {
      const st = String(thread.status || 'open').toLowerCase();
      if (supportStatusFilter !== 'all' && st !== supportStatusFilter) {
        return false;
      }
      if (!q) return true;
      const client = profileMap.get(thread.clientUserId);
      const hay = [
        thread.subject,
        thread.status,
        client?.full_name,
        client?.email,
        thread.clientUserId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [supportThreads, supportStatusFilter, supportSearch, profileMap]);

  const filteredActionLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return actionLogs;
    return actionLogs.filter((log) => {
      const detailsStr =
        typeof log.details === 'string'
          ? log.details
          : log.details
          ? JSON.stringify(log.details)
          : '';
      return (
        String(log.action || '').toLowerCase().includes(q) ||
        String(log.target_user_id || '').toLowerCase().includes(q) ||
        String(log.target_id || '').toLowerCase().includes(q) ||
        detailsStr.toLowerCase().includes(q)
      );
    });
  }, [actionLogs, auditSearch]);

  useEffect(() => {
    setEditingProfileOpen(false);
    setEditingAccountOpen(false);
    setProfileFeedback(null);
    setAccountFeedback(null);
    if (selectedClient) {
      setEditProfileName(selectedClient.full_name || '');
      setEditProfileCountry(selectedClient.country || '');
    }
    if (selectedClientAccount) {
      const rawStatus = String(selectedClientAccount.status || 'active').toLowerCase();
      const matched = ACCOUNT_STATUS_OPTIONS.find((opt) => opt.value === rawStatus);
      setEditAccountStatus(matched ? matched.value : 'active');
      setEditAccountCurrency(String(selectedClientAccount.currency || 'USD').toUpperCase());
      setEditAccountNumber(selectedClientAccount.account_number || '');
    } else {
      setEditAccountStatus('active');
      setEditAccountCurrency('USD');
      setEditAccountNumber('');
    }
  }, [selectedClient, selectedClientAccount]);

  const adjustmentTargetClient = useMemo(
    () => profiles.find((p) => p.id === adjustmentClientId) ?? null,
    [profiles, adjustmentClientId]
  );
  const adjustmentTargetAccount = useMemo(
    () => (adjustmentTargetClient ? accountByUserId.get(adjustmentTargetClient.id) ?? null : null),
    [adjustmentTargetClient, accountByUserId]
  );

  // Handlers
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    setProfileFeedback(null);
    setProfileSaving(true);
    const res = await invokeAdminUpdateProfile({
      userId: selectedClient.id,
      fullName: editProfileName,
      country: editProfileCountry,
    });
    setProfileSaving(false);

    if (res.error) {
      setProfileFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
      return;
    }

    setProfileFeedback({ tone: 'success', message: 'Client profile updated and logged.' });
    setEditingProfileOpen(false);
    await loadAdminData();
  }

  function requestSaveAccountConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    const isRestrictive =
      editAccountStatus === 'restricted' ||
      editAccountStatus === 'suspended' ||
      editAccountStatus === 'closed';

    setPendingConfirm({
      title: selectedClientAccount ? 'Confirm Account Status & Custody Update' : 'Provision Client Account',
      description: isRestrictive
        ? `Applying status "${normalizeStatusLabel(editAccountStatus)}" will alter this client's custody access immediately and write an entry to the audit log.`
        : 'Confirm updating this client account parameters in Supabase.',
      confirmLabel: selectedClientAccount ? 'Apply Account Update' : 'Create Account',
      tone: isRestrictive ? 'danger' : 'primary',
      details: [
        { label: 'Client', value: selectedClient.full_name || selectedClient.email || selectedClient.id },
        { label: 'Account Number', value: editAccountNumber || selectedClientAccount?.account_number || 'Auto-assigned' },
        { label: 'Target Status', value: normalizeStatusLabel(editAccountStatus) },
        { label: 'Currency', value: editAccountCurrency.toUpperCase() },
      ],
      onConfirm: async () => {
        setAccountFeedback(null);
        setAccountSaving(true);
        const res = await invokeAdminUpdateAccount({
          accountId: selectedClientAccount?.id ?? null,
          userId: selectedClient.id,
          status: editAccountStatus,
          currency: editAccountCurrency,
          accountNumber: editAccountNumber,
        });
        setAccountSaving(false);
        if (res.error) {
          setAccountFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }
        setAccountFeedback({
          tone: 'success',
          message: selectedClientAccount
            ? 'Client account parameters updated and logged.'
            : 'Client account provisioned and logged.',
        });
        setEditingAccountOpen(false);
        await loadAdminData();
      },
    });
  }

  function requestReviewDecisionConfirmation(req: FinancialRequestRecord, decision: AdminRequestDecision) {
    const client = req.user_id ? profileMap.get(req.user_id) : undefined;
    const notes =
      reviewNotesMap[req.id] !== undefined ? reviewNotesMap[req.id] : req.admin_notes || '';

    setPendingConfirm({
      title: `Confirm Financial Request Decision: ${normalizeStatusLabel(decision)}`,
      description:
        decision === 'settled'
          ? 'Marking this request Settled records completion status. Ensure the matching ledger adjustment has been posted if balances should reflect it.'
          : 'Confirm updating this client financial request status. This change is immediately visible to the client and logged.',
      confirmLabel: `Mark ${normalizeStatusLabel(decision)}`,
      tone: decision === 'rejected' ? 'danger' : 'primary',
      details: [
        { label: 'Client', value: client?.full_name || client?.email || req.user_id || 'Unknown' },
        { label: 'Request Type', value: normalizeStatusLabel(req.request_type || req.type || 'Request') },
        { label: 'Amount', value: formatCurrency(req.amount, req.currency || 'USD') },
        { label: 'New Decision', value: normalizeStatusLabel(decision) },
        { label: 'Admin Note', value: notes.trim() || 'None provided' },
      ],
      onConfirm: async () => {
        setRequestFeedback(null);
        setReviewingId(req.id);
        const res = await invokeAdminReviewRequest({
          requestId: req.id,
          decision,
          adminNotes: notes,
        });
        setReviewingId(null);

        if (res.error) {
          setRequestFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }
        setRequestFeedback({
          tone: 'success',
          message: `Financial request updated to ${normalizeStatusLabel(decision)}.`,
        });
        setEditingRequestId(null);
        await loadAdminData();
      },
    });
  }

  function handlePrepareLedgerSettlement(req: FinancialRequestRecord) {
    if (!req.user_id) return;
    const reqType = String(req.request_type || req.type || '').toLowerCase();
    const isDebit = reqType.includes('withdraw') || reqType.includes('transfer') || reqType.includes('redemp');

    setAdjustmentClientId(req.user_id);
    setActiveSection('finance');
    setAdjustmentEnabled(true);
    setAdjustmentConfirmed(false);
    setAdjustmentMode(isDebit ? 'debit' : 'credit');
    setAdjustmentAmount(req.amount ? String(Number(req.amount)) : '');
    setAdjustmentReference(`REQ-${req.id.slice(0, 8).toUpperCase()}`);
    setAdjustmentReason(
      `Settlement for ${req.request_type || req.type || 'financial request'} (${req.id.slice(0, 8)})`
    );
    setAdjustmentFeedback({
      tone: 'info',
      message: 'Ledger form pre-filled from request. Verify client account and confirm authorisation before executing.',
    });
    setTimeout(() => {
      ledgerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  function handleOpenFundsForRequest(req: FinancialRequestRecord) {
    if (!req.user_id) return;
    const reqType = String(req.request_type || req.type || '').toLowerCase();
    const isDebit = reqType.includes('withdraw') || reqType.includes('transfer') || reqType.includes('redemp');
    setFundsTargetUserId(req.user_id);
    setFundsPrefill({
      userId: req.user_id,
      direction: isDebit ? 'debit' : 'credit',
      category: isDebit ? 'Authorized withdrawal debit' : 'Verified deposit credit',
      amount: req.amount ? String(Number(req.amount)) : '',
      reference: req.payment_reference || `REQ-${req.id.slice(0, 8).toUpperCase()}`,
      description: `Reconciled settlement for ${req.request_type || req.type || 'financial request'} (${req.id.slice(0, 8).toUpperCase()})`,
      nonce: Date.now(),
    });
    setActiveSection('funds');
  }

  function requestLedgerAdjustmentConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setAdjustmentFeedback(null);
    if (!adjustmentTargetClient || !adjustmentTargetAccount) {
      setAdjustmentFeedback({ tone: 'error', message: 'Select a client with an active custody account.' });
      return;
    }
    if (!adjustmentEnabled || !adjustmentConfirmed) {
      setAdjustmentFeedback({
        tone: 'warning',
        message: 'Enable administrative adjustment mode and check the authorisation box first.',
      });
      return;
    }
    const numericAmount = Number(adjustmentAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAdjustmentFeedback({ tone: 'error', message: 'Enter a valid positive adjustment amount.' });
      return;
    }
    if (!adjustmentReason.trim()) {
      setAdjustmentFeedback({ tone: 'error', message: 'Enter an administrative justification for the ledger.' });
      return;
    }

    const ref = adjustmentReference.trim() || `ADMIN-${Date.now()}`;
    const cur = String(adjustmentTargetAccount.currency || 'USD').toUpperCase();

    setPendingConfirm({
      title: `Confirm Ledger ${adjustmentMode === 'credit' ? 'Credit' : 'Debit'} Posting`,
      description: `This action writes an immutable ${adjustmentMode} entry into account_ledger, updates the client's recorded balance, and records an audit log entry.`,
      confirmLabel: `Execute ${adjustmentMode === 'credit' ? 'Credit' : 'Debit'}`,
      tone: adjustmentMode === 'debit' ? 'danger' : 'primary',
      details: [
        { label: 'Client', value: adjustmentTargetClient.full_name || adjustmentTargetClient.email || adjustmentTargetClient.id },
        { label: 'Account', value: adjustmentTargetAccount.account_number || adjustmentTargetAccount.id.slice(0, 8) },
        { label: 'Operation', value: adjustmentMode.toUpperCase() },
        { label: 'Amount', value: formatCurrency(numericAmount, cur) },
        { label: 'Reference', value: ref },
        { label: 'Justification', value: adjustmentReason.trim() },
      ],
      onConfirm: async () => {
        setAdjustmentSubmitting(true);
        const res = await invokeAdminLedgerAdjustment({
          mode: adjustmentMode,
          accountId: adjustmentTargetAccount.id,
          userId: adjustmentTargetClient.id,
          amount: numericAmount,
          currency: cur,
          reason: adjustmentReason.trim(),
          reference: ref,
        });
        setAdjustmentSubmitting(false);

        if (res.error) {
          setAdjustmentFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }
        setAdjustmentFeedback({
          tone: 'success',
          message: `Administrative ${adjustmentMode} recorded for ${adjustmentTargetClient.full_name || adjustmentTargetClient.email}.`,
        });
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setAdjustmentReference('');
        setAdjustmentConfirmed(false);
        setAdjustmentEnabled(false);
        await loadAdminData();
      },
    });
  }

  async function handleAddClientHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!holdingTargetClientId) return;
    setHoldingFeedback(null);
    const targetAccount = accountByUserId.get(holdingTargetClientId);
    setHoldingSubmitting(true);
    const res = await addAdminClientHolding({
      userId: holdingTargetClientId,
      accountId: targetAccount?.id ?? null,
      assetName: holdingAssetName,
      assetCategory: holdingCategory,
      quantity: Number(holdingQuantity),
      reportedValue: Number(holdingValue),
      currency: String(targetAccount?.currency || 'USD').toUpperCase(),
    });
    setHoldingSubmitting(false);

    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({ tone: 'success', message: 'Portfolio holding recorded for client.' });
    setHoldingAssetName('');
    setHoldingQuantity('');
    setHoldingValue('');
    await loadAdminData();
  }

  function startEditingHolding(h: HoldingRecord) {
    setHoldingFeedback(null);
    setEditingHoldingId(h.id);
    setEditHoldingName(h.asset_name || h.name || '');
    setEditHoldingCategory(h.asset_category || h.category || 'Fixed Income');
    setEditHoldingQty(String(h.quantity ?? ''));
    setEditHoldingValue(String(h.reported_value ?? h.market_value ?? h.value ?? ''));
    setEditHoldingCurrency(String(h.currency || 'USD').toUpperCase());
  }

  async function handleSaveEditedHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHoldingId) return;
    setHoldingFeedback(null);
    setEditHoldingSaving(true);
    const res = await updateAdminClientHolding({
      holdingId: editingHoldingId,
      assetName: editHoldingName,
      assetCategory: editHoldingCategory,
      quantity: Number(editHoldingQty),
      reportedValue: Number(editHoldingValue),
      currency: editHoldingCurrency,
    });
    setEditHoldingSaving(false);

    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({ tone: 'success', message: 'Portfolio holding updated.' });
    setEditingHoldingId(null);
    await loadAdminData();
  }

  function requestRemoveHoldingConfirmation(h: HoldingRecord) {
    const client = h.user_id ? profileMap.get(h.user_id) : undefined;
    setPendingConfirm({
      title: 'Confirm Portfolio Holding Removal',
      description: 'Removing this position permanently deletes the holding record from the client portfolio.',
      confirmLabel: 'Remove Holding',
      tone: 'danger',
      details: [
        { label: 'Client', value: client?.full_name || client?.email || h.user_id || 'Unknown' },
        { label: 'Asset', value: h.asset_name || h.name || 'Holding' },
        { label: 'Reported Value', value: formatCurrency(h.reported_value ?? h.market_value ?? h.value, h.currency || 'USD') },
      ],
      onConfirm: async () => {
        setHoldingFeedback(null);
        const res = await deleteAdminClientHolding(h.id);
        if (res.error) {
          setHoldingFeedback({ tone: 'error', message: res.error });
          return;
        }
        if (editingHoldingId === h.id) setEditingHoldingId(null);
        setHoldingFeedback({ tone: 'success', message: 'Holding removed.' });
        await loadAdminData();
      },
    });
  }

  function requestComplianceReviewConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setComplianceFeedback(null);
    const targetClient = profiles.find((p) => p.id === complianceTargetClientId);
    if (!targetClient) {
      setComplianceFeedback({ tone: 'error', message: 'Select a registered client to review.' });
      return;
    }
    if (!complianceNotes.trim()) {
      setComplianceFeedback({ tone: 'error', message: 'Enter compliance screening notes.' });
      return;
    }
    const targetAccount = accountByUserId.get(targetClient.id);
    const syncAccount = complianceSyncAccountStatus !== 'none';
    const isRestrictive =
      complianceStatus === 'flagged' ||
      complianceStatus === 'restricted' ||
      complianceSyncAccountStatus === 'restricted' ||
      complianceSyncAccountStatus === 'suspended';

    setPendingConfirm({
      title: 'Confirm Compliance & Identity Review',
      description: syncAccount
        ? `Records a ${normalizeStatusLabel(complianceStatus)} compliance determination and updates the client's custody account status to ${normalizeStatusLabel(complianceSyncAccountStatus)}.`
        : 'Records a permanent compliance screening entry in public.compliance_reviews and writes an audit log entry.',
      confirmLabel: 'Submit Compliance Determination',
      tone: isRestrictive ? 'danger' : 'primary',
      details: [
        { label: 'Client', value: targetClient.full_name || targetClient.email || targetClient.id },
        { label: 'Review Type', value: complianceReviewType },
        { label: 'Outcome', value: normalizeStatusLabel(complianceStatus) },
        { label: 'Risk Rating', value: complianceRiskLevel.toUpperCase() },
        ...(syncAccount
          ? [{ label: 'Sync Account Status', value: normalizeStatusLabel(complianceSyncAccountStatus) }]
          : []),
      ],
      onConfirm: async () => {
        setComplianceSubmitting(true);
        const res = await invokeAdminComplianceReview({
          userId: targetClient.id,
          accountId: targetAccount?.id ?? null,
          reviewType: complianceReviewType,
          status: complianceStatus,
          riskLevel: complianceRiskLevel,
          notes: complianceNotes,
        });

        if (res.error) {
          setComplianceSubmitting(false);
          setComplianceFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }

        if (syncAccount && targetAccount) {
          const accRes = await invokeAdminUpdateAccount({
            accountId: targetAccount.id,
            userId: targetClient.id,
            status: complianceSyncAccountStatus as AdminAccountStatus,
            currency: String(targetAccount.currency || 'USD').toUpperCase(),
            accountNumber: targetAccount.account_number || undefined,
          });
          if (accRes.error) {
            setComplianceSubmitting(false);
            setComplianceFeedback({
              tone: 'warning',
              message: `Compliance record saved, but account status sync failed: ${accRes.error}`,
            });
            await loadAdminData();
            return;
          }
        }

        setComplianceSubmitting(false);
        setComplianceNotes('');
        setComplianceSyncAccountStatus('none');
        setComplianceFeedback({
          tone: 'success',
          message: 'Compliance determination recorded and logged.',
        });
        await loadAdminData();
      },
    });
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setHoldingFeedback(null);
    if (!prodName.trim() || !prodTerms.trim()) {
      setHoldingFeedback({ tone: 'error', message: 'Product name and contractual terms are required.' });
      return;
    }
    setProdSaving(true);
    const res = await createInvestmentProduct({
      name: prodName,
      category: prodCategory,
      currency: prodCurrency,
      minAmount: Number(prodMinAmount || 0),
      durationMonths: Number(prodDuration || 12),
      contractualTerms: prodTerms,
      riskClassification: prodRisk,
    });
    setProdSaving(false);
    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({ tone: 'success', message: 'Investment product catalog item created.' });
    setProdName('');
    setProdTerms('');
    await loadAdminData();
  }

  async function handleToggleProductStatus(prod: InvestmentProductRecord) {
    setHoldingFeedback(null);
    const nextActive = !prod.is_active;
    const res = await toggleInvestmentProductStatus(prod.id, nextActive);
    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({
      tone: 'success',
      message: `Investment product "${prod.name}" is now ${nextActive ? 'active for client subscriptions' : 'inactive (archived)'}.`,
    });
    await loadAdminData();
  }

  async function handleCreateClientContract(e: React.FormEvent) {
    e.preventDefault();
    setHoldingFeedback(null);
    if (!ciUserId || !ciProductName.trim() || !ciReference.trim()) {
      setHoldingFeedback({
        tone: 'error',
        message: 'Client, investment product name, and contract reference number are required.',
      });
      return;
    }
    const targetAccount = accountByUserId.get(ciUserId);
    setCiSaving(true);
    const res = await addClientInvestmentContract({
      userId: ciUserId,
      accountId: targetAccount?.id ?? null,
      productId: ciProductId || null,
      productName: ciProductName,
      referenceNumber: ciReference,
      principalAmount: Number(ciPrincipal || 0),
      recordedEarnings: Number(ciEarnings || 0),
      currency: String(targetAccount?.currency || 'USD').toUpperCase(),
      contractualTerms: ciTerms || 'Subject to signed institutional mandate agreement.',
      startDate: ciStartDate || new Date().toISOString().slice(0, 10),
      maturityDate: ciMaturityDate,
      status: ciStatus,
    });
    setCiSaving(false);
    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({ tone: 'success', message: 'Client investment contract recorded.' });
    setCiProductName('');
    setCiReference('');
    setCiPrincipal('');
    setCiEarnings('0');
    setCiTerms('');
    await loadAdminData();
  }

  async function handleSaveEditedContract(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContractId) return;
    setHoldingFeedback(null);
    const res = await updateClientInvestmentContract({
      investmentId: editingContractId,
      recordedEarnings: Number(editContractEarnings || 0),
      status: editContractStatus,
    });
    if (res.error) {
      setHoldingFeedback({ tone: 'error', message: res.error });
      return;
    }
    setHoldingFeedback({ tone: 'success', message: 'Client investment contract updated.' });
    setEditingContractId(null);
    await loadAdminData();
  }

  async function handleReviewVerificationDoc(docId: string, status: 'verified' | 'rejected') {
    setComplianceFeedback(null);
    setVerDocBusyId(docId);
    const res = await reviewVerificationDocument({
      docId,
      status,
      reviewerNotes: verDocNotes[docId] || '',
    });
    setVerDocBusyId(null);
    if (res.error) {
      setComplianceFeedback({ tone: 'error', message: res.error });
      return;
    }
    setComplianceFeedback({
      tone: 'success',
      message: `Client verification document marked ${normalizeStatusLabel(status)}.`,
    });
    await loadAdminData();
  }

  async function handleAdminReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedSupportKey) return;
    setSupportFeedback(null);
    const thread = supportThreads.find((t) => t.key === selectedSupportKey);
    if (!thread) return;

    setSupportSubmitting(true);
    const res = await sendAdminSupportReply({
      clientUserId: thread.clientUserId,
      subject: thread.subject,
      message: supportReply,
      threadId: thread.threadId || thread.messages[0]?.id || null,
      adminId: user.id,
    });
    setSupportSubmitting(false);

    if (res.error) {
      setSupportFeedback({ tone: 'error', message: res.error });
      return;
    }
    setSupportFeedback({ tone: 'success', message: 'Administrative reply recorded.' });
    setSupportReply('');
    await loadAdminData();
  }

  async function handleUpdateSupportStatus(
    thread: (typeof supportThreads)[number],
    status: AdminSupportStatus
  ) {
    setSupportFeedback(null);
    setSupportStatusUpdating(true);
    const res = await invokeAdminUpdateSupportStatus({
      clientUserId: thread.clientUserId,
      threadId: thread.threadId,
      subject: thread.subject,
      status,
    });
    setSupportStatusUpdating(false);

    if (res.error) {
      setSupportFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
      return;
    }
    setSupportFeedback({
      tone: 'success',
      message: `Thread status updated to ${normalizeStatusLabel(status)}.`,
    });
    await loadAdminData();
  }

  async function handleLeadStatusChange(
    leadId: string,
    status: 'new' | 'under_review' | 'contacted' | 'archived'
  ) {
    setLeadFeedback(null);
    setLeadBusyId(leadId);
    const res = await updateAdminLeadStatus(leadId, status);
    setLeadBusyId(null);

    if (res.error) {
      setLeadFeedback({ tone: 'warning', message: res.error });
      return;
    }
    setLeadFeedback({
      tone: 'success',
      message: `Inquiry status marked ${normalizeStatusLabel(status)}.`,
    });
    await loadAdminData();
  }

  function requestDeleteLeadConfirmation(lead: LeadRecord) {
    if (!lead.id) return;
    const leadId = lead.id;
    setPendingConfirm({
      title: 'Confirm Lead Inquiry Deletion',
      description: 'Deleting this inquiry permanently removes it from public.leads.',
      confirmLabel: 'Delete Inquiry',
      tone: 'danger',
      details: [
        { label: 'Prospect', value: lead.full_name || lead.name || lead.email },
        { label: 'Email', value: lead.email },
        { label: 'Subject', value: lead.subject || 'Private Client Inquiry' },
      ],
      onConfirm: async () => {
        setLeadFeedback(null);
        setLeadBusyId(leadId);
        const res = await deleteAdminLead(leadId);
        setLeadBusyId(null);
        if (res.error) {
          setLeadFeedback({ tone: 'error', message: res.error });
          return;
        }
        setLeadFeedback({ tone: 'success', message: 'Lead inquiry removed.' });
        await loadAdminData();
      },
    });
  }

  async function handlePublishBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastFeedback(null);
    setBroadcastSubmitting(true);
    const res = await invokeAdminBroadcast({
      title: broadcastTitle,
      message: broadcastMessage,
      category: broadcastCategory,
    });
    setBroadcastSubmitting(false);

    if (res.error) {
      setBroadcastFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
      return;
    }
    setBroadcastFeedback({ tone: 'success', message: 'Official announcement published.' });
    setBroadcastTitle('');
    setBroadcastMessage('');
    await loadAdminData();
  }

  function startEditingBroadcast(b: BroadcastRecord) {
    setBroadcastFeedback(null);
    setEditingBroadcastId(b.id);
    setEditBroadcastTitle(b.title || '');
    setEditBroadcastCategory(b.category || 'Institutional Notice');
    setEditBroadcastMessage(b.message || b.body || b.content || '');
  }

  async function handleSaveEditedBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBroadcastId) return;
    setBroadcastFeedback(null);
    setEditBroadcastSaving(true);
    const res = await invokeAdminUpdateBroadcast({
      broadcastId: editingBroadcastId,
      title: editBroadcastTitle,
      category: editBroadcastCategory,
      message: editBroadcastMessage,
    });
    setEditBroadcastSaving(false);

    if (res.error) {
      setBroadcastFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
      return;
    }
    setBroadcastFeedback({ tone: 'success', message: 'Announcement updated.' });
    setEditingBroadcastId(null);
    await loadAdminData();
  }

  function requestDeleteBroadcastConfirmation(b: BroadcastRecord) {
    setPendingConfirm({
      title: 'Confirm Announcement Deletion',
      description: 'Removing this announcement withdraws it immediately from all signed-in client portals.',
      confirmLabel: 'Delete Announcement',
      tone: 'danger',
      details: [
        { label: 'Title', value: b.title || 'Announcement' },
        { label: 'Category', value: b.category || 'Notice' },
      ],
      onConfirm: async () => {
        setBroadcastFeedback(null);
        const res = await deleteAdminBroadcast(b.id);
        if (res.error) {
          setBroadcastFeedback({ tone: 'error', message: res.error });
          return;
        }
        if (editingBroadcastId === b.id) setEditingBroadcastId(null);
        setBroadcastFeedback({ tone: 'success', message: 'Announcement removed.' });
        await loadAdminData();
      },
    });
  }

  function requestDeleteCommentConfirmation(commentId: string, author: string) {
    setPendingConfirm({
      title: 'Confirm Community Comment Removal',
      description: 'This permanently deletes the client comment from public.community_comments.',
      confirmLabel: 'Delete Comment',
      tone: 'danger',
      details: [
        { label: 'Author', value: author },
        { label: 'Comment ID', value: commentId.slice(0, 8) },
      ],
      onConfirm: async () => {
        setBroadcastFeedback(null);
        const res = await deleteAdminCommunityComment(commentId);
        if (res.error) {
          setBroadcastFeedback({ tone: 'error', message: res.error });
          return;
        }
        setBroadcastFeedback({ tone: 'success', message: 'Community comment removed.' });
        await loadAdminData();
      },
    });
  }

  function requestAssignRoleConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setRoleFeedback(null);
    const cleanEmail = roleTargetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRoleFeedback({ tone: 'error', message: 'Enter a valid registered user email address.' });
      return;
    }

    setPendingConfirm({
      title: 'Confirm Administrator Role Assignment',
      description:
        'Assigning an administrator role verifies an existing Supabase account in public.admin_users. Public sign-ups remain ordinary clients unless explicitly granted access here by a Super Admin.',
      confirmLabel: `Assign ${ADMIN_ROLE_DEFINITIONS[roleTargetSelection].label}`,
      tone: 'primary',
      details: [
        { label: 'Target Email', value: cleanEmail },
        { label: 'Assigned Role', value: ADMIN_ROLE_DEFINITIONS[roleTargetSelection].label },
      ],
      onConfirm: async () => {
        setRoleSubmitting(true);
        const res = await invokeAdminManageRole({
          targetEmail: cleanEmail,
          role: roleTargetSelection,
          action: 'assign',
        });
        setRoleSubmitting(false);

        if (res.error) {
          setRoleFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }
        setRoleFeedback({
          tone: 'success',
          message: `Administrator role ${ADMIN_ROLE_DEFINITIONS[roleTargetSelection].label} granted to ${cleanEmail}.`,
        });
        setRoleTargetEmail('');
        await loadAdminData();
      },
    });
  }

  function requestRevokeRoleConfirmation(adminRecord: AdminUserRecord) {
    const email = adminRecord.email || adminRecord.user_id;
    setPendingConfirm({
      title: 'Confirm Administrator Privilege Revocation',
      description:
        'Revoking removes this user from public.admin_users. The backend blocks revoking your own last Super Admin session.',
      confirmLabel: 'Revoke Admin Access',
      tone: 'danger',
      details: [
        { label: 'Administrator', value: email },
        { label: 'Current Role', value: ADMIN_ROLE_DEFINITIONS[adminRecord.role].label },
      ],
      onConfirm: async () => {
        setRoleSubmitting(true);
        const res = await invokeAdminManageRole({
          targetEmail: email,
          role: adminRecord.role,
          action: 'revoke',
        });
        setRoleSubmitting(false);
        if (res.error) {
          setRoleFeedback({ tone: res.rpcMissing ? 'warning' : 'error', message: res.error });
          return;
        }
        setRoleFeedback({ tone: 'success', message: `Administrator access revoked for ${email}.` });
        await loadAdminData();
      },
    });
  }

  // Guards
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <SupabaseConfigNotice />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 max-w-5xl mx-auto">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full border border-[#CBD5E1] bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#CBD5E1] bg-[#F8FAFC] text-[#0B1320]">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-serif text-2xl text-[#0B1320]">
            Administrator Access Restricted
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">
            {adminRpcMissing
              ? 'Configuration Notice: The Supabase verification RPC public.is_admin() was not found. Run the setup SQL script on your Supabase database to authorise administrator access.'
              : adminCheckError
              ? adminCheckError
              : 'Your authenticated session is not verified as an administrator by the Supabase is_admin() security function.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="bg-[#0B1320] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#18263D]"
            >
              Return to Client Portal
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-medium text-[#0B1320] hover:border-[#0B1320]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sectionTitle =
    visibleNavItems.find((n) => n.id === activeSection)?.label || 'Overview & Analytics';

  const pendingRequestsCount = requests.filter((r) => {
    const s = String(r.status || 'pending').toLowerCase();
    return s.includes('pend') || s === 'under_review';
  }).length;

  const openThreadsCount = supportThreads.filter((t) => {
    const s = String(t.status || 'open').toLowerCase();
    return s === 'open' || s === 'under_review';
  }).length;

  const flaggedComplianceCount = complianceReviews.filter(
    (c) => c.status === 'flagged' || c.status === 'pending_review' || c.status === 'restricted'
  ).length;

  const varianceAccountsCount = reconciliationRows.filter(
    (r) => Math.abs(r.variance) >= 0.01
  ).length;

  // Table Columns
  const clientColumns: DataTableColumn<ProfileRecord>[] = [
    {
      key: 'client',
      header: 'Client',
      sortValue: (p) => String(p.full_name || p.email || ''),
      render: (p) => (
        <div>
          <p className="font-medium text-[#0B1320]">{p.full_name || 'Client'}</p>
          <p className="text-[11px] text-[#64748B]">{p.email || p.id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'account',
      header: 'Account No.',
      sortValue: (p) => String(accountByUserId.get(p.id)?.account_number || ''),
      render: (p) => {
        const acc = accountByUserId.get(p.id);
        return (
          <span className="font-mono text-[#0B1320] tabular-nums">
            {acc?.account_number || 'Unprovisioned'}
          </span>
        );
      },
    },
    {
      key: 'balance',
      header: 'Recorded Balance',
      align: 'right',
      sortValue: (p) => Number(accountByUserId.get(p.id)?.balance || 0),
      render: (p) => {
        const acc = accountByUserId.get(p.id);
        return acc ? (
          <span className="font-mono font-medium text-[#0B1320] tabular-nums">
            {formatCurrency(acc.balance, acc.currency || 'USD')}
          </span>
        ) : (
          <span className="text-[#64748B]">—</span>
        );
      },
    },
    {
      key: 'holdings',
      header: 'Holdings',
      align: 'right',
      sortValue: (p) => holdingsCountByUser.get(p.id) || 0,
      render: (p) => (
        <span className="font-mono tabular-nums text-[#334155]">
          {holdingsCountByUser.get(p.id) || 0}
        </span>
      ),
    },
    {
      key: 'kyc',
      header: 'Compliance',
      sortValue: (p) => String(latestComplianceByUser.get(p.id)?.status || 'unscreened'),
      render: (p) => {
        const latest = latestComplianceByUser.get(p.id);
        return latest ? <StatusTag status={latest.status} /> : <span className="text-[#64748B]">Unscreened</span>;
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      sortValue: (p) => String(accountByUserId.get(p.id)?.status || 'no_account'),
      render: (p) => {
        const acc = accountByUserId.get(p.id);
        return <StatusTag status={acc?.status || 'no_account'} />;
      },
    },
    {
      key: 'action',
      header: 'Inspect',
      align: 'right',
      render: (p) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClientId(p.id);
            setTimeout(() => {
              clientInspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
          }}
          className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
        >
          Inspect
        </button>
      ),
    },
  ];

  const reconciliationColumns: DataTableColumn<ReconciliationRow>[] = [
    {
      key: 'client',
      header: 'Client & Account',
      sortValue: (r) => r.clientName,
      render: (r) => (
        <div>
          <p className="font-medium text-[#0B1320]">{r.clientName}</p>
          <p className="font-mono text-[11px] text-[#64748B]">
            {r.accountNumber} · {r.clientEmail}
          </p>
        </div>
      ),
    },
    {
      key: 'recorded',
      header: 'Recorded Balance',
      align: 'right',
      sortValue: (r) => r.recordedBalance,
      render: (r) => (
        <span className="font-mono font-medium text-[#0B1320] tabular-nums">
          {formatCurrency(r.recordedBalance, r.currency)}
        </span>
      ),
    },
    {
      key: 'netLedger',
      header: 'Net Ledger (Cr − Dr)',
      align: 'right',
      sortValue: (r) => r.netLedger,
      render: (r) => (
        <div className="font-mono tabular-nums">
          <p className="text-[#0B1320]">{formatCurrency(r.netLedger, r.currency)}</p>
          <p className="text-[11px] text-[#64748B]">{r.entryCount} entries</p>
        </div>
      ),
    },
    {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      sortValue: (r) => Math.abs(r.variance),
      render: (r) => {
        const balanced = Math.abs(r.variance) < 0.01;
        return balanced ? (
          <StatusTag status="verified" />
        ) : (
          <span className="font-mono font-semibold text-[#991B1B] tabular-nums">
            {r.variance > 0 ? '+' : ''}
            {formatCurrency(r.variance, r.currency)}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Reconcile',
      align: 'right',
      render: (r) =>
        hasAdminCapability(activeRole, 'post_ledger_adjustment') ? (
          <button
            type="button"
            onClick={() => {
              setAdjustmentClientId(r.userId);
              setAdjustmentEnabled(true);
              setAdjustmentConfirmed(false);
              if (Math.abs(r.variance) >= 0.01) {
                setAdjustmentMode(r.variance > 0 ? 'credit' : 'debit');
                setAdjustmentAmount(String(Math.abs(r.variance).toFixed(2)));
                setAdjustmentReason('Reconciliation variance adjustment');
                setAdjustmentReference(`RECON-${Date.now().toString().slice(-6)}`);
              }
              setTimeout(() => {
                ledgerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 80);
            }}
            className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
          >
            Open in Ledger
          </button>
        ) : (
          <span className="text-[11px] text-[#64748B]">View only</span>
        ),
    },
  ];

  const masterLedgerColumns: DataTableColumn<LedgerEntryRecord>[] = [
    {
      key: 'date',
      header: 'Posted Date',
      sortValue: (l) => String(l.created_at || l.posted_at || ''),
      render: (l) => (
        <span className="font-mono text-[#475569] tabular-nums">
          {formatDateTime(l.created_at || l.posted_at)}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      sortValue: (l) => String(l.user_id ? profileMap.get(l.user_id)?.full_name || '' : ''),
      render: (l) => {
        const client = l.user_id ? profileMap.get(l.user_id) : undefined;
        return (
          <div>
            <p className="font-medium text-[#0B1320]">{client?.full_name || 'Client'}</p>
            <p className="text-[11px] text-[#64748B]">{client?.email || l.user_id?.slice(0, 8) || '—'}</p>
          </div>
        );
      },
    },
    {
      key: 'reference',
      header: 'Reference & Description',
      sortValue: (l) => String(l.reference || l.description || ''),
      render: (l) => (
        <div>
          <p className="font-medium text-[#0B1320]">
            {l.description || l.memo || 'Recorded ledger entry'}
          </p>
          <p className="font-mono text-[11px] text-[#64748B]">{l.reference || l.id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Direction',
      sortValue: (l) => String(l.entry_type || l.type || ''),
      render: (l) => <StatusTag status={l.entry_type || l.type || l.status || 'recorded'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (l) => Number(l.amount || 0),
      render: (l) => (
        <span className="font-mono font-medium text-[#0B1320] tabular-nums">
          {formatCurrency(l.amount, l.currency || 'USD')}
        </span>
      ),
    },
  ];

  const holdingsColumns: DataTableColumn<HoldingRecord>[] = [
    {
      key: 'asset',
      header: 'Asset Position',
      sortValue: (h) => String(h.asset_name || h.name || ''),
      render: (h) => (
        <div>
          <p className="font-medium text-[#0B1320]">{h.asset_name || h.name || 'Asset'}</p>
          <p className="text-[11px] text-[#64748B]">{h.asset_category || h.category || 'Portfolio'}</p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      sortValue: (h) => String(h.user_id ? profileMap.get(h.user_id)?.full_name || '' : ''),
      render: (h) => {
        const client = h.user_id ? profileMap.get(h.user_id) : undefined;
        return (
          <div>
            <p className="font-medium text-[#0B1320]">{client?.full_name || 'Client'}</p>
            <p className="text-[11px] text-[#64748B]">{client?.email || h.user_id?.slice(0, 8) || '—'}</p>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Units / Qty',
      align: 'right',
      sortValue: (h) => Number(h.quantity || 0),
      render: (h) => <span className="font-mono tabular-nums text-[#334155]">{formatNumber(h.quantity)}</span>,
    },
    {
      key: 'value',
      header: 'Reported Value',
      align: 'right',
      sortValue: (h) => Number(h.reported_value ?? h.market_value ?? h.value ?? 0),
      render: (h) => (
        <span className="font-mono font-medium text-[#0B1320] tabular-nums">
          {formatCurrency(h.reported_value ?? h.market_value ?? h.value, h.currency || 'USD')}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      sortValue: (h) => String(h.updated_at || h.created_at || ''),
      render: (h) => (
        <span className="font-mono text-[#64748B] tabular-nums">
          {formatDate(h.updated_at || h.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (h) =>
        hasAdminCapability(activeRole, 'manage_holdings') ? (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => startEditingHolding(h)}
              className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => requestRemoveHoldingConfirmation(h)}
              className="border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B]"
            >
              Remove
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B]">Read only</span>
        ),
    },
  ];

  const complianceColumns: DataTableColumn<ComplianceReviewRecord>[] = [
    {
      key: 'date',
      header: 'Reviewed Date',
      sortValue: (c) => String(c.created_at || ''),
      render: (c) => (
        <span className="font-mono text-[#475569] tabular-nums">{formatDateTime(c.created_at)}</span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      sortValue: (c) => String(profileMap.get(c.user_id)?.full_name || ''),
      render: (c) => {
        const client = profileMap.get(c.user_id);
        return (
          <div>
            <p className="font-medium text-[#0B1320]">{client?.full_name || 'Client'}</p>
            <p className="text-[11px] text-[#64748B]">{client?.email || c.user_id.slice(0, 8)}</p>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Review Scope',
      sortValue: (c) => c.review_type,
      render: (c) => <span className="font-medium text-[#0B1320]">{c.review_type}</span>,
    },
    {
      key: 'risk',
      header: 'Risk',
      sortValue: (c) => c.risk_level,
      render: (c) => (
        <span
          className={`font-mono text-[11px] font-semibold uppercase ${
            c.risk_level === 'high'
              ? 'text-[#991B1B]'
              : c.risk_level === 'medium'
              ? 'text-[#92400E]'
              : 'text-[#166534]'
          }`}
        >
          {c.risk_level}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Determination',
      sortValue: (c) => c.status,
      render: (c) => <StatusTag status={c.status} />,
    },
    {
      key: 'notes',
      header: 'Screening Notes',
      render: (c) => <p className="max-w-xs truncate text-[#334155]">{c.notes || '—'}</p>,
    },
  ];

  const leadColumns: DataTableColumn<LeadRecord>[] = [
    {
      key: 'date',
      header: 'Received',
      sortValue: (l) => String(l.created_at || ''),
      render: (l) => (
        <span className="font-mono text-[#64748B] tabular-nums">{formatDate(l.created_at)}</span>
      ),
    },
    {
      key: 'prospect',
      header: 'Prospect',
      sortValue: (l) => String(l.full_name || l.name || l.email),
      render: (l) => (
        <div>
          <p className="font-medium text-[#0B1320]">{l.full_name || l.name || 'Prospect'}</p>
          <p className="text-[11px] text-[#64748B]">{l.email}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Message',
      render: (l) => (
        <div className="max-w-sm">
          <p className="font-medium text-[#0B1320]">{l.subject || 'Private Client Inquiry'}</p>
          <p className="truncate text-[11px] text-[#475569]">{l.message}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (l) => String(l.status || 'new'),
      render: (l) => <StatusTag status={l.status || 'new'} />,
    },
    {
      key: 'actions',
      header: 'Controls',
      align: 'right',
      render: (l) =>
        l.id && hasAdminCapability(activeRole, 'manage_leads') ? (
          <div className="inline-flex items-center gap-1.5">
            {(['under_review', 'contacted', 'archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                disabled={leadBusyId === l.id}
                onClick={() => void handleLeadStatusChange(l.id!, st)}
                className="border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320] disabled:opacity-50"
              >
                {normalizeStatusLabel(st)}
              </button>
            ))}
            <button
              type="button"
              disabled={leadBusyId === l.id}
              onClick={() => requestDeleteLeadConfirmation(l)}
              className="border border-[#FECACA] bg-[#FEF2F2] px-2 py-1 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B]"
            >
              Delete
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B]">View only</span>
        ),
    },
  ];

  const auditLogColumns: DataTableColumn<AdminActionLogRecord>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortValue: (log) => String(log.created_at || ''),
      render: (log) => (
        <span className="font-mono text-[#64748B] tabular-nums">
          {formatDateTime(log.created_at)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortValue: (log) => String(log.action || ''),
      render: (log) => (
        <span className="font-mono font-medium text-[#0B1320]">
          {log.action || 'admin_event'}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target Client / Record',
      render: (log) => {
        const client = log.target_user_id ? profileMap.get(log.target_user_id) : undefined;
        return (
          <div>
            <p className="text-[#0B1320]">
              {client ? client.full_name || client.email : log.target_user_id || 'System'}
            </p>
            {log.target_id ? (
              <p className="font-mono text-[11px] text-[#64748B]">Ref: {log.target_id.slice(0, 12)}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => (
        <p className="max-w-md truncate font-mono text-[11px] text-[#475569]">
          {log.details
            ? typeof log.details === 'string'
              ? log.details
              : JSON.stringify(log.details)
            : '—'}
        </p>
      ),
    },
  ];

  const adminRoleColumns: DataTableColumn<AdminUserRecord>[] = [
    {
      key: 'email',
      header: 'Administrator Account',
      sortValue: (a) => String(a.email || a.user_id),
      render: (a) => {
        const prof = profileMap.get(a.user_id);
        return (
          <div>
            <p className="font-medium text-[#0B1320]">
              {prof?.full_name || a.email || 'Administrator'}
            </p>
            <p className="text-[11px] text-[#64748B]">
              {a.email || prof?.email || a.user_id}
            </p>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortValue: (a) => a.role,
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-[#0B1320]">
          {ADMIN_ROLE_DEFINITIONS[a.role].label}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Permitted Scope',
      render: (a) => (
        <p className="max-w-md text-xs text-[#475569]">
          {ADMIN_ROLE_DEFINITIONS[a.role].description}
        </p>
      ),
    },
    {
      key: 'added',
      header: 'Granted',
      sortValue: (a) => String(a.created_at || ''),
      render: (a) => (
        <span className="font-mono text-[#64748B] tabular-nums">{formatDate(a.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Governance',
      align: 'right',
      render: (a) => (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRoleTargetEmail(a.email || profileMap.get(a.user_id)?.email || '');
              setRoleTargetSelection(a.role);
            }}
            className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
          >
            Edit Role
          </button>
          {a.user_id !== user.id ? (
            <button
              type="button"
              disabled={roleSubmitting}
              onClick={() => requestRevokeRoleConfirmation(a)}
              className="border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B] disabled:opacity-50"
            >
              Revoke
            </button>
          ) : (
            <span className="text-[11px] text-[#64748B]">Current Session</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <PortalShell
      title={sectionTitle}
      subtitle={`Verified via Supabase is_admin() · Active Role: ${ADMIN_ROLE_DEFINITIONS[activeRole].label}`}
      navItems={visibleNavItems}
      activeSection={activeSection}
      onSelectSection={(id) => setActiveSection(id as AdminSectionId)}
      onSignOut={handleSignOut}
      isAdminMode
      collapsible
      roleLabel={ADMIN_ROLE_DEFINITIONS[activeRole].label}
    >
      <div className="space-y-6">
        <ConfirmDialog
          open={Boolean(pendingConfirm)}
          title={pendingConfirm?.title || ''}
          description={pendingConfirm?.description || ''}
          confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
          tone={pendingConfirm?.tone || 'primary'}
          details={pendingConfirm?.details}
          busy={confirmBusy}
          onConfirm={executePendingConfirmation}
          onCancel={() => {
            if (!confirmBusy) setPendingConfirm(null);
          }}
        />

        {loadError ? <AlertBanner tone="error" message={loadError} /> : null}
        {roleRpcMissing || complianceReviewsMissing ? (
          <AlertBanner
            tone="warning"
            title="Database RBAC / Compliance Migration Pending"
            message="Some newly introduced backend RBAC or Compliance tables/functions (get_admin_role, compliance_reviews, admin_manage_role) were not yet detected in Supabase. Execute the updated PostgreSQL SQL script in your Supabase SQL Editor to activate full server-side role enforcement."
          />
        ) : null}
        {dataset?.warnings && dataset.warnings.length > 0 ? (
          <AlertBanner
            tone="warning"
            title="Supabase Schema / Policy Notices"
            message={dataset.warnings.join(' · ')}
          />
        ) : null}

        {/* Page Context Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">
              Institutional Administration · {ADMIN_ROLE_DEFINITIONS[activeRole].label}
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#0B1320]">{sectionTitle}</h2>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* 1. OVERVIEW & ANALYTICS */}
        {activeSection === 'overview' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setClientStatusFilter('all');
                  setActiveSection('clients');
                }}
                className="border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#0B1320]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#475569]">Registered Clients</p>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8F6F3E]" aria-hidden="true" />
                </div>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : profiles.length}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {accounts.length} recorded custody accounts
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (canAccessAdminSection(activeRole, 'finance')) {
                    setRequestStatusFilter('pending');
                    setActiveSection('finance');
                  } else {
                    setActiveSection('clients');
                  }
                }}
                className="border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#0B1320]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#475569]">Requests Requiring Review</p>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8F6F3E]" aria-hidden="true" />
                </div>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : pendingRequestsCount}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {requests.length} total financial requests
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (canAccessAdminSection(activeRole, 'finance')) {
                    setReconciliationFilter(varianceAccountsCount > 0 ? 'variance' : 'all');
                    setActiveSection('finance');
                  } else if (canAccessAdminSection(activeRole, 'compliance')) {
                    setActiveSection('compliance');
                  }
                }}
                className="border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#0B1320]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#475569]">Reconciliation Variance</p>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8F6F3E]" aria-hidden="true" />
                </div>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : varianceAccountsCount}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {varianceAccountsCount === 0
                    ? 'All custody accounts balanced'
                    : 'Accounts differ from net ledger'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (canAccessAdminSection(activeRole, 'compliance')) {
                    setActiveSection('compliance');
                  } else if (canAccessAdminSection(activeRole, 'support')) {
                    setSupportStatusFilter('open');
                    setActiveSection('support');
                  }
                }}
                className="border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#0B1320]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#475569]">Support &amp; Compliance Queue</p>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8F6F3E]" aria-hidden="true" />
                </div>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : openThreadsCount + flaggedComplianceCount}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {openThreadsCount} open threads · {flaggedComplianceCount} compliance items
                </p>
              </button>
            </div>

            {!dataLoading ? (
              <AdminOverviewAnalytics accounts={accounts} requests={requests} ledger={ledger} />
            ) : (
              <div className="border border-[#E2E8F0] bg-white p-6">
                <TableSkeleton rows={4} cols={4} />
              </div>
            )}

            {/* Action Required Queue */}
            <div className="border border-[#E2E8F0] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Operational Action Queue
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                    Pending Requests, Account Reviews &amp; Open Support
                  </h3>
                </div>
              </div>

              {dataLoading ? (
                <TableSkeleton rows={3} cols={4} />
              ) : (
                (() => {
                  const actionableRequests = requests.filter((r) => {
                    const st = String(r.status || 'pending').toLowerCase();
                    return st.includes('pend') || st === 'under_review';
                  });
                  const actionableAccounts = accounts.filter(
                    (a) => String(a.status || '').toLowerCase() === 'pending_review'
                  );
                  const actionableSupport = supportThreads.filter((t) => {
                    const st = String(t.status || 'open').toLowerCase();
                    return st === 'open' || st === 'under_review';
                  });

                  if (
                    actionableRequests.length === 0 &&
                    actionableAccounts.length === 0 &&
                    actionableSupport.length === 0
                  ) {
                    return (
                      <p className="py-6 text-center text-xs text-[#475569]">
                        No pending financial requests, accounts under review, or open support threads right now.
                      </p>
                    );
                  }

                  return (
                    <div className="mt-4 divide-y divide-[#E2E8F0]">
                      {actionableRequests.slice(0, 6).map((req) => {
                        const client = req.user_id ? profileMap.get(req.user_id) : undefined;
                        return (
                          <div key={`req-${req.id}`} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-medium text-[#0B1320]">
                                {normalizeStatusLabel(req.request_type || req.type || 'Financial Request')} ·{' '}
                                <span className="font-mono">{formatCurrency(req.amount, req.currency || 'USD')}</span>
                              </p>
                              <p className="mt-0.5 text-[#64748B]">
                                {client?.full_name || client?.email || req.user_id} · {formatDateTime(req.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusTag status={req.status || 'pending'} />
                              {canAccessAdminSection(activeRole, 'finance') ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequestStatusFilter('all');
                                    setEditingRequestId(req.id);
                                    setActiveSection('finance');
                                  }}
                                  className="bg-[#0B1320] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#18263D]"
                                >
                                  Review Request
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {actionableAccounts.slice(0, 4).map((acc) => {
                        const uid = acc.user_id || acc.id;
                        const client = profileMap.get(uid);
                        return (
                          <div key={`acc-${acc.id}`} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-medium text-[#0B1320]">
                                Account Review Required · <span className="font-mono">{acc.account_number || acc.id.slice(0, 8)}</span>
                              </p>
                              <p className="mt-0.5 text-[#64748B]">
                                {client?.full_name || client?.email || uid} · {String(acc.currency || 'USD').toUpperCase()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusTag status={acc.status || 'pending_review'} />
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClientId(uid);
                                  setActiveSection('clients');
                                }}
                                className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                              >
                                Inspect Client
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {actionableSupport.slice(0, 4).map((thread) => {
                        const client = profileMap.get(thread.clientUserId);
                        return (
                          <div key={`sup-${thread.key}`} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-medium text-[#0B1320]">Support Inquiry · {thread.subject}</p>
                              <p className="mt-0.5 text-[#64748B]">
                                {client?.full_name || client?.email || thread.clientUserId} · {formatDateTime(thread.lastUpdated)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusTag status={thread.status} />
                              {canAccessAdminSection(activeRole, 'support') ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupportKey(thread.key);
                                    setActiveSection('support');
                                  }}
                                  className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                                >
                                  Open Thread
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ) : null}

        {/* 2. REGISTERED CLIENTS DIRECTORY + CLIENT 360 INSPECTOR */}
        {activeSection === 'clients' ? (
          <div className="space-y-6">
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">Registered Clients</h3>
                  <p className="text-xs text-[#64748B]">
                    Every registered client in Supabase appears here dynamically. Select any row to inspect custody, requests, holdings, and compliance details.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search name, email, or account no..."
                      className="w-64 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320] focus:border-[#0B1320] focus:outline-none"
                    />
                  </div>
                  <select
                    value={clientStatusFilter}
                    onChange={(e) => setClientStatusFilter(e.target.value)}
                    aria-label="Filter clients by account status"
                    className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320] focus:border-[#0B1320] focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                    <option value="closed">Closed</option>
                    <option value="no_account">Unprovisioned</option>
                  </select>
                </div>
              </div>

              <DataTable
                rows={filteredClients}
                columns={clientColumns}
                rowKey={(p) => p.id}
                loading={dataLoading}
                selectedRowKey={selectedClientId}
                onRowClick={(p) => setSelectedClientId(p.id)}
                emptyTitle="No Clients Matched"
                emptyDescription="No registered client profiles match the current search or account status filter."
              />
            </div>

            {/* Client 360° Inspector */}
            <div ref={clientInspectorRef} className="border border-[#E2E8F0] bg-white p-6 space-y-6">
              {!selectedClient ? (
                <EmptyState
                  title="Select a Client"
                  description="Choose any client from the directory above to inspect their profile, custody balance, compliance status, and recent activity."
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                        Client 360° Custody Record
                      </p>
                      <h3 className="mt-1 font-serif text-xl text-[#0B1320]">
                        {selectedClient.full_name || 'Client Profile'}
                      </h3>
                      <p className="mt-1 text-xs text-[#475569]">
                        {selectedClient.email || selectedClient.id}
                        {selectedClient.country ? ` · ${selectedClient.country}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasAdminCapability(activeRole, 'edit_client_profile') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfileOpen((prev) => !prev);
                            setProfileFeedback(null);
                          }}
                          className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{editingProfileOpen ? 'Close Profile Editor' : 'Edit Profile'}</span>
                        </button>
                      ) : null}

                      {hasAdminCapability(activeRole, 'edit_account_status') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccountOpen((prev) => !prev);
                            setAccountFeedback(null);
                          }}
                          className="inline-flex items-center gap-1.5 bg-[#0B1320] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#18263D]"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          <span>
                            {selectedClientAccount
                              ? editingAccountOpen
                                ? 'Close Account Editor'
                                : 'Manage Account Status'
                              : 'Provision Account'}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {profileFeedback ? (
                    <AlertBanner tone={profileFeedback.tone} message={profileFeedback.message} />
                  ) : null}
                  {accountFeedback ? (
                    <AlertBanner tone={accountFeedback.tone} message={accountFeedback.message} />
                  ) : null}

                  {editingProfileOpen && hasAdminCapability(activeRole, 'edit_client_profile') ? (
                    <form onSubmit={handleSaveProfile} className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-4">
                      <p className="text-xs font-semibold text-[#0B1320]">Edit Client Profile (Logged)</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="admin-edit-fullname" className="block text-xs font-medium text-[#334155]">
                            Full Legal Name
                          </label>
                          <input
                            id="admin-edit-fullname"
                            type="text"
                            required
                            value={editProfileName}
                            onChange={(e) => setEditProfileName(e.target.value)}
                            className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                          />
                        </div>
                        <div>
                          <label htmlFor="admin-edit-country" className="block text-xs font-medium text-[#334155]">
                            Country / Jurisdiction
                          </label>
                          <input
                            id="admin-edit-country"
                            type="text"
                            value={editProfileCountry}
                            onChange={(e) => setEditProfileCountry(e.target.value)}
                            className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                        >
                          {profileSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProfileOpen(false)}
                          className="border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#0B1320]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {editingAccountOpen && hasAdminCapability(activeRole, 'edit_account_status') ? (
                    <form onSubmit={requestSaveAccountConfirmation} className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-4">
                      <p className="text-xs font-semibold text-[#0B1320]">
                        {selectedClientAccount
                          ? 'Update Custody Account Status & Parameters'
                          : 'Provision Client Custody Account'}
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="admin-edit-acc-status" className="block text-xs font-medium text-[#334155]">
                            Account Status
                          </label>
                          <select
                            id="admin-edit-acc-status"
                            value={editAccountStatus}
                            onChange={(e) => setEditAccountStatus(e.target.value as AdminAccountStatus)}
                            className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                          >
                            {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="admin-edit-acc-cur" className="block text-xs font-medium text-[#334155]">
                            Currency (ISO)
                          </label>
                          <input
                            id="admin-edit-acc-cur"
                            type="text"
                            maxLength={3}
                            required
                            value={editAccountCurrency}
                            onChange={(e) => setEditAccountCurrency(e.target.value.toUpperCase())}
                            className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                          />
                        </div>
                        <div>
                          <label htmlFor="admin-edit-acc-num" className="block text-xs font-medium text-[#334155]">
                            Account Number
                          </label>
                          <input
                            id="admin-edit-acc-num"
                            type="text"
                            value={editAccountNumber}
                            onChange={(e) => setEditAccountNumber(e.target.value)}
                            placeholder="Auto-generated if empty"
                            className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={accountSaving}
                          className="bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                        >
                          {accountSaving ? 'Saving...' : 'Review & Save Account'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAccountOpen(false)}
                          className="border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#0B1320]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <p className="text-xs text-[#64748B]">Account Number</p>
                      <p className="mt-1 font-mono text-sm font-medium text-[#0B1320]">
                        {selectedClientAccount?.account_number || 'Unprovisioned'}
                      </p>
                    </div>
                    <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <p className="text-xs text-[#64748B]">Account Status</p>
                      <div className="mt-1">
                        <StatusTag status={selectedClientAccount?.status || 'no_account'} />
                      </div>
                    </div>
                    <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <p className="text-xs text-[#64748B]">Recorded Balance</p>
                      <p className="mt-1 font-mono text-base font-medium text-[#0B1320] tabular-nums">
                        {selectedClientAccount
                          ? formatCurrency(selectedClientAccount.balance, selectedClientAccount.currency || 'USD')
                          : '—'}
                      </p>
                    </div>
                    <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <p className="text-xs text-[#64748B]">Holdings &amp; Requests</p>
                      <p className="mt-1 font-mono text-sm font-medium text-[#0B1320] tabular-nums">
                        {selectedClientHoldings.length} positions · {selectedClientRequests.length} requests
                      </p>
                    </div>
                  </div>

                  {/* Quick Cross-Section Actions */}
                  <div className="flex flex-wrap gap-2">
                    {hasAdminCapability(activeRole, 'manage_fund_adjustments') && selectedClientAccount ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFundsTargetUserId(selectedClient.id);
                          setActiveSection('funds');
                        }}
                        className="bg-[#0B1320] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#18263D]"
                      >
                        Open Client Funds Management
                      </button>
                    ) : null}
                    {hasAdminCapability(activeRole, 'post_ledger_adjustment') && selectedClientAccount ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustmentClientId(selectedClient.id);
                          setAdjustmentEnabled(true);
                          setActiveSection('finance');
                        }}
                        className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                      >
                        Post Ledger Adjustment
                      </button>
                    ) : null}
                    {hasAdminCapability(activeRole, 'manage_holdings') ? (
                      <button
                        type="button"
                        onClick={() => {
                          setHoldingTargetClientId(selectedClient.id);
                          setCiUserId(selectedClient.id);
                          setActiveSection('investments');
                        }}
                        className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                      >
                        Manage Client Investments
                      </button>
                    ) : null}
                    {hasAdminCapability(activeRole, 'manage_compliance') ? (
                      <button
                        type="button"
                        onClick={() => {
                          setComplianceTargetClientId(selectedClient.id);
                          setActiveSection('compliance');
                        }}
                        className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                      >
                        Submit Compliance Review
                      </button>
                    ) : null}
                  </div>

                  {/* Client Recent Ledger + Compliance Summary */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="border border-[#E2E8F0] p-4">
                      <h4 className="font-serif text-base text-[#0B1320] mb-3">
                        Recent Client Ledger Activity
                      </h4>
                      {selectedClientLedger.length === 0 ? (
                        <p className="text-xs text-[#64748B]">No ledger entries recorded for this client.</p>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                          {selectedClientLedger.slice(0, 6).map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <p className="font-medium text-[#0B1320]">
                                  {entry.description || entry.memo || entry.reference || 'Ledger entry'}
                                </p>
                                <p className="text-[11px] text-[#64748B]">
                                  {formatDateTime(entry.created_at || entry.posted_at)}
                                </p>
                              </div>
                              <div className="text-right font-mono tabular-nums">
                                <p className="font-medium text-[#0B1320]">
                                  {formatCurrency(entry.amount, entry.currency || 'USD')}
                                </p>
                                <StatusTag status={entry.entry_type || entry.type || 'recorded'} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-[#E2E8F0] p-4">
                      <h4 className="font-serif text-base text-[#0B1320] mb-3">
                        Compliance History &amp; Financial Requests
                      </h4>
                      {selectedClientCompliance.length === 0 && selectedClientRequests.length === 0 ? (
                        <p className="text-xs text-[#64748B]">
                          No compliance determinations or financial requests recorded for this client.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0]">
                          {selectedClientCompliance.slice(0, 3).map((rev) => (
                            <div key={rev.id} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <p className="font-medium text-[#0B1320]">{rev.review_type}</p>
                                <p className="text-[11px] text-[#64748B] truncate max-w-xs">{rev.notes}</p>
                              </div>
                              <StatusTag status={rev.status} />
                            </div>
                          ))}
                          {selectedClientRequests.slice(0, 4).map((req) => (
                            <div key={req.id} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <p className="font-medium text-[#0B1320]">
                                  {normalizeStatusLabel(req.request_type || req.type || 'Request')} ·{' '}
                                  <span className="font-mono">
                                    {formatCurrency(req.amount, req.currency || 'USD')}
                                  </span>
                                </p>
                                <p className="text-[11px] text-[#64748B]">{formatDate(req.created_at)}</p>
                              </div>
                              <StatusTag status={req.status || 'pending'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* 2B. CLIENT FUNDS MANAGEMENT (SUPER_ADMIN & FINANCE_ADMIN) */}
        {activeSection === 'funds' && hasAdminCapability(activeRole, 'manage_fund_adjustments') ? (
          <ClientFundsManagement
            profiles={profiles}
            accounts={accounts}
            holdings={holdings}
            clientInvestments={clientInvestments}
            requests={requests}
            ledger={ledger}
            adminEmail={user.email || 'Administrator'}
            targetUserId={fundsTargetUserId}
            prefillSettlement={fundsPrefill}
            onCompleted={loadAdminData}
          />
        ) : null}

        {/* 3. FINANCE, RECONCILIATION & MASTER LEDGER */}
        {activeSection === 'finance' ? (
          <div className="space-y-8">
            {/* Financial Request Review Queue */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Client Request Adjudication
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                    Deposit &amp; Withdrawal Requests Queue
                  </h3>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                  <input
                    type="text"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Search client, type, or notes..."
                    className="w-64 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320] focus:border-[#0B1320] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'under_review', 'approved', 'rejected', 'settled'] as const).map(
                  (filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setRequestStatusFilter(filterKey)}
                      className={`border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                        requestStatusFilter === filterKey
                          ? 'border-[#0B1320] bg-[#0B1320] text-white'
                          : 'border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#0B1320]'
                      }`}
                    >
                      {filterKey === 'all' ? 'All' : normalizeStatusLabel(filterKey)} ({requestCounts[filterKey]})
                    </button>
                  )
                )}
              </div>

              {requestFeedback ? (
                <AlertBanner tone={requestFeedback.tone} message={requestFeedback.message} />
              ) : null}

              {dataLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : filteredRequests.length === 0 ? (
                <EmptyState
                  title="No Financial Requests"
                  description="No client deposit or withdrawal requests match the selected filter."
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                  {filteredRequests.map((req) => {
                    const client = req.user_id ? profileMap.get(req.user_id) : undefined;
                    const noteValue =
                      reviewNotesMap[req.id] !== undefined ? reviewNotesMap[req.id] : req.admin_notes || '';
                    const isEditing = editingRequestId === req.id;

                    return (
                      <div key={req.id} className="p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-medium text-sm text-[#0B1320]">
                                {normalizeStatusLabel(req.request_type || req.type || 'Financial Request')}
                              </span>
                              <StatusTag status={req.status || 'pending'} />
                            </div>
                            <p className="mt-1 text-xs text-[#475569]">
                              Client:{' '}
                              <span className="font-medium text-[#0B1320]">
                                {client?.full_name || client?.email || req.user_id || 'Unknown'}
                              </span>
                              {client?.email ? ` (${client.email})` : ''} · Submitted{' '}
                              {formatDateTime(req.created_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="font-mono text-base font-medium text-[#0B1320] tabular-nums">
                              {formatCurrency(req.amount, req.currency || 'USD')}
                            </p>
                            {hasAdminCapability(activeRole, 'manage_finance_requests') ? (
                              <button
                                type="button"
                                onClick={() => setEditingRequestId(isEditing ? null : req.id)}
                                className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                              >
                                {isEditing ? 'Close Controls' : 'Review & Edit'}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {req.notes || req.reason ? (
                          <p className="text-xs text-[#334155]">Client Note: {req.notes || req.reason}</p>
                        ) : null}

                        {req.admin_notes && !isEditing ? (
                          <p className="border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#334155]">
                            Recorded Admin Note: {req.admin_notes}
                          </p>
                        ) : null}

                        {isEditing && hasAdminCapability(activeRole, 'manage_finance_requests') ? (
                          <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                            <label
                              htmlFor={`admin-note-${req.id}`}
                              className="block text-xs font-medium text-[#0B1320]"
                            >
                              Administrator Decision Note
                            </label>
                            <input
                              id={`admin-note-${req.id}`}
                              type="text"
                              value={noteValue}
                              onChange={(e) =>
                                setReviewNotesMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                              placeholder="Enter institutional review note..."
                              className="w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                            />
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {REQUEST_DECISION_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={reviewingId === req.id}
                                  onClick={() => requestReviewDecisionConfirmation(req, opt.value)}
                                  className={`px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${opt.buttonClass}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                              {hasAdminCapability(activeRole, 'manage_fund_adjustments') ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFundsForRequest(req)}
                                  className="ml-auto border border-[#0B1320] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:bg-[#0B1320] hover:text-white"
                                >
                                  Settle via Client Funds
                                </button>
                              ) : hasAdminCapability(activeRole, 'post_ledger_adjustment') ? (
                                <button
                                  type="button"
                                  onClick={() => handlePrepareLedgerSettlement(req)}
                                  className="ml-auto border border-[#8F6F3E] bg-white px-3 py-1.5 text-xs font-medium text-[#8F6F3E] hover:bg-[#8F6F3E] hover:text-white"
                                >
                                  Prepare Ledger Settlement
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Balance Reconciliation Engine */}
            {hasAdminCapability(activeRole, 'view_reconciliation') ? (
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                      Financial Control &amp; Audit
                    </p>
                    <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                      Account Balance vs. Ledger Reconciliation
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reconciliationFilter}
                      onChange={(e) =>
                        setReconciliationFilter(e.target.value as 'all' | 'variance' | 'reconciled')
                      }
                      aria-label="Filter reconciliation view"
                      className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                    >
                      <option value="all">All Accounts ({accounts.length})</option>
                      <option value="variance">Variance Only ({varianceAccountsCount})</option>
                      <option value="reconciled">Reconciled Only</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'northbridge-reconciliation.csv',
                          ['Client', 'Account', 'Currency', 'Recorded Balance', 'Credits', 'Debits', 'Net Ledger', 'Variance'],
                          reconciliationRows.map((r) => [
                            r.clientName,
                            r.accountNumber,
                            r.currency,
                            r.recordedBalance.toFixed(2),
                            r.ledgerCredits.toFixed(2),
                            r.ledgerDebits.toFixed(2),
                            r.netLedger.toFixed(2),
                            r.variance.toFixed(2),
                          ])
                        )
                      }
                      className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <DataTable
                  rows={reconciliationRows}
                  columns={reconciliationColumns}
                  rowKey={(r) => r.accountId}
                  loading={dataLoading}
                  emptyTitle="No Custody Accounts"
                  emptyDescription="Reconciliation rows calculate automatically from live Supabase accounts and account_ledger records."
                />
              </div>
            ) : null}

            {/* Administrative Ledger Adjustment Console */}
            {hasAdminCapability(activeRole, 'post_ledger_adjustment') ? (
              <div ref={ledgerSectionRef} className="border border-[#E2E8F0] bg-white p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                      Server-Authorized Settlement
                    </p>
                    <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                      Administrative Ledger Credit / Debit Console
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0B1320] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adjustmentEnabled}
                      onChange={(e) => {
                        setAdjustmentEnabled(e.target.checked);
                        if (!e.target.checked) setAdjustmentConfirmed(false);
                      }}
                      className="h-4 w-4 accent-[#0B1320]"
                    />
                    <span>Enable Ledger Posting Mode</span>
                  </label>
                </div>

                {adjustmentFeedback ? (
                  <AlertBanner tone={adjustmentFeedback.tone} message={adjustmentFeedback.message} />
                ) : null}

                <form onSubmit={requestLedgerAdjustmentConfirmation} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label htmlFor="adj-client" className="block text-xs font-medium text-[#334155]">
                        Target Client
                      </label>
                      <select
                        id="adj-client"
                        disabled={!adjustmentEnabled}
                        value={adjustmentClientId}
                        onChange={(e) => setAdjustmentClientId(e.target.value)}
                        className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320] disabled:bg-[#F1F5F9]"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email || p.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="adj-mode" className="block text-xs font-medium text-[#334155]">
                        Operation Type
                      </label>
                      <select
                        id="adj-mode"
                        disabled={!adjustmentEnabled}
                        value={adjustmentMode}
                        onChange={(e) => setAdjustmentMode(e.target.value as 'credit' | 'debit')}
                        className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320] disabled:bg-[#F1F5F9]"
                      >
                        <option value="credit">Credit (Increase Balance)</option>
                        <option value="debit">Debit (Decrease Balance)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="adj-amount" className="block text-xs font-medium text-[#334155]">
                        Amount ({String(adjustmentTargetAccount?.currency || 'USD').toUpperCase()})
                      </label>
                      <input
                        id="adj-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        disabled={!adjustmentEnabled}
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320] disabled:bg-[#F1F5F9]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adj-ref" className="block text-xs font-medium text-[#334155]">
                        Settlement Reference
                      </label>
                      <input
                        id="adj-ref"
                        type="text"
                        disabled={!adjustmentEnabled}
                        value={adjustmentReference}
                        onChange={(e) => setAdjustmentReference(e.target.value)}
                        placeholder="Optional reference code"
                        className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320] disabled:bg-[#F1F5F9]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="adj-reason" className="block text-xs font-medium text-[#334155]">
                      Mandatory Audit Justification
                    </label>
                    <input
                      id="adj-reason"
                      type="text"
                      disabled={!adjustmentEnabled}
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Specify custody settlement, wire reference, or reconciliation justification..."
                      className="mt-1 block w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320] disabled:bg-[#F1F5F9]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] pt-4">
                    <label className="inline-flex items-center gap-2 text-xs text-[#334155] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!adjustmentEnabled}
                        checked={adjustmentConfirmed}
                        onChange={(e) => setAdjustmentConfirmed(e.target.checked)}
                        className="h-4 w-4 accent-[#0B1320]"
                      />
                      <span>
                        I confirm this entry reflects verified custody settlement and will be recorded permanently.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={!adjustmentEnabled || !adjustmentConfirmed || adjustmentSubmitting}
                      className="inline-flex items-center gap-2 bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-40"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>{adjustmentSubmitting ? 'Posting...' : 'Review & Execute Adjustment'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* Master Account Ledger Explorer */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Transaction Audit
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">Master Account Ledger</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search client, reference, memo..."
                      className="w-60 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                    />
                  </div>
                  <select
                    value={ledgerTypeFilter}
                    onChange={(e) => setLedgerTypeFilter(e.target.value as 'all' | 'credit' | 'debit')}
                    aria-label="Filter ledger by direction"
                    className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                  >
                    <option value="all">All Entries</option>
                    <option value="credit">Credits Only</option>
                    <option value="debit">Debits Only</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'northbridge-ledger.csv',
                        ['Date', 'Client', 'Reference', 'Direction', 'Amount', 'Currency', 'Description'],
                        filteredLedger.map((l) => [
                          l.created_at || l.posted_at || '',
                          profileMap.get(l.user_id || '')?.email || l.user_id || '',
                          l.reference || l.id,
                          l.entry_type || l.type || '',
                          Number(l.amount || 0).toFixed(2),
                          l.currency || 'USD',
                          l.description || l.memo || '',
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <DataTable
                rows={filteredLedger}
                columns={masterLedgerColumns}
                rowKey={(l) => l.id}
                loading={dataLoading}
                emptyTitle="No Ledger Entries"
                emptyDescription="No account ledger transactions match the active filter."
              />
            </div>
          </div>
        ) : null}

        {/* 4. INVESTMENTS & HOLDINGS */}
        {activeSection === 'investments' ? (
          <div className="space-y-8">
            <AdminHoldingsAnalytics holdings={holdings} />

            {holdingFeedback ? (
              <AlertBanner tone={holdingFeedback.tone} message={holdingFeedback.message} />
            ) : null}

            {editingHoldingId && hasAdminCapability(activeRole, 'manage_holdings') ? (
              <form onSubmit={handleSaveEditedHolding} className="border border-[#0B1320] bg-white p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <h3 className="font-serif text-lg text-[#0B1320]">Edit Portfolio Holding</h3>
                  <button
                    type="button"
                    onClick={() => setEditingHoldingId(null)}
                    className="text-xs font-medium text-[#475569] hover:text-[#0B1320]"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Asset Name</label>
                    <input
                      type="text"
                      required
                      value={editHoldingName}
                      onChange={(e) => setEditHoldingName(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Asset Category</label>
                    <input
                      type="text"
                      required
                      value={editHoldingCategory}
                      onChange={(e) => setEditHoldingCategory(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={editHoldingQty}
                      onChange={(e) => setEditHoldingQty(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Reported Value</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editHoldingValue}
                      onChange={(e) => setEditHoldingValue(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Currency</label>
                    <input
                      type="text"
                      maxLength={3}
                      required
                      value={editHoldingCurrency}
                      onChange={(e) => setEditHoldingCurrency(e.target.value.toUpperCase())}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editHoldingSaving}
                    className="bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                  >
                    {editHoldingSaving ? 'Saving...' : 'Save Holding Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHoldingId(null)}
                    className="border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#0B1320]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {/* All Client Holdings Table */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">Portfolio Holdings Registry</h3>
                  <p className="text-xs text-[#64748B]">
                    All recorded custody positions across clients in public.holdings.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={holdingsSearch}
                      onChange={(e) => setHoldingsSearch(e.target.value)}
                      placeholder="Search asset or client..."
                      className="w-56 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                    />
                  </div>
                  <select
                    value={holdingsCategoryFilter}
                    onChange={(e) => setHoldingsCategoryFilter(e.target.value)}
                    aria-label="Filter holdings by category"
                    className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                  >
                    <option value="all">All Categories</option>
                    {holdingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DataTable
                rows={filteredHoldings}
                columns={holdingsColumns}
                rowKey={(h) => h.id}
                loading={dataLoading}
                emptyTitle="No Holdings Found"
                emptyDescription="No portfolio positions match the active search or category filter."
              />
            </div>

            {/* Record New Holding */}
            {hasAdminCapability(activeRole, 'manage_holdings') ? (
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Position Entry
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                    Record New Client Holding
                  </h3>
                </div>
                <form onSubmit={handleAddClientHolding} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label htmlFor="hold-client" className="block text-xs font-medium text-[#334155]">
                      Client
                    </label>
                    <select
                      id="hold-client"
                      required
                      value={holdingTargetClientId}
                      onChange={(e) => setHoldingTargetClientId(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email || p.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="hold-asset" className="block text-xs font-medium text-[#334155]">
                      Asset Name
                    </label>
                    <input
                      id="hold-asset"
                      type="text"
                      required
                      value={holdingAssetName}
                      onChange={(e) => setHoldingAssetName(e.target.value)}
                      placeholder="e.g. UK Gilts 2030"
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label htmlFor="hold-cat" className="block text-xs font-medium text-[#334155]">
                      Category
                    </label>
                    <input
                      id="hold-cat"
                      type="text"
                      required
                      value={holdingCategory}
                      onChange={(e) => setHoldingCategory(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label htmlFor="hold-qty" className="block text-xs font-medium text-[#334155]">
                      Quantity
                    </label>
                    <input
                      id="hold-qty"
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={holdingQuantity}
                      onChange={(e) => setHoldingQuantity(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label htmlFor="hold-val" className="block text-xs font-medium text-[#334155]">
                      Reported Value
                    </label>
                    <input
                      id="hold-val"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={holdingValue}
                      onChange={(e) => setHoldingValue(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                    <div className="sm:col-span-2 lg:col-span-5">
                    <button
                      type="submit"
                      disabled={holdingSubmitting}
                      className="bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                    >
                      {holdingSubmitting ? 'Recording...' : 'Add Holding Position'}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* Client Investment Contracts (Active & Historical Mandates) */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
              <div className="border-b border-[#E2E8F0] pb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Mandate Contracts &amp; Verified Earnings
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                  Client Investment Positions ({clientInvestments.length})
                </h3>
                <p className="text-xs text-[#64748B]">
                  Issue approved client investment agreements, record actual verified earnings, and update maturity/completion status.
                </p>
              </div>

              {clientInvestments.length === 0 ? (
                <EmptyState
                  title="No Investment Contracts Recorded"
                  description="Client investment contracts provisioned by Investment Admin appear here and inside the client's My Investments workspace."
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                  {clientInvestments.map((ci: ClientInvestmentRecord) => {
                    const client = profileMap.get(ci.user_id);
                    const isEditingCi = editingContractId === ci.id;
                    return (
                      <div key={ci.id} className="p-4 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-[#0B1320]">
                              {ci.product_name} · <span className="font-mono">{ci.reference_number}</span>
                            </p>
                            <p className="text-[#475569]">
                              {client?.full_name || client?.email || ci.user_id} · Principal:{' '}
                              <span className="font-mono font-medium text-[#0B1320]">
                                {formatCurrency(ci.principal_amount, ci.currency)}
                              </span>{' '}
                              · Verified Earnings:{' '}
                              <span className="font-mono font-medium text-[#166534]">
                                {formatCurrency(ci.recorded_earnings, ci.currency)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusTag status={ci.status} />
                            {hasAdminCapability(activeRole, 'manage_investment_products') ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContractId(isEditingCi ? null : ci.id);
                                  setEditContractEarnings(String(ci.recorded_earnings || 0));
                                  setEditContractStatus(
                                    (ci.status as
                                      | 'pending_approval'
                                      | 'active'
                                      | 'matured'
                                      | 'completed'
                                      | 'cancelled') || 'active'
                                  );
                                }}
                                className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320]"
                              >
                                {isEditingCi ? 'Close' : 'Update Status / Earnings'}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isEditingCi ? (
                          <form onSubmit={handleSaveEditedContract} className="flex flex-wrap items-end gap-3 bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                            <div>
                              <label className="block text-[11px] font-medium text-[#334155]">
                                Verified Recorded Earnings ({ci.currency})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={editContractEarnings}
                                onChange={(e) => setEditContractEarnings(e.target.value)}
                                className="mt-1 border border-[#CBD5E1] bg-white px-3 py-1.5 font-mono text-xs text-[#0B1320]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-[#334155]">Contract Status</label>
                              <select
                                value={editContractStatus}
                                onChange={(e) =>
                                  setEditContractStatus(
                                    e.target.value as 'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled'
                                  )
                                }
                                className="mt-1 border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                              >
                                <option value="pending_approval">Pending Approval</option>
                                <option value="active">Active</option>
                                <option value="matured">Matured</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="bg-[#0B1320] px-4 py-1.5 text-xs font-medium text-white"
                            >
                              Save Contract Update
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasAdminCapability(activeRole, 'manage_investment_products') ? (
                <form onSubmit={handleCreateClientContract} className="border-t border-[#E2E8F0] pt-5 space-y-4">
                  <h4 className="font-serif text-base text-[#0B1320]">Issue Client Investment Contract</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Client *</label>
                      <select
                        required
                        value={ciUserId}
                        onChange={(e) => setCiUserId(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email || p.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Catalog Product (Optional)</label>
                      <select
                        value={ciProductId}
                        onChange={(e) => {
                          setCiProductId(e.target.value);
                          const prod = investmentProducts.find((ip) => ip.id === e.target.value);
                          if (prod) {
                            setCiProductName(prod.name);
                            setCiTerms(prod.contractual_terms || '');
                          }
                        }}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        <option value="">Custom Contract</option>
                        {investmentProducts.map((ip) => (
                          <option key={ip.id} value={ip.id}>
                            {ip.name} ({ip.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={ciProductName}
                        onChange={(e) => setCiProductName(e.target.value)}
                        placeholder="e.g. Sovereign Liquidity Mandate"
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Reference Number *</label>
                      <input
                        type="text"
                        required
                        value={ciReference}
                        onChange={(e) => setCiReference(e.target.value)}
                        placeholder="e.g. INV-2026-0041"
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Principal Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={ciPrincipal}
                        onChange={(e) => setCiPrincipal(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Start Date</label>
                      <input
                        type="date"
                        value={ciStartDate}
                        onChange={(e) => setCiStartDate(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Maturity Date</label>
                      <input
                        type="date"
                        value={ciMaturityDate}
                        onChange={(e) => setCiMaturityDate(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Initial Status</label>
                      <select
                        value={ciStatus}
                        onChange={(e) =>
                          setCiStatus(
                            e.target.value as 'pending_approval' | 'active' | 'matured' | 'completed' | 'cancelled'
                          )
                        }
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ciTerms}
                    onChange={(e) => setCiTerms(e.target.value)}
                    placeholder="Contractual return terms & mandate disclosures (no guaranteed return language)"
                    className="w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                  />
                  <button
                    type="submit"
                    disabled={ciSaving}
                    className="bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                  >
                    {ciSaving ? 'Issuing Contract...' : 'Record Client Investment'}
                  </button>
                </form>
              ) : null}
            </div>

            {/* Institutional Investment Products Catalog */}
            {hasAdminCapability(activeRole, 'manage_investment_products') ? (
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Product Governance
                  </p>
                  <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                    Investment Products Catalog ({investmentProducts.length})
                  </h3>
                </div>
                {investmentProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {investmentProducts.map((ip) => (
                      <div key={ip.id} className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs space-y-2 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-serif text-base text-[#0B1320]">{ip.name}</p>
                            <StatusTag status={ip.is_active ? 'active' : 'inactive'} />
                          </div>
                          <p className="text-[#8F6F3E] font-medium">
                            {ip.category} · {ip.risk_classification} · {ip.duration_months} mo
                          </p>
                          <p className="font-mono text-[#334155]">
                            Min: {formatCurrency(ip.min_amount, ip.currency)}
                          </p>
                          <p className="text-[#475569]">{ip.contractual_terms}</p>
                        </div>
                        <div className="pt-2 border-t border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() => void handleToggleProductStatus(ip)}
                            className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
                          >
                            {ip.is_active ? 'Deactivate Product' : 'Reactivate Product'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <form onSubmit={handleCreateProduct} className="border-t border-[#E2E8F0] pt-4 space-y-3">
                  <h4 className="font-serif text-base text-[#0B1320]">Add Institutional Investment Product</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Product Name *"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      required
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="Category"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      maxLength={3}
                      required
                      value={prodCurrency}
                      onChange={(e) => setProdCurrency(e.target.value.toUpperCase())}
                      placeholder="USD"
                      className="border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      value={prodMinAmount}
                      onChange={(e) => setProdMinAmount(e.target.value)}
                      placeholder="Min Allocation"
                      className="border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      value={prodDuration}
                      onChange={(e) => setProdDuration(e.target.value)}
                      placeholder="Term (Months)"
                      className="border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={prodRisk}
                      onChange={(e) => setProdRisk(e.target.value)}
                      placeholder="Risk Classification (e.g. Conservative)"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      required
                      value={prodTerms}
                      onChange={(e) => setProdTerms(e.target.value)}
                      placeholder="Contractual return & liquidity terms (no fabricated performance) *"
                      className="sm:col-span-2 border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={prodSaving}
                    className="bg-[#0B1320] px-5 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
                  >
                    {prodSaving ? 'Publishing Product...' : 'Publish Investment Product'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 5. COMPLIANCE & KYC REVIEWS */}
        {activeSection === 'compliance' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Total Compliance Reviews</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {complianceReviews.length}
                </p>
              </div>
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Flagged or Pending Screening</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#92400E] tabular-nums">
                  {flaggedComplianceCount}
                </p>
              </div>
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Verified / Cleared Determinations</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#166534] tabular-nums">
                  {complianceReviews.filter((c) => c.status === 'verified' || c.status === 'cleared').length}
                </p>
              </div>
            </div>

            {complianceFeedback ? (
              <AlertBanner tone={complianceFeedback.tone} message={complianceFeedback.message} />
            ) : null}

            {/* Submit Compliance Determination */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Identity &amp; Suspicious Activity Control
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                  Record Compliance Determination
                </h3>
              </div>

              <form onSubmit={requestComplianceReviewConfirmation} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="comp-client" className="block text-xs font-medium text-[#334155]">
                      Client
                    </label>
                    <select
                      id="comp-client"
                      value={complianceTargetClientId}
                      onChange={(e) => setComplianceTargetClientId(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email || p.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="comp-type" className="block text-xs font-medium text-[#334155]">
                      Review Scope
                    </label>
                    <select
                      id="comp-type"
                      value={complianceReviewType}
                      onChange={(e) => setComplianceReviewType(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      <option value="KYC Verification">KYC Identity Verification</option>
                      <option value="Source of Funds Review">Source of Funds Review</option>
                      <option value="AML / Transaction Screening">AML / Transaction Screening</option>
                      <option value="Account Restriction Audit">Account Restriction Audit</option>
                      <option value="Periodic Suitability Check">Periodic Suitability Check</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="comp-status" className="block text-xs font-medium text-[#334155]">
                      Determination
                    </label>
                    <select
                      id="comp-status"
                      value={complianceStatus}
                      onChange={(e) =>
                        setComplianceStatus(
                          e.target.value as
                            | 'pending_review'
                            | 'verified'
                            | 'flagged'
                            | 'restricted'
                            | 'cleared'
                        )
                      }
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      {COMPLIANCE_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="comp-risk" className="block text-xs font-medium text-[#334155]">
                      Risk Classification
                    </label>
                    <select
                      id="comp-risk"
                      value={complianceRiskLevel}
                      onChange={(e) =>
                        setComplianceRiskLevel(e.target.value as 'low' | 'medium' | 'high')
                      }
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <label htmlFor="comp-notes" className="block text-xs font-medium text-[#334155]">
                      Compliance Officer Notes
                    </label>
                    <input
                      id="comp-notes"
                      type="text"
                      required
                      value={complianceNotes}
                      onChange={(e) => setComplianceNotes(e.target.value)}
                      placeholder="Document verification findings, exception details, or clearing rationale..."
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>
                  <div>
                    <label htmlFor="comp-sync" className="block text-xs font-medium text-[#334155]">
                      Synchronize Custody Account Status
                    </label>
                    <select
                      id="comp-sync"
                      value={complianceSyncAccountStatus}
                      onChange={(e) => setComplianceSyncAccountStatus(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      <option value="none">Do not modify account status</option>
                      {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Set Account → {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={complianceSubmitting}
                  className="bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                >
                  {complianceSubmitting ? 'Submitting...' : 'Review & Record Determination'}
                </button>
              </form>
            </div>

            {/* Compliance Audit Table */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">Compliance Screening Log</h3>
                  <p className="text-xs text-[#64748B]">
                    Recorded verification, AML, and account screening determinations.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={complianceSearch}
                      onChange={(e) => setComplianceSearch(e.target.value)}
                      placeholder="Search client or notes..."
                      className="w-56 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                    />
                  </div>
                  <select
                    value={complianceStatusFilter}
                    onChange={(e) => setComplianceStatusFilter(e.target.value)}
                    aria-label="Filter compliance determinations"
                    className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                  >
                    <option value="all">All Determinations</option>
                    {COMPLIANCE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DataTable
                rows={filteredComplianceReviews}
                columns={complianceColumns}
                rowKey={(c) => c.id}
                loading={dataLoading}
                emptyTitle="No Compliance Determinations"
                emptyDescription={
                  complianceReviewsMissing
                    ? 'Run the updated SQL setup script in Supabase SQL Editor to create public.compliance_reviews.'
                    : 'No compliance review records match the selected filters.'
                }
              />
            </div>

            {/* Client-Submitted Verification Documents Queue */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Identity &amp; Document Verification
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                  Client Submitted KYC Documents ({verificationDocuments.length})
                </h3>
              </div>

              {verificationDocuments.length === 0 ? (
                <EmptyState
                  title="No Verification Documents Submitted"
                  description="KYC documents submitted by clients from My Account appear here for Compliance review."
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                  {verificationDocuments.map((doc) => {
                    const client = profileMap.get(doc.user_id);
                    return (
                      <div key={doc.id} className="p-4 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-[#0B1320]">
                              {doc.document_type} · <span className="font-mono">{doc.document_reference}</span>
                            </p>
                            <p className="text-[#475569]">
                              Client: {client?.full_name || client?.email || doc.user_id} · Submitted{' '}
                              {formatDateTime(doc.created_at)}
                              {doc.file_name ? ` · File: ${doc.file_name}` : ''}
                            </p>
                          </div>
                          <StatusTag status={doc.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={verDocNotes[doc.id] ?? doc.reviewer_notes ?? ''}
                            onChange={(e) =>
                              setVerDocNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                            }
                            placeholder="Optional verification determination note..."
                            className="flex-1 min-w-[200px] border border-[#CBD5E1] px-3 py-1.5 text-xs text-[#0B1320]"
                          />
                          <button
                            type="button"
                            disabled={verDocBusyId === doc.id}
                            onClick={() => void handleReviewVerificationDoc(doc.id, 'verified')}
                            className="bg-[#166534] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Verify Document
                          </button>
                          <button
                            type="button"
                            disabled={verDocBusyId === doc.id}
                            onClick={() => void handleReviewVerificationDoc(doc.id, 'rejected')}
                            className="bg-[#991B1B] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 6. CLIENT SUPPORT & WEBSITE LEADS */}
        {activeSection === 'support' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 border border-[#E2E8F0] bg-white p-5 space-y-4">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">Support Conversations</h3>
                  <p className="text-xs text-[#64748B]">Select a thread to reply or update status.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={supportSearch}
                      onChange={(e) => setSupportSearch(e.target.value)}
                      placeholder="Search client or subject..."
                      className="w-full border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                    />
                  </div>
                  <select
                    value={supportStatusFilter}
                    onChange={(e) => setSupportStatusFilter(e.target.value)}
                    aria-label="Filter support threads by status"
                    className="border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0B1320]"
                  >
                    <option value="all">All ({supportThreads.length})</option>
                    {SUPPORT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredSupportThreads.length === 0 ? (
                  <p className="text-xs text-[#64748B]">No support conversations match this filter.</p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] max-h-[480px] overflow-y-auto">
                    {filteredSupportThreads.map((t) => {
                      const client = profileMap.get(t.clientUserId);
                      const active = selectedSupportKey === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setSelectedSupportKey(t.key)}
                          className={`w-full p-3.5 text-left transition-colors ${
                            active ? 'bg-[#0B1320] text-white' : 'hover:bg-[#F8FAFC] text-[#0B1320]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-medium">{t.subject}</p>
                            <span className="text-[11px] opacity-80 shrink-0">
                              {normalizeStatusLabel(t.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] opacity-75">
                            {client?.full_name || client?.email || t.clientUserId} · {t.messages.length} msgs
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-5">
                {supportFeedback ? (
                  <AlertBanner tone={supportFeedback.tone} message={supportFeedback.message} />
                ) : null}

                {!selectedSupportKey ? (
                  <EmptyState
                    title="Select a Support Thread"
                    description="Choose a client support conversation from the left panel to respond or resolve."
                  />
                ) : (
                  (() => {
                    const thread = supportThreads.find((t) => t.key === selectedSupportKey);
                    if (!thread) return null;
                    const client = profileMap.get(thread.clientUserId);

                    return (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                          <div>
                            <h3 className="font-serif text-lg text-[#0B1320]">{thread.subject}</h3>
                            <p className="mt-1 text-xs text-[#64748B]">
                              Client: {client?.full_name || client?.email || thread.clientUserId}
                            </p>
                          </div>
                          <StatusTag status={thread.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-4">
                          <span className="text-[11px] font-medium text-[#64748B] mr-1">Set Status:</span>
                          {SUPPORT_STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={supportStatusUpdating}
                              onClick={() => void handleUpdateSupportStatus(thread, opt.value)}
                              className={`border px-2.5 py-1 text-[11px] font-medium ${
                                thread.status.toLowerCase() === opt.value
                                  ? 'border-[#0B1320] bg-[#0B1320] text-white'
                                  : 'border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#0B1320]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                          {thread.messages.map((m) => {
                            const isAdm =
                              m.is_admin || String(m.sender_role || '').toLowerCase() === 'admin';
                            return (
                              <div
                                key={m.id}
                                className={`border p-4 text-xs leading-relaxed ${
                                  isAdm
                                    ? 'border-[#CBD5E1] bg-[#F8FAFC]'
                                    : 'border-[#E2E8F0] bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1.5">
                                  <span className="font-medium text-[#0B1320]">
                                    {isAdm ? 'Client Services Admin' : client?.full_name || 'Client'}
                                  </span>
                                  <span className="font-mono">{formatDateTime(m.created_at)}</span>
                                </div>
                                <p className="whitespace-pre-line text-[#1E293B]">
                                  {m.message || m.body || m.content || ''}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <form onSubmit={handleAdminReply} className="space-y-3 border-t border-[#E2E8F0] pt-4">
                          <label htmlFor="admin-reply-text" className="block text-xs font-medium text-[#0B1320]">
                            Administrative Reply
                          </label>
                          <textarea
                            id="admin-reply-text"
                            rows={3}
                            required
                            value={supportReply}
                            onChange={(e) => setSupportReply(e.target.value)}
                            placeholder="Write official Client Services response..."
                            className="w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                          />
                          <button
                            type="submit"
                            disabled={supportSubmitting}
                            className="bg-[#0B1320] px-5 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                          >
                            {supportSubmitting ? 'Sending...' : 'Send Administrative Reply'}
                          </button>
                        </form>
                      </>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Public Website Leads Table */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="border-b border-[#E2E8F0] pb-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Public Website Inquiries
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">Contact &amp; Lead Submissions</h3>
              </div>

              {leadFeedback ? <AlertBanner tone={leadFeedback.tone} message={leadFeedback.message} /> : null}

              <DataTable
                rows={leads}
                columns={leadColumns}
                rowKey={(l) => l.id || `${l.email}-${l.created_at}`}
                loading={dataLoading}
                emptyTitle="No Lead Inquiries"
                emptyDescription="Inquiries submitted from the public /contact form appear here."
              />
            </div>
          </div>
        ) : null}

        {/* 7. BROADCASTS, COMMUNITY & AUDIT LOG */}
        {activeSection === 'broadcasts' ? (
          <div className="space-y-8">
            {broadcastFeedback ? (
              <AlertBanner tone={broadcastFeedback.tone} message={broadcastFeedback.message} />
            ) : null}

            {hasAdminCapability(activeRole, 'manage_broadcasts') ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 border border-[#E2E8F0] bg-white p-6 space-y-4">
                  <h3 className="font-serif text-lg text-[#0B1320]">Publish Official Announcement</h3>
                  <form onSubmit={handlePublishBroadcast} className="space-y-4">
                    <div>
                      <label htmlFor="bc-title" className="block text-xs font-medium text-[#334155]">
                        Title
                      </label>
                      <input
                        id="bc-title"
                        type="text"
                        required
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bc-cat" className="block text-xs font-medium text-[#334155]">
                        Category
                      </label>
                      <select
                        id="bc-cat"
                        value={broadcastCategory}
                        onChange={(e) => setBroadcastCategory(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        <option value="Institutional Notice">Institutional Notice</option>
                        <option value="Market Commentary">Market Commentary</option>
                        <option value="Platform Update">Platform Update</option>
                        <option value="Client Community">Client Community</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="bc-msg" className="block text-xs font-medium text-[#334155]">
                        Announcement Text
                      </label>
                      <textarea
                        id="bc-msg"
                        rows={4}
                        required
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={broadcastSubmitting}
                      className="w-full bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                    >
                      {broadcastSubmitting ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-4">
                  <h3 className="font-serif text-lg text-[#0B1320]">
                    Published Announcements &amp; Community Comments
                  </h3>

                  {broadcasts.length === 0 ? (
                    <EmptyState
                      title="No Broadcasts Published"
                      description="Announcements published by verified administrators appear here and inside signed-in client portals."
                    />
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                      {broadcasts.map((b) => {
                        const isEditing = editingBroadcastId === b.id;
                        const postComments = communityComments.filter((c) => c.broadcast_id === b.id);

                        return (
                          <div key={b.id} className="p-4 space-y-3">
                            {isEditing ? (
                              <form onSubmit={handleSaveEditedBroadcast} className="space-y-3 bg-[#F8FAFC] p-3 border border-[#CBD5E1]">
                                <input
                                  type="text"
                                  required
                                  value={editBroadcastTitle}
                                  onChange={(e) => setEditBroadcastTitle(e.target.value)}
                                  className="w-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                                />
                                <input
                                  type="text"
                                  required
                                  value={editBroadcastCategory}
                                  onChange={(e) => setEditBroadcastCategory(e.target.value)}
                                  className="w-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                                />
                                <textarea
                                  rows={3}
                                  required
                                  value={editBroadcastMessage}
                                  onChange={(e) => setEditBroadcastMessage(e.target.value)}
                                  className="w-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={editBroadcastSaving}
                                    className="bg-[#0B1320] px-3 py-1.5 text-xs font-medium text-white"
                                  >
                                    {editBroadcastSaving ? 'Saving...' : 'Save Changes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBroadcastId(null)}
                                    className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0B1320]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-sm text-[#0B1320]">
                                      {b.title || 'Announcement'}
                                    </p>
                                    <p className="text-[11px] text-[#64748B]">
                                      {b.category || 'Notice'} · {formatDateTime(b.published_at || b.created_at)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditingBroadcast(b)}
                                      className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320]"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDeleteBroadcastConfirmation(b)}
                                      className="border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#991B1B]"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs leading-relaxed text-[#334155]">
                                  {b.message || b.body || b.content || ''}
                                </p>
                              </>
                            )}

                            {!communityCommentsMissing && postComments.length > 0 ? (
                              <div className="border-t border-[#E2E8F0] pt-2.5 space-y-2">
                                <p className="text-[11px] font-medium text-[#64748B]">
                                  Client Discussion ({postComments.length})
                                </p>
                                {postComments.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-start justify-between gap-3 bg-[#F8FAFC] px-3 py-2 text-xs"
                                  >
                                    <div>
                                      <p className="font-medium text-[#0B1320]">
                                        {c.author_name || 'Client'}{' '}
                                        <span className="font-normal text-[#64748B]">
                                          · {formatDateTime(c.created_at)}
                                        </span>
                                      </p>
                                      <p className="mt-0.5 text-[#334155]">{c.comment}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        requestDeleteCommentConfirmation(c.id, c.author_name || 'Client')
                                      }
                                      aria-label="Remove comment"
                                      className="text-[#991B1B] hover:opacity-75 shrink-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Immutable Admin Action Audit Log */}
            {hasAdminCapability(activeRole, 'view_audit_log') ? (
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                      Server-Side Governance Trail
                    </p>
                    <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                      Administrative Action Log
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search action or reference..."
                        className="w-60 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                      />
                    </div>
                  </div>
                </div>

                <DataTable
                  rows={filteredActionLogs}
                  columns={auditLogColumns}
                  rowKey={(log) => log.id}
                  loading={dataLoading}
                  emptyTitle="No Audit Entries"
                  emptyDescription="Sensitive administrative RPCs automatically log immutable entries here."
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 8. ADMIN ROLES & RBAC GOVERNANCE (SUPER_ADMIN ONLY) */}
        {activeSection === 'roles' && hasAdminCapability(activeRole, 'manage_admin_roles') ? (
          <div className="space-y-8">
            <AlertBanner
              tone="info"
              title="Backend-Enforced Role Security"
              message="Administrator privileges and role boundaries (Super Admin, Finance Admin, Investment Admin, Support Admin, Compliance Admin) are verified inside PostgreSQL SECURITY DEFINER RPCs and RLS policies via public.has_admin_role(). Client registrations always remain standard clients."
            />

            {roleFeedback ? <AlertBanner tone={roleFeedback.tone} message={roleFeedback.message} /> : null}

            {/* 5-Role Permission Matrix */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ALL_ADMIN_ROLES.map((roleKey) => {
                const def = ADMIN_ROLE_DEFINITIONS[roleKey];
                return (
                  <div key={roleKey} className="border border-[#E2E8F0] bg-white p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-medium text-[#0B1320]">{def.label}</h3>
                      <span className="font-mono text-[11px] text-[#8F6F3E]">{def.role}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#475569]">{def.description}</p>
                    <p className="pt-2 text-[11px] font-mono text-[#64748B]">
                      Sections: {def.sections.join(', ')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Assign / Update Role Form */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="font-serif text-lg text-[#0B1320]">
                  Grant or Update Administrator Role
                </h3>
                <p className="text-xs text-[#64748B]">
                  Enter the email address of an already-registered Supabase user to assign or update their administrative permission tier.
                </p>
              </div>
              <form onSubmit={requestAssignRoleConfirmation} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="role-email" className="block text-xs font-medium text-[#334155]">
                    Registered User Email
                  </label>
                  <input
                    id="role-email"
                    type="email"
                    required
                    value={roleTargetEmail}
                    onChange={(e) => setRoleTargetEmail(e.target.value)}
                    placeholder="officer@northbridgecapital.com"
                    className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                  />
                </div>
                <div>
                  <label htmlFor="role-tier" className="block text-xs font-medium text-[#334155]">
                    Permission Level
                  </label>
                  <select
                    id="role-tier"
                    value={roleTargetSelection}
                    onChange={(e) => setRoleTargetSelection(e.target.value as AdminRole)}
                    className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                  >
                    {ALL_ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLE_DEFINITIONS[r].label} ({r})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={roleSubmitting}
                    className="w-full bg-[#0B1320] px-5 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                  >
                    {roleSubmitting ? 'Updating...' : 'Review & Assign Role'}
                  </button>
                </div>
              </form>
            </div>

            {/* Verified Administrators Table */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="font-serif text-lg text-[#0B1320]">
                  Verified Administrators Registry
                </h3>
                <p className="text-xs text-[#64748B]">
                  Live list of accounts authorized in public.admin_users.
                </p>
              </div>
              <DataTable
                rows={adminUsers}
                columns={adminRoleColumns}
                rowKey={(a) => a.user_id || String(a.id || a.email || '')}
                loading={dataLoading}
                emptyTitle="No Administrator Records Visible"
                emptyDescription="Run the updated SQL setup script in Supabase SQL Editor so Super Admins can inspect and govern public.admin_users."
              />
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
