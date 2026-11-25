import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CheckCheck,
  Download,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessageSquare,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { PortalShell, type PortalNavItem } from '../components/layout/PortalShell';
import { ClientAnalyticsCharts } from '../components/portal/ClientAnalyticsCharts';
import { ClientDocumentsCenter } from '../components/portal/ClientDocumentsCenter';
import { ClientSecurityModule } from '../components/portal/ClientSecurityModule';
import { CompanyInformationSection } from '../components/portal/CompanyInformationSection';
import {
  AlertBanner,
  EmptyState,
  ResilientImage,
  StatusTag,
  SupabaseConfigNotice,
  TableSkeleton,
} from '../components/ui/StateDisplay';
import { useAuth } from '../contexts/AuthContext';
import { INSIGHT_ARTICLES, type InsightArticle } from '../data/insights';
import { COMPANY_EMAIL } from '../data/institutionalContent';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  normalizeStatusLabel,
} from '../lib/formatters';
import {
  addPayoutDestination,
  fetchBroadcasts,
  fetchCommunityComments,
  fetchInvestmentProducts,
  fetchUserAccount,
  fetchUserClientInvestments,
  fetchUserComplianceReviews,
  fetchUserFinancialRequests,
  fetchUserHoldings,
  fetchUserLedger,
  fetchUserNotifications,
  fetchUserPayoutDestinations,
  fetchUserSupportThreads,
  fetchUserVerificationDocs,
  markAllNotificationsRead,
  markNotificationRead,
  sendClientSupportMessage,
  submitCommunityComment,
  submitFinancialRequest,
  submitVerificationDoc,
  updateClientProfile,
} from '../lib/portalApi';
import type {
  AccountRecord,
  BroadcastRecord,
  ClientInvestmentRecord,
  ClientNotificationRecord,
  CommunityCommentRecord,
  ComplianceReviewRecord,
  FinancialRequestRecord,
  HoldingRecord,
  InvestmentProductRecord,
  LedgerEntryRecord,
  PayoutDestinationRecord,
  SupportThreadMessage,
  VerificationDocumentRecord,
} from '../types/database';

const INSIGHT_CATEGORIES: Array<'All' | InsightArticle['category']> = [
  'All',
  'Fixed Income',
  'Currency & Macro',
  'Governance',
  'Liquidity',
];

const PAYMENT_METHODS = [
  {
    id: 'SWIFT Institutional Wire',
    label: 'SWIFT International Wire',
    settlementWindow: '1–3 business days after counterparty receipt',
    instructions:
      'Wire funds from a bank account matching your registered legal name. Quote your Northbridge Capital Account Number in Field 70 (Remittance Information). Treasury settlement details are issued upon request verification.',
  },
  {
    id: 'SEPA Credit Transfer',
    label: 'SEPA Credit Transfer (EUR Custody)',
    settlementWindow: '1–2 European banking days',
    instructions:
      'Initiate a Euro-denominated SEPA transfer from your verified European bank account. Include your Account Number in the End-to-End Reference field.',
  },
  {
    id: 'CHAPS / Domestic Wire',
    label: 'CHAPS / Domestic Clearing Wire',
    settlementWindow: 'Same business day subject to cutoff & compliance review',
    instructions:
      'Domestic clearing settlements must originate from an authorized personal or corporate bank account bearing the verified holder title.',
  },
];

export function ClientDashboardPage() {
  const {
    user,
    profile,
    isAdmin,
    loading: authLoading,
    isConfigured,
    refreshSessionData,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('overview');
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [clientInvestments, setClientInvestments] = useState<ClientInvestmentRecord[]>([]);
  const [investmentProducts, setInvestmentProducts] = useState<InvestmentProductRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntryRecord[]>([]);
  const [requests, setRequests] = useState<FinancialRequestRecord[]>([]);
  const [notifications, setNotifications] = useState<ClientNotificationRecord[]>([]);
  const [payoutDestinations, setPayoutDestinations] = useState<PayoutDestinationRecord[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocumentRecord[]>([]);
  const [complianceReviews, setComplianceReviews] = useState<ComplianceReviewRecord[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportThreadMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [communityComments, setCommunityComments] = useState<CommunityCommentRecord[]>([]);
  const [communityCommentsMissing, setCommunityCommentsMissing] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  // My Account profile & KYC doc verification
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const [kycDocType, setKycDocType] = useState('Passport / National ID');
  const [kycDocRef, setKycDocRef] = useState('');
  const [kycFileName, setKycFileName] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycFeedback, setKycFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // My Investments application
  const [applyProductId, setApplyProductId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [applyNotes, setApplyNotes] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  // Deposit Funds
  const [depMethod, setDepMethod] = useState(PAYMENT_METHODS[0].id);
  const [depAmount, setDepAmount] = useState('');
  const [depReference, setDepReference] = useState('');
  const [depReceiptRef, setDepReceiptRef] = useState('');
  const [depNotes, setDepNotes] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [depFeedback, setDepFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  // Withdraw Funds
  const [wdDestinationId, setWdDestinationId] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [wdNotes, setWdNotes] = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdFeedback, setWdFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const [newDestLabel, setNewDestLabel] = useState('');
  const [newDestMethod, setNewDestMethod] = useState('Bank Wire (SWIFT / IBAN)');
  const [newDestInstitution, setNewDestInstitution] = useState('');
  const [newDestEnding, setNewDestEnding] = useState('');
  const [newDestSaving, setNewDestSaving] = useState(false);

  // Transaction History filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<
    'all' | 'deposit' | 'withdrawal' | 'investment' | 'refund' | 'adjustment'
  >('all');
  const [ledgerExportNotice, setLedgerExportNotice] = useState<string | null>(null);

  // Notification Center filter
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<string>('all');

  // Market Insights reader
  const [insightCategory, setInsightCategory] = useState<'All' | InsightArticle['category']>('All');
  const [activeInsightId, setActiveInsightId] = useState<string>(INSIGHT_ARTICLES[0].id);

  // Community participation
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [communityFeedback, setCommunityFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [adminReviewSubmitting, setAdminReviewSubmitting] = useState(false);
  const [adminReviewFeedback, setAdminReviewFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  // Support Centre
  const [selectedThreadKey, setSelectedThreadKey] = useState<string>('new');
  const [newSubject, setNewSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState('Account Problem');
  const [supportAttachment, setSupportAttachment] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user && isConfigured) {
      navigate('/login', { replace: true, state: { from: '/dashboard' } });
    }
  }, [authLoading, user, isConfigured, navigate]);

  useEffect(() => {
    setProfileFullName(
      profile?.full_name ||
        (user?.user_metadata?.full_name as string | undefined) ||
        ''
    );
    setProfilePhone(profile?.phone || '');
    setProfileCountry(profile?.country || '');
  }, [profile, user]);

  const loadClientPortalData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const errors: string[] = [];

    const [
      accRes,
      holdRes,
      ciRes,
      prodRes,
      ledRes,
      reqRes,
      notifRes,
      destRes,
      verRes,
      compRes,
      supRes,
      broadRes,
      commRes,
    ] = await Promise.all([
      fetchUserAccount(user.id),
      fetchUserHoldings(user.id),
      fetchUserClientInvestments(user.id),
      fetchInvestmentProducts(),
      fetchUserLedger(user.id),
      fetchUserFinancialRequests(user.id),
      fetchUserNotifications(user.id),
      fetchUserPayoutDestinations(user.id),
      fetchUserVerificationDocs(user.id),
      fetchUserComplianceReviews(user.id),
      fetchUserSupportThreads(user.id),
      fetchBroadcasts(),
      fetchCommunityComments(),
    ]);

    if (accRes.error) errors.push(accRes.error);
    if (holdRes.error) errors.push(holdRes.error);
    if (ciRes.error) errors.push(ciRes.error);
    if (prodRes.error) errors.push(prodRes.error);
    if (ledRes.error) errors.push(ledRes.error);
    if (reqRes.error) errors.push(reqRes.error);
    if (notifRes.error) errors.push(notifRes.error);
    if (destRes.error) errors.push(destRes.error);
    if (verRes.error) errors.push(verRes.error);
    if (compRes.error) errors.push(compRes.error);
    if (supRes.error) errors.push(supRes.error);
    if (broadRes.error) errors.push(broadRes.error);

    setAccount(accRes.data);
    setHoldings(holdRes.data ?? []);
    setClientInvestments(ciRes.data ?? []);
    const prods = prodRes.data ?? [];
    setInvestmentProducts(prods);
    if (prods.length > 0) {
      setApplyProductId((prev) => prev || prods[0].id);
    }
    setLedger(ledRes.data ?? []);
    setRequests(reqRes.data ?? []);
    setNotifications(notifRes.data ?? []);
    const dests = destRes.data ?? [];
    setPayoutDestinations(dests);
    if (dests.length > 0) {
      setWdDestinationId((prev) => prev || dests[0].id);
    }
    setVerificationDocs(verRes.data ?? []);
    setComplianceReviews(compRes.data ?? []);
    setSupportMessages(supRes.data ?? []);
    const loadedBroadcasts = broadRes.data ?? [];
    setBroadcasts(loadedBroadcasts);
    if (loadedBroadcasts.length > 0) {
      setSelectedPostId((prev) => prev ?? loadedBroadcasts[0].id);
    }
    setCommunityComments(commRes.data ?? []);
    setCommunityCommentsMissing(Boolean(commRes.tableMissing));
    setLoadErrors(errors);
    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadClientPortalData();
    } else if (!authLoading) {
      setDataLoading(false);
    }
  }, [user, authLoading, loadClientPortalData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadClientPortalData();
    setRefreshing(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const clientName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Client';
  const clientEmail = profile?.email || user?.email || '';
  const accountCurrency = (account?.currency || 'USD').toUpperCase();
  const accountNumberDisplay = account?.account_number || account?.id || 'Pending Provisioning';
  const availableBalance = Number(account?.balance || 0);
  const rawAccountStatus = String(account?.status || 'active').toLowerCase();
  const isAccountSuspended = rawAccountStatus === 'suspended' || rawAccountStatus === 'closed';
  const isAccountRestricted = rawAccountStatus === 'restricted';
  const withdrawalsBlocked = isAccountSuspended || isAccountRestricted;

  const verificationStatus = useMemo(() => {
    if (profile?.verification_status) return profile.verification_status;
    if (verificationDocs.some((d) => d.status === 'verified')) return 'verified';
    if (verificationDocs.some((d) => d.status === 'pending_review')) return 'pending_review';
    return 'unverified';
  }, [profile, verificationDocs]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const clientNav: PortalNavItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Portfolio & Accounts' },
      { id: 'account', label: 'My Account', icon: Landmark, group: 'Portfolio & Accounts' },
      { id: 'investments', label: 'My Investments', icon: Briefcase, group: 'Portfolio & Accounts' },
      { id: 'deposits', label: 'Deposit Funds', icon: ArrowDownToLine, group: 'Portfolio & Accounts' },
      { id: 'withdrawals', label: 'Withdraw Funds', icon: ArrowUpFromLine, group: 'Portfolio & Accounts' },
      { id: 'transactions', label: 'Transaction History', icon: ListOrdered, group: 'Portfolio & Accounts' },
      {
        id: 'notifications',
        label: 'Notification Center',
        icon: Bell,
        group: 'Briefings & Records',
        badgeCount: unreadNotifCount,
      },
      { id: 'documents', label: 'Documents & Statements', icon: FileCheck2, group: 'Briefings & Records' },
      { id: 'company', label: 'Company Information', icon: Building2, group: 'Briefings & Records' },
      { id: 'insights', label: 'Market Insights', icon: BookOpen, group: 'Briefings & Records' },
      { id: 'community', label: 'Community', icon: Users, group: 'Briefings & Records' },
      { id: 'support', label: 'Customer Support', icon: MessageSquare, group: 'Support & Security' },
      { id: 'security', label: 'Account Security', icon: Shield, group: 'Support & Security' },
      { id: 'logout', label: 'Log Out', icon: LogOut, isSignOut: true },
    ],
    [unreadNotifCount]
  );

  const dashboardMetrics = useMemo(() => {
    const activeInvestments = clientInvestments.filter((ci) => ci.status === 'active');
    const completedInvestments = clientInvestments.filter(
      (ci) => ci.status === 'completed' || ci.status === 'matured'
    );
    const totalContractInvested = clientInvestments
      .filter((ci) => ci.status !== 'cancelled')
      .reduce((acc, ci) => acc + Number(ci.principal_amount || 0), 0);
    const totalHoldingsValue = holdings.reduce(
      (acc, h) => acc + Number(h.reported_value ?? h.market_value ?? h.value ?? 0),
      0
    );
    const totalInvested = totalContractInvested + totalHoldingsValue;
    const verifiedEarnings = clientInvestments.reduce(
      (acc, ci) => acc + Number(ci.recorded_earnings || 0),
      0
    );

    let pendingDeposits = 0;
    let pendingWithdrawals = 0;
    requests.forEach((r) => {
      const st = String(r.status || 'pending').toLowerCase();
      if (st.includes('pend') || st === 'under_review' || st === 'approved') {
        const rt = String(r.request_type || r.type || '').toLowerCase();
        const amt = Number(r.amount || 0);
        if (rt.includes('withdraw')) pendingWithdrawals += amt;
        else if (rt.includes('deposit')) pendingDeposits += amt;
      }
    });

    return {
      totalInvested,
      verifiedEarnings,
      pendingDeposits,
      pendingWithdrawals,
      activeCount: activeInvestments.length + holdings.length,
      completedCount: completedInvestments.length,
    };
  }, [clientInvestments, holdings, requests]);

  const depositRequests = useMemo(
    () =>
      requests.filter((r) =>
        String(r.request_type || r.type || '').toLowerCase().includes('deposit')
      ),
    [requests]
  );

  const withdrawalRequests = useMemo(
    () =>
      requests.filter((r) =>
        String(r.request_type || r.type || '').toLowerCase().includes('withdraw')
      ),
    [requests]
  );

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return ledger.filter((entry) => {
      const cat = String(entry.category || '').toLowerCase();
      const typeVal = String(entry.entry_type || entry.type || '').toLowerCase();
      const descVal = String(entry.description || entry.memo || '').toLowerCase();

      if (ledgerCategoryFilter === 'deposit' && !cat.includes('deposit') && !descVal.includes('deposit')) {
        return false;
      }
      if (ledgerCategoryFilter === 'withdrawal' && !cat.includes('withdraw') && !descVal.includes('withdraw')) {
        return false;
      }
      if (ledgerCategoryFilter === 'investment' && !cat.includes('invest') && !descVal.includes('invest')) {
        return false;
      }
      if (ledgerCategoryFilter === 'refund' && !cat.includes('refund') && !cat.includes('reversal')) {
        return false;
      }
      if (
        ledgerCategoryFilter === 'adjustment' &&
        !cat.includes('correction') &&
        !cat.includes('promotional') &&
        !entry.is_manual_adjustment
      ) {
        return false;
      }

      if (!q) return true;
      const hay = [
        entry.transaction_uid,
        entry.reference,
        entry.category,
        entry.description,
        entry.memo,
        typeVal,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, ledgerSearch, ledgerCategoryFilter]);

  const filteredNotifications = useMemo(() => {
    if (notifCategoryFilter === 'all') return notifications;
    return notifications.filter((n) => {
      const hay = `${n.category || ''} ${n.title || ''} ${n.message || ''}`.toLowerCase();
      if (notifCategoryFilter === 'funding') {
        return (
          hay.includes('funding') ||
          hay.includes('deposit') ||
          hay.includes('credit') ||
          hay.includes('refund') ||
          hay.includes('adjustment') ||
          hay.includes('correction') ||
          hay.includes('promotional')
        );
      }
      if (notifCategoryFilter === 'withdrawal') {
        return hay.includes('withdraw') || hay.includes('debit') || hay.includes('payout');
      }
      if (notifCategoryFilter === 'investment') {
        return (
          hay.includes('invest') ||
          hay.includes('mandate') ||
          hay.includes('contract') ||
          hay.includes('portfolio') ||
          hay.includes('holding')
        );
      }
      if (notifCategoryFilter === 'verification') {
        return (
          hay.includes('verif') ||
          hay.includes('kyc') ||
          hay.includes('compliance') ||
          hay.includes('document') ||
          hay.includes('identity')
        );
      }
      if (notifCategoryFilter === 'security') {
        return (
          hay.includes('secur') ||
          hay.includes('password') ||
          hay.includes('restrict') ||
          hay.includes('suspend') ||
          hay.includes('flag')
        );
      }
      return String(n.category || '').toLowerCase() === notifCategoryFilter;
    });
  }, [notifications, notifCategoryFilter]);

  const supportThreads = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        threadId: string | null;
        subject: string;
        category: string;
        status: string;
        messages: SupportThreadMessage[];
        lastUpdated: string;
      }
    >();

    supportMessages.forEach((msg) => {
      const key = msg.thread_id || msg.subject || msg.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          threadId: msg.thread_id || null,
          subject: msg.subject || 'Client Services Inquiry',
          category: msg.category || 'General Inquiry',
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

  const filteredInsights = useMemo(
    () =>
      insightCategory === 'All'
        ? INSIGHT_ARTICLES
        : INSIGHT_ARTICLES.filter((a) => a.category === insightCategory),
    [insightCategory]
  );

  const activeInsight =
    filteredInsights.find((a) => a.id === activeInsightId) ??
    filteredInsights[0] ??
    INSIGHT_ARTICLES[0];

  const commentsByBroadcastId = useMemo(() => {
    const map = new Map<string, CommunityCommentRecord[]>();
    communityComments.forEach((c) => {
      const list = map.get(c.broadcast_id) ?? [];
      list.push(c);
      map.set(c.broadcast_id, list);
    });
    return map;
  }, [communityComments]);

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      const aliasMap: Record<string, string> = {
        requests: 'deposits',
        announcements: 'notifications',
        profile: 'account',
        portfolio: 'investments',
      };
      const resolved = aliasMap[sectionId] || sectionId;
      const validIds = new Set(clientNav.filter((n) => !n.isSignOut).map((n) => n.id));
      setActiveSection(validIds.has(resolved) ? resolved : 'overview');
    },
    [clientNav]
  );

  function openSupportWithPreset(subjectText: string, categoryText = 'General Inquiry') {
    setSelectedThreadKey('new');
    setNewSubject(subjectText);
    setSupportCategory(categoryText);
    setActiveSection('support');
  }

  // Handlers
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileFeedback(null);
    setProfileSaving(true);
    const res = await updateClientProfile({
      userId: user.id,
      fullName: profileFullName,
      phone: profilePhone,
      country: profileCountry,
    });
    setProfileSaving(false);
    if (res.error) {
      setProfileFeedback({ tone: 'error', message: res.error });
      return;
    }
    await refreshSessionData();
    setProfileFeedback({ tone: 'success', message: 'Your permitted profile details have been updated.' });
  }

  async function handleSubmitKycDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setKycFeedback(null);
    setKycSubmitting(true);
    const res = await submitVerificationDoc({
      userId: user.id,
      documentType: kycDocType,
      documentReference: kycDocRef,
      fileName: kycFileName || undefined,
    });
    setKycSubmitting(false);
    if (res.error) {
      setKycFeedback({
        tone: res.tableMissing ? 'warning' : 'error',
        message: res.error,
      });
      return;
    }
    setKycDocRef('');
    setKycFileName('');
    setKycFeedback({
      tone: 'success',
      message: 'Verification document submitted to Compliance Administration for review.',
    });
    await loadClientPortalData();
  }

  async function handleSubmitInvestmentApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setApplyFeedback(null);

    if (withdrawalsBlocked) {
      setApplyFeedback({
        tone: 'error',
        message: `Your custody account is currently ${normalizeStatusLabel(rawAccountStatus)}. New investment applications are disabled.`,
      });
      return;
    }

    const selectedProd = investmentProducts.find((p) => p.id === applyProductId);
    const amt = Number(applyAmount);
    if (!selectedProd) {
      setApplyFeedback({ tone: 'error', message: 'Select an investment product.' });
      return;
    }
    const minAllocation = Number(selectedProd.min_amount || 0);
    if (!Number.isFinite(amt) || amt < minAllocation) {
      setApplyFeedback({
        tone: 'error',
        message: `Minimum allocation for ${selectedProd.name} is ${formatCurrency(minAllocation, selectedProd.currency)}.`,
      });
      return;
    }

    setApplySubmitting(true);
    const res = await submitFinancialRequest({
      userId: user.id,
      accountId: account?.id ?? null,
      requestType: `Investment Application: ${selectedProd.name}`,
      amount: amt,
      currency: selectedProd.currency,
      notes: applyNotes.trim() || `Client application for ${selectedProd.name} (${selectedProd.duration_months} months)`,
      paymentReference: `PROD-${selectedProd.id.slice(0, 8).toUpperCase()}`,
    });
    setApplySubmitting(false);

    if (res.error) {
      setApplyFeedback({ tone: 'error', message: res.error });
      return;
    }
    setApplyAmount('');
    setApplyNotes('');
    setApplyFeedback({
      tone: 'success',
      message:
        'Investment application submitted to Investment Administration. Positions become active only after review, execution, and settlement.',
    });
    await loadClientPortalData();
  }

  async function handleSubmitDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setDepFeedback(null);

    if (isAccountSuspended) {
      setDepFeedback({
        tone: 'error',
        message: 'Deposit requests cannot be submitted while this custody account is suspended or closed.',
      });
      return;
    }

    const amt = Number(depAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setDepFeedback({ tone: 'error', message: 'Enter a valid positive deposit amount.' });
      return;
    }
    if (!depReference.trim()) {
      setDepFeedback({
        tone: 'error',
        message: 'Enter your bank wire / settlement payment reference so finance officers can verify receipt.',
      });
      return;
    }

    setDepSubmitting(true);
    const res = await submitFinancialRequest({
      userId: user.id,
      accountId: account?.id ?? null,
      requestType: 'Deposit Request',
      amount: amt,
      currency: accountCurrency,
      paymentMethod: depMethod,
      paymentReference: depReference.trim(),
      receiptReference: depReceiptRef.trim() || undefined,
      notes:
        depNotes.trim() ||
        `Deposit notice via ${depMethod} (Ref: ${depReference.trim()})`,
    });
    setDepSubmitting(false);

    if (res.error) {
      setDepFeedback({ tone: 'error', message: res.error });
      return;
    }

    setDepAmount('');
    setDepReference('');
    setDepReceiptRef('');
    setDepNotes('');
    setDepFeedback({
      tone: 'success',
      message:
        'Deposit notice submitted for treasury verification. Available balance updates only after settled funds are confirmed and posted by Finance Admin.',
    });
    await loadClientPortalData();
  }

  async function handleAddPayoutDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setWdFeedback(null);
    if (!newDestLabel.trim() || !newDestInstitution.trim() || !newDestEnding.trim()) {
      setWdFeedback({
        tone: 'error',
        message: 'Complete destination nickname, bank/institution name, and last 4–6 digits.',
      });
      return;
    }
    setNewDestSaving(true);
    const res = await addPayoutDestination({
      userId: user.id,
      label: newDestLabel,
      methodType: newDestMethod,
      institutionName: newDestInstitution,
      accountEnding: newDestEnding,
      currency: accountCurrency,
    });
    setNewDestSaving(false);
    if (res.error) {
      setWdFeedback({ tone: 'error', message: res.error });
      return;
    }
    setNewDestLabel('');
    setNewDestInstitution('');
    setNewDestEnding('');
    if (res.data) setWdDestinationId(res.data.id);
    await loadClientPortalData();
  }

  async function handleSubmitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setWdFeedback(null);

    if (withdrawalsBlocked) {
      setWdFeedback({
        tone: 'error',
        message: `Withdrawals are disabled while account status is "${normalizeStatusLabel(rawAccountStatus)}". Contact Compliance or Support.`,
      });
      return;
    }

    const amt = Number(wdAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setWdFeedback({ tone: 'error', message: 'Enter a valid positive withdrawal amount.' });
      return;
    }

    if (amt > availableBalance) {
      setWdFeedback({
        tone: 'error',
        message: `Withdrawal blocked: requested amount (${formatCurrency(amt, accountCurrency)}) exceeds your available balance (${formatCurrency(availableBalance, accountCurrency)}).`,
      });
      return;
    }

    const chosenDest = payoutDestinations.find((d) => d.id === wdDestinationId);
    const destinationLabel = chosenDest
      ? `${chosenDest.label} · ${chosenDest.institution_name} (****${chosenDest.account_ending})`
      : 'Verified Primary Bank Account on File';

    setWdSubmitting(true);
    const res = await submitFinancialRequest({
      userId: user.id,
      accountId: account?.id ?? null,
      requestType: 'Withdrawal Request',
      amount: amt,
      currency: accountCurrency,
      payoutDestination: destinationLabel,
      feeAmount: 0,
      notes: wdNotes.trim() || `Withdrawal request to ${destinationLabel}`,
    });
    setWdSubmitting(false);

    if (res.error) {
      setWdFeedback({ tone: 'error', message: res.error });
      return;
    }

    setWdAmount('');
    setWdNotes('');
    setWdFeedback({
      tone: 'success',
      message:
        'Withdrawal request recorded for Finance Administration authorization. Funds remain unaffected until approved and settled.',
    });
    await loadClientPortalData();
  }

  async function handleSendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSupportFeedback(null);

    const activeThread = supportThreads.find((t) => t.key === selectedThreadKey);
    const subjectToUse = activeThread
      ? activeThread.subject
      : newSubject.trim() || 'Client Services Inquiry';
    const threadIdToUse = activeThread
      ? activeThread.threadId || activeThread.messages[0]?.id
      : null;

    if (!supportMessage.trim()) {
      setSupportFeedback({ tone: 'error', message: 'Please enter your message.' });
      return;
    }

    setSupportSubmitting(true);
    const res = await sendClientSupportMessage({
      userId: user.id,
      subject: subjectToUse,
      category: supportCategory,
      attachmentName: supportAttachment.trim() || undefined,
      message: supportMessage,
      threadId: threadIdToUse,
    });
    setSupportSubmitting(false);

    if (res.error) {
      setSupportFeedback({ tone: 'error', message: res.error });
      return;
    }

    setSupportFeedback({
      tone: 'success',
      message:
        'Your ticket has been delivered directly to Northbridge Capital Administration.',
    });
    setSupportMessage('');
    setSupportAttachment('');
    if (!activeThread) setNewSubject('');
    await loadClientPortalData();
  }

  async function handleSubmitCommunityComment(e: React.FormEvent, broadcastId: string) {
    e.preventDefault();
    if (!user) return;
    setCommunityFeedback(null);
    setCommentSubmitting(true);
    const res = await submitCommunityComment({
      broadcastId,
      userId: user.id,
      authorName: clientName,
      comment: commentText,
    });
    setCommentSubmitting(false);
    if (res.error) {
      setCommunityFeedback({
        tone: res.tableMissing ? 'warning' : 'error',
        message: res.error,
      });
      return;
    }
    setCommentText('');
    setCommunityFeedback({ tone: 'success', message: 'Your community response has been posted.' });
    await loadClientPortalData();
  }

  async function handleCommunityReviewToAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setAdminReviewFeedback(null);
    if (adminReviewNote.trim().length < 5) {
      setAdminReviewFeedback({
        tone: 'error',
        message: 'Please enter at least 5 characters for your feedback or review note.',
      });
      return;
    }
    setAdminReviewSubmitting(true);
    const selectedPost = broadcasts.find((b) => b.id === selectedPostId);
    const res = await sendClientSupportMessage({
      userId: user.id,
      subject: selectedPost?.title
        ? `Community / Site Review: ${selectedPost.title}`
        : 'Site & Community Review Feedback',
      category: 'General Inquiry',
      message: adminReviewNote,
    });
    setAdminReviewSubmitting(false);
    if (res.error) {
      setAdminReviewFeedback({ tone: 'error', message: res.error });
      return;
    }
    setAdminReviewNote('');
    setAdminReviewFeedback({
      tone: 'success',
      message: 'Your note has been sent directly to Administration.',
    });
    await loadClientPortalData();
  }

  async function handleMarkNotifRead(id: string) {
    await markNotificationRead(id);
    await loadClientPortalData();
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    await loadClientPortalData();
  }

  function exportFilteredLedgerCsv() {
    setLedgerExportNotice(null);
    if (filteredLedger.length === 0) {
      setLedgerExportNotice('No ledger records match the active filter.');
      return;
    }
    const headers = [
      'Transaction ID',
      'Date',
      'Category',
      'Description',
      'Reference',
      'Type',
      'Amount',
      'Currency',
      'Resulting Balance',
      'Status',
    ];
    const rows = filteredLedger.map((entry) => [
      entry.transaction_uid || entry.id,
      entry.posted_at || entry.created_at || '',
      entry.category || 'Custody Entry',
      `"${String(entry.description || entry.memo || '').replace(/"/g, '""')}"`,
      entry.reference || '',
      entry.entry_type || entry.type || '',
      String(entry.amount ?? ''),
      entry.currency || accountCurrency,
      entry.balance_after !== null && entry.balance_after !== undefined ? String(entry.balance_after) : '',
      entry.status || 'Recorded',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `northbridge-ledger-${accountNumberDisplay}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLedgerExportNotice(`Exported ${filteredLedger.length} ledger entry(ies) to CSV.`);
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8 flex items-center justify-center">
        <div className="max-w-xl w-full space-y-4">
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

  const sectionTitle = clientNav.find((n) => n.id === activeSection)?.label || 'Overview';
  const activePaymentMethod =
    PAYMENT_METHODS.find((m) => m.id === depMethod) ?? PAYMENT_METHODS[0];

  return (
    <PortalShell
      title={sectionTitle}
      subtitle={`Client Custody Portal · ${clientName} · ${accountNumberDisplay}`}
      navItems={clientNav}
      activeSection={activeSection}
      onSelectSection={handleSelectSection}
      onSignOut={handleSignOut}
      collapsible
    >
      <div className="space-y-6">
        {loadErrors.length > 0 ? (
          <AlertBanner
            tone="warning"
            title="Notice Retrieving Certain Records"
            message={loadErrors[0]}
          />
        ) : null}

        {isAccountSuspended ? (
          <AlertBanner
            tone="error"
            title={`Account Custody ${normalizeStatusLabel(rawAccountStatus)}`}
            message="Your account is currently suspended or closed. Deposits, withdrawals, and new investment applications are disabled. Contact Client Support for compliance assistance."
          />
        ) : isAccountRestricted ? (
          <AlertBanner
            tone="warning"
            title="Account Under Compliance Restriction"
            message="Withdrawals and new investment applications are temporarily restricted pending Compliance review. Deposits and statement access remain available."
          />
        ) : null}

        {/* Top Context Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">
              Private Client Portal · {sectionTitle}
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#0B1320]">
              Welcome, {clientName}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('deposits')}
              className="bg-[#0B1320] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#18263D] whitespace-nowrap"
            >
              Deposit Funds
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('withdrawals')}
              className="border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] whitespace-nowrap"
            >
              Withdraw Funds
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320] whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* =========================================
            A. CLIENT DASHBOARD HOMEPAGE (OVERVIEW)
           ========================================= */}
        {activeSection === 'overview' ? (
          <div className="space-y-6">
            {/* Account Verification & Identity Strip */}
            <div className="border border-[#E2E8F0] bg-white p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div>
                  <p className="text-[#64748B]">Unique Account ID</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-[#0B1320]">
                    {accountNumberDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Account Status</p>
                  <div className="mt-0.5">
                    <StatusTag status={account?.status || 'pending_review'} />
                  </div>
                </div>
                <div>
                  <p className="text-[#64748B]">Verification / KYC Status</p>
                  <div className="mt-0.5">
                    <StatusTag status={verificationStatus} />
                  </div>
                </div>
                <div>
                  <p className="text-[#64748B]">Base Currency</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-[#0B1320]">
                    {accountCurrency}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('notifications')}
                className="border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
              >
                {unreadNotifCount > 0
                  ? `${unreadNotifCount} Unread Notification(s)`
                  : 'Notification Center'}
              </button>
            </div>

            {/* 8 Key Financial KPIs (strictly from Supabase) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#475569]">Available Account Balance</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : formatCurrency(availableBalance, accountCurrency)}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">Verified settled cash balance</p>
              </div>

              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#475569]">Total Invested Capital</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {dataLoading ? '—' : formatCurrency(dashboardMetrics.totalInvested, accountCurrency)}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {dashboardMetrics.activeCount} active · {dashboardMetrics.completedCount} completed
                </p>
              </div>

              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#475569]">Verified Recorded Earnings</p>
                <p className="mt-2 font-mono text-2xl font-medium text-[#166534] tabular-nums">
                  {dataLoading ? '—' : formatCurrency(dashboardMetrics.verifiedEarnings, accountCurrency)}
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">Actual ledger-posted returns only</p>
              </div>

              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#475569]">Pending Deposits &amp; Withdrawals</p>
                <p className="mt-2 font-mono text-sm font-medium text-[#0B1320] tabular-nums">
                  +{formatCurrency(dashboardMetrics.pendingDeposits, accountCurrency)} dep
                </p>
                <p className="mt-1 font-mono text-xs text-[#92400E] tabular-nums">
                  −{formatCurrency(dashboardMetrics.pendingWithdrawals, accountCurrency)} w/d awaiting review
                </p>
              </div>
            </div>

            {/* Interactive Financial Charts */}
            {!dataLoading ? (
              <ClientAnalyticsCharts
                ledger={ledger}
                holdings={holdings}
                clientInvestments={clientInvestments}
                currency={accountCurrency}
              />
            ) : (
              <div className="border border-[#E2E8F0] bg-white p-6">
                <TableSkeleton rows={4} cols={4} />
              </div>
            )}

            {/* Recent Transactions & Latest Notifications */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 border border-[#E2E8F0] bg-white p-6">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                  <h3 className="font-serif text-lg text-[#0B1320]">Recent Transactions</h3>
                  <button
                    type="button"
                    onClick={() => setActiveSection('transactions')}
                    className="text-xs font-medium text-[#8F6F3E] hover:text-[#0B1320]"
                  >
                    Full Transaction History
                  </button>
                </div>
                {ledger.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#64748B]">
                    No transactions recorded on your ledger yet.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                          <th className="py-2.5 pr-4 font-medium">Date</th>
                          <th className="py-2.5 pr-4 font-medium">Category &amp; Description</th>
                          <th className="py-2.5 pr-4 font-medium text-right">Amount</th>
                          <th className="py-2.5 font-medium text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {ledger.slice(0, 6).map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 pr-4 font-mono text-[#475569] tabular-nums whitespace-nowrap">
                              {formatDate(item.posted_at || item.created_at)}
                            </td>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-[#0B1320]">
                                {item.category || item.description || item.memo || 'Ledger Entry'}
                              </p>
                              <p className="font-mono text-[11px] text-[#64748B]">
                                {item.transaction_uid || item.reference || item.id.slice(0, 10)}
                              </p>
                            </td>
                            <td className="py-3 pr-4 text-right font-mono font-medium text-[#0B1320] tabular-nums whitespace-nowrap">
                              {formatCurrency(item.amount, item.currency || accountCurrency)}
                            </td>
                            <td className="py-3 text-right font-mono text-[#475569] tabular-nums whitespace-nowrap">
                              {item.balance_after !== null && item.balance_after !== undefined
                                ? formatCurrency(item.balance_after, item.currency || accountCurrency)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 border border-[#E2E8F0] bg-white p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                    <h3 className="font-serif text-lg text-[#0B1320]">Alerts &amp; Updates</h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection('notifications')}
                      className="text-xs font-medium text-[#8F6F3E] hover:text-[#0B1320]"
                    >
                      View All
                    </button>
                  </div>
                  {notifications.length === 0 && broadcasts.length === 0 ? (
                    <p className="py-6 text-xs text-[#64748B]">
                      No notifications or administrative announcements recorded yet.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-[#E2E8F0]">
                      {notifications.slice(0, 3).map((n) => (
                        <div key={n.id} className="py-2.5 text-xs">
                          <p className="font-medium text-[#0B1320]">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[#475569]">{n.message}</p>
                          <p className="mt-1 font-mono text-[11px] text-[#64748B]">
                            {formatDateTime(n.created_at)}
                          </p>
                        </div>
                      ))}
                      {notifications.length === 0 &&
                        broadcasts.slice(0, 2).map((b) => (
                          <div key={b.id} className="py-2.5 text-xs">
                            <p className="text-[11px] text-[#8F6F3E]">{b.category || 'Notice'}</p>
                            <p className="font-medium text-[#0B1320]">{b.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[#475569]">
                              {b.message || b.body || b.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('documents')}
                  className="w-full border border-[#CBD5E1] bg-white py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                >
                  Statements &amp; Documents
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* =========================================
            B. MY ACCOUNT & VERIFICATION
           ========================================= */}
        {activeSection === 'account' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-5">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                    Client Identity &amp; Profile
                  </p>
                  <h3 className="mt-0.5 font-serif text-xl text-[#0B1320]">
                    Account Holder Details &amp; Permitted Edits
                  </h3>
                </div>

                {profileFeedback ? (
                  <AlertBanner
                    tone={profileFeedback.tone}
                    message={profileFeedback.message}
                    onDismiss={() => setProfileFeedback(null)}
                  />
                ) : null}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="acc-name" className="block text-xs font-medium text-[#334155]">
                        Full Legal Name
                      </label>
                      <input
                        id="acc-name"
                        type="text"
                        required
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-email" className="block text-xs font-medium text-[#334155]">
                        Registered Email (Verified)
                      </label>
                      <input
                        id="acc-email"
                        type="email"
                        readOnly
                        value={clientEmail}
                        className="mt-1 w-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#475569]"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-phone" className="block text-xs font-medium text-[#334155]">
                        Phone Number
                      </label>
                      <input
                        id="acc-phone"
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+44 20 7946 0000"
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-country" className="block text-xs font-medium text-[#334155]">
                        Country of Residence
                      </label>
                      <input
                        id="acc-country"
                        type="text"
                        value={profileCountry}
                        onChange={(e) => setProfileCountry(e.target.value)}
                        placeholder="United Kingdom"
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        openSupportWithPreset('Account Detail Change / Verification Request', 'Verification / KYC')
                      }
                      className="text-xs font-medium text-[#8F6F3E] underline underline-offset-4 hover:text-[#0B1320]"
                    >
                      Request Protected Field Update
                    </button>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="bg-[#0B1320] px-5 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
                    >
                      {profileSaving ? 'Saving...' : 'Save Permitted Details'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 border border-[#E2E8F0] bg-white p-6 space-y-4">
                <h3 className="font-serif text-lg text-[#0B1320] border-b border-[#E2E8F0] pb-3">
                  Custody &amp; Account Metadata
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Account Number</dt>
                    <dd className="font-mono font-medium text-[#0B1320]">{accountNumberDisplay}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Registration Date</dt>
                    <dd className="font-mono text-[#0B1320] tabular-nums">
                      {formatDate(profile?.created_at || user.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Account Status</dt>
                    <dd>
                      <StatusTag status={account?.status || 'pending_review'} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Verification Status</dt>
                    <dd>
                      <StatusTag status={verificationStatus} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Security Status</dt>
                    <dd className="text-[#0B1320] font-medium">
                      {user.email_confirmed_at ? 'Verified Session' : 'Email Pending'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Recorded Balance</dt>
                    <dd className="font-mono font-semibold text-[#0B1320] tabular-nums">
                      {formatCurrency(availableBalance, accountCurrency)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Identity & Verification Submission */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
              <div className="border-b border-[#E2E8F0] pb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Compliance &amp; KYC Verification
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                  Submit Identity / Address Verification Record
                </h3>
                <p className="mt-1 text-xs text-[#475569]">
                  Submitted document references route directly to Compliance Administration for review.
                </p>
              </div>

              {kycFeedback ? (
                <AlertBanner
                  tone={kycFeedback.tone}
                  message={kycFeedback.message}
                  onDismiss={() => setKycFeedback(null)}
                />
              ) : null}

              <form onSubmit={handleSubmitKycDoc} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-[#334155]">Document Type</label>
                  <select
                    value={kycDocType}
                    onChange={(e) => setKycDocType(e.target.value)}
                    className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                  >
                    <option value="Passport / National ID">Passport / National ID</option>
                    <option value="Proof of Residence / Utility Bill">Proof of Residence / Utility Bill</option>
                    <option value="Source of Funds Declaration">Source of Funds Declaration</option>
                    <option value="Corporate Resolution / Certificate">Corporate Resolution / Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155]">Document Number / Reference *</label>
                  <input
                    type="text"
                    required
                    value={kycDocRef}
                    onChange={(e) => setKycDocRef(e.target.value)}
                    placeholder="e.g. DOC-ID-98412"
                    className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155]">Supporting Filename (Optional)</label>
                  <input
                    type="text"
                    value={kycFileName}
                    onChange={(e) => setKycFileName(e.target.value)}
                    placeholder="e.g. passport-scan.pdf"
                    className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={kycSubmitting}
                    className="w-full bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
                  >
                    {kycSubmitting ? 'Submitting...' : 'Submit for KYC Review'}
                  </button>
                </div>
              </form>

              {verificationDocs.length > 0 ? (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                  {verificationDocs.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-4 p-3.5 text-xs">
                      <div>
                        <p className="font-medium text-[#0B1320]">
                          {doc.document_type} · <span className="font-mono">{doc.document_reference}</span>
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          Submitted {formatDateTime(doc.created_at)}
                          {doc.reviewer_notes ? ` · Compliance Note: ${doc.reviewer_notes}` : ''}
                        </p>
                      </div>
                      <StatusTag status={doc.status} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* =========================================
            C. MY INVESTMENTS
           ========================================= */}
        {activeSection === 'investments' ? (
          <div className="space-y-6">
            <AlertBanner
              tone="info"
              title="Contractual Terms & Risk Transparency"
              message="Recorded earnings represent verified returns actually posted by administration. Contractual mandate terms outlined in product catalogs are subject to market, issuer, and liquidity risk and do not constitute guaranteed performance."
            />

            {/* Active & Historical Investment Contracts */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">
                    My Investment Contracts &amp; Positions
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Authoritative mandates and recorded custody holdings allocated to your account.
                  </p>
                </div>
                <span className="font-mono text-xs font-medium text-[#0B1320] tabular-nums">
                  Total Allocated: {formatCurrency(dashboardMetrics.totalInvested, accountCurrency)}
                </span>
              </div>

              {clientInvestments.length === 0 && holdings.length === 0 ? (
                <EmptyState
                  title="No Active or Historical Investments"
                  description="Apply for an available institutional investment product below or contact Investment Administration for bespoke mandates."
                />
              ) : (
                <div className="space-y-5">
                  {clientInvestments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                            <th className="py-2.5 pr-4 font-medium">Product &amp; Reference</th>
                            <th className="py-2.5 pr-4 font-medium">Start / Maturity</th>
                            <th className="py-2.5 pr-4 font-medium">Contractual Terms</th>
                            <th className="py-2.5 pr-4 font-medium text-right">Principal</th>
                            <th className="py-2.5 pr-4 font-medium text-right">Recorded Earnings</th>
                            <th className="py-2.5 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {clientInvestments.map((ci) => (
                            <tr key={ci.id}>
                              <td className="py-3.5 pr-4">
                                <p className="font-medium text-[#0B1320]">{ci.product_name}</p>
                                <p className="font-mono text-[11px] text-[#64748B]">{ci.reference_number}</p>
                              </td>
                              <td className="py-3.5 pr-4 font-mono text-[#475569] tabular-nums">
                                <p>{formatDate(ci.start_date)}</p>
                                <p className="text-[11px]">Mat: {formatDate(ci.maturity_date)}</p>
                              </td>
                              <td className="py-3.5 pr-4 max-w-xs text-[#475569]">
                                {ci.contractual_terms || 'Executed mandate schedule'}
                              </td>
                              <td className="py-3.5 pr-4 text-right font-mono font-medium text-[#0B1320] tabular-nums">
                                {formatCurrency(ci.principal_amount, ci.currency)}
                              </td>
                              <td className="py-3.5 pr-4 text-right font-mono font-medium text-[#166534] tabular-nums">
                                {formatCurrency(ci.recorded_earnings, ci.currency)}
                              </td>
                              <td className="py-3.5 text-right">
                                <StatusTag status={ci.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {holdings.length > 0 ? (
                    <div className="border-t border-[#E2E8F0] pt-4">
                      <h4 className="font-serif text-base text-[#0B1320] mb-3">Recorded Custody Holdings</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                              <th className="py-2 pr-4 font-medium">Asset</th>
                              <th className="py-2 pr-4 font-medium">Category</th>
                              <th className="py-2 pr-4 font-medium text-right">Units</th>
                              <th className="py-2 font-medium text-right">Recorded Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {holdings.map((h) => (
                              <tr key={h.id}>
                                <td className="py-2.5 pr-4 font-medium text-[#0B1320]">
                                  {h.asset_name || h.name}
                                </td>
                                <td className="py-2.5 pr-4 text-[#475569]">
                                  {h.asset_category || h.category || 'Portfolio'}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                                  {formatNumber(h.quantity)}
                                </td>
                                <td className="py-2.5 text-right font-mono font-medium text-[#0B1320] tabular-nums">
                                  {formatCurrency(
                                    h.reported_value ?? h.market_value ?? h.value,
                                    h.currency || accountCurrency
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Available Institutional Investment Products + Application Form */}
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
              <div className="border-b border-[#E2E8F0] pb-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                  Mandate Subscription
                </p>
                <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                  Available Investment Products &amp; Application
                </h3>
              </div>

              {investmentProducts.length === 0 ? (
                <EmptyState
                  title="No Open Investment Products Published"
                  description="Available institutional mandates published by Investment Administration appear here. Contact Support for bespoke mandate inquiries."
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {investmentProducts.map((prod) => {
                      const selected = applyProductId === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setApplyProductId(prod.id);
                            setApplyFeedback(null);
                          }}
                          className={`border p-4 text-left transition-colors ${
                            selected
                              ? 'border-[#0B1320] bg-[#0B1320] text-white'
                              : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0B1320] hover:border-[#0B1320]'
                          }`}
                        >
                          <p className={`text-[11px] font-medium ${selected ? 'text-[#C6A46E]' : 'text-[#8F6F3E]'}`}>
                            {prod.category} · {prod.risk_classification} Risk
                          </p>
                          <p className="mt-1 font-serif text-base">{prod.name}</p>
                          <p className="mt-2 font-mono text-xs opacity-90">
                            Min Allocation: {formatCurrency(prod.min_amount, prod.currency)} · {prod.duration_months} mo
                          </p>
                          <p className="mt-2 text-xs opacity-80">{prod.contractual_terms}</p>
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSubmitInvestmentApplication} className="lg:col-span-5 border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
                    <h4 className="font-serif text-base text-[#0B1320]">Apply for Selected Product</h4>
                    {applyFeedback ? (
                      <AlertBanner tone={applyFeedback.tone} message={applyFeedback.message} />
                    ) : null}
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Selected Product</label>
                      <select
                        value={applyProductId}
                        onChange={(e) => setApplyProductId(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        {investmentProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Min {formatCurrency(p.min_amount, p.currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Intended Principal Allocation</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={applyAmount}
                        onChange={(e) => setApplyAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Suitability / Allocation Notes</label>
                      <textarea
                        rows={2}
                        value={applyNotes}
                        onChange={(e) => setApplyNotes(e.target.value)}
                        placeholder="Funding source or mandate preference..."
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={applySubmitting || withdrawalsBlocked}
                      className="w-full bg-[#0B1320] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                    >
                      {applySubmitting ? 'Submitting Application...' : 'Submit Investment Application'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* =========================================
            D. DEPOSIT FUNDS
           ========================================= */}
        {activeSection === 'deposits' ? (
          <div className="space-y-6">
            <AlertBanner
              tone="info"
              title="Treasury Settlement & Balance Policy"
              message="Submitting a deposit notification records your transfer instructions for Finance Administration verification. Your available balance only updates once actual cleared funds settle and an administrator posts the verified credit to your ledger."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 border border-[#E2E8F0] bg-white p-6 space-y-5">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h3 className="font-serif text-lg text-[#0B1320]">Submit Deposit Notice</h3>
                </div>

                {depFeedback ? (
                  <AlertBanner
                    tone={depFeedback.tone}
                    message={depFeedback.message}
                    onDismiss={() => setDepFeedback(null)}
                  />
                ) : null}

                <form onSubmit={handleSubmitDeposit} className="space-y-4">
                  <div>
                    <label htmlFor="dep-method" className="block text-xs font-medium text-[#334155]">
                      Payment Method
                    </label>
                    <select
                      id="dep-method"
                      value={depMethod}
                      onChange={(e) => setDepMethod(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs space-y-1.5">
                    <p className="font-semibold text-[#0B1320]">
                      Instructions · {activePaymentMethod.label}
                    </p>
                    <p className="text-[#475569] leading-relaxed">{activePaymentMethod.instructions}</p>
                    <p className="font-mono text-[11px] text-[#8F6F3E]">
                      Mandatory Wire Memo: {accountNumberDisplay}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Settlement Window: {activePaymentMethod.settlementWindow}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="dep-amount" className="block text-xs font-medium text-[#334155]">
                      Deposit Amount ({accountCurrency}) *
                    </label>
                    <input
                      id="dep-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={depAmount}
                      onChange={(e) => setDepAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>

                  <div>
                    <label htmlFor="dep-ref" className="block text-xs font-medium text-[#334155]">
                      Bank Transfer / Wire Reference *
                    </label>
                    <input
                      id="dep-ref"
                      type="text"
                      required
                      value={depReference}
                      onChange={(e) => setDepReference(e.target.value)}
                      placeholder="e.g. SWIFT-TRN-2026992"
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>

                  <div>
                    <label htmlFor="dep-receipt" className="block text-xs font-medium text-[#334155]">
                      Wire Confirmation Receipt Reference (Optional)
                    </label>
                    <input
                      id="dep-receipt"
                      type="text"
                      value={depReceiptRef}
                      onChange={(e) => setDepReceiptRef(e.target.value)}
                      placeholder="e.g. mt103-wire-confirmation.pdf"
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>

                  <div>
                    <label htmlFor="dep-notes" className="block text-xs font-medium text-[#334155]">
                      Originating Bank / Remittance Notes
                    </label>
                    <textarea
                      id="dep-notes"
                      rows={2}
                      value={depNotes}
                      onChange={(e) => setDepNotes(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={depSubmitting || isAccountSuspended}
                    className="w-full bg-[#0B1320] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                  >
                    {depSubmitting ? 'Recording Deposit Notice...' : 'Submit Deposit for Verification'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h3 className="font-serif text-lg text-[#0B1320]">Deposit Tracking &amp; Status</h3>
                </div>
                {depositRequests.length === 0 ? (
                  <EmptyState
                    title="No Deposit Notices Submitted"
                    description="Submitted deposit requests and their treasury verification statuses appear here."
                  />
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {depositRequests.map((req) => (
                      <div key={req.id} className="py-3.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-[#0B1320]">
                            {req.payment_method || req.request_type} ·{' '}
                            <span className="font-mono">{formatCurrency(req.amount, req.currency || accountCurrency)}</span>
                          </p>
                          <StatusTag status={req.status || 'pending'} />
                        </div>
                        <p className="font-mono text-[11px] text-[#64748B]">
                          Submitted {formatDateTime(req.created_at)} · Ref: {req.payment_reference || '—'}
                        </p>
                        {req.admin_notes ? (
                          <p className="text-[11px] text-[#8F6F3E]">Admin Determination: {req.admin_notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* =========================================
            E. WITHDRAW FUNDS
           ========================================= */}
        {activeSection === 'withdrawals' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Available Balance for Withdrawal</p>
                <p className="mt-1 font-mono text-2xl font-medium text-[#0B1320] tabular-nums">
                  {formatCurrency(availableBalance, accountCurrency)}
                </p>
              </div>
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Custody Withdrawal Fee</p>
                <p className="mt-1 font-mono text-lg font-medium text-[#0B1320] tabular-nums">
                  {formatCurrency(0, accountCurrency)}
                </p>
                <p className="text-[11px] text-[#64748B]">Standard institutional clearing</p>
              </div>
              <div className="border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs text-[#64748B]">Account Eligibility</p>
                <div className="mt-1.5">
                  <StatusTag status={account?.status || 'active'} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-6">
                <form onSubmit={handleSubmitWithdrawal} className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                  <div className="border-b border-[#E2E8F0] pb-3">
                    <h3 className="font-serif text-lg text-[#0B1320]">Request Custody Withdrawal</h3>
                    <p className="text-xs text-[#64748B]">
                      Requests exceeding available balance or submitted under restricted accounts are automatically blocked.
                    </p>
                  </div>

                  {wdFeedback ? (
                    <AlertBanner
                      tone={wdFeedback.tone}
                      message={wdFeedback.message}
                      onDismiss={() => setWdFeedback(null)}
                    />
                  ) : null}

                  <div>
                    <label className="block text-xs font-medium text-[#334155]">Payout Destination</label>
                    <select
                      value={wdDestinationId}
                      onChange={(e) => setWdDestinationId(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    >
                      {payoutDestinations.length === 0 ? (
                        <option value="">Primary Verified Bank Account on File</option>
                      ) : (
                        payoutDestinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label} · {d.institution_name} (****{d.account_ending})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="wd-amount" className="block text-xs font-medium text-[#334155]">
                      Withdrawal Amount ({accountCurrency}) *
                    </label>
                    <input
                      id="wd-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.max(0, availableBalance)}
                      required
                      value={wdAmount}
                      onChange={(e) => setWdAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      Maximum eligible: {formatCurrency(availableBalance, accountCurrency)}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="wd-notes" className="block text-xs font-medium text-[#334155]">
                      Settlement Instructions / Notes
                    </label>
                    <textarea
                      id="wd-notes"
                      rows={2}
                      value={wdNotes}
                      onChange={(e) => setWdNotes(e.target.value)}
                      className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={wdSubmitting || withdrawalsBlocked}
                    className="w-full bg-[#0B1320] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                  >
                    {wdSubmitting ? 'Submitting Withdrawal...' : 'Submit Withdrawal Request'}
                  </button>
                </form>

                {/* Save Payout Destination */}
                <form onSubmit={handleAddPayoutDestination} className="border border-[#E2E8F0] bg-white p-6 space-y-3">
                  <h4 className="font-serif text-base text-[#0B1320]">Add Payout Bank Destination</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      value={newDestLabel}
                      onChange={(e) => setNewDestLabel(e.target.value)}
                      placeholder="Account Nickname *"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      required
                      value={newDestMethod}
                      onChange={(e) => setNewDestMethod(e.target.value)}
                      placeholder="Wire / SEPA / IBAN"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      required
                      value={newDestInstitution}
                      onChange={(e) => setNewDestInstitution(e.target.value)}
                      placeholder="Bank / Institution Name *"
                      className="border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                    />
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={newDestEnding}
                      onChange={(e) => setNewDestEnding(e.target.value)}
                      placeholder="Last 4 digits *"
                      className="border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={newDestSaving}
                    className="border border-[#0B1320] bg-white px-4 py-2 text-xs font-medium text-[#0B1320] hover:bg-[#0B1320] hover:text-white"
                  >
                    {newDestSaving ? 'Saving...' : 'Save Payout Destination'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h3 className="font-serif text-lg text-[#0B1320]">Withdrawal History &amp; Adjudication</h3>
                </div>
                {withdrawalRequests.length === 0 ? (
                  <EmptyState
                    title="No Withdrawal Requests Submitted"
                    description="Submitted withdrawal requests, processing statuses, and rejection explanations appear here."
                  />
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {withdrawalRequests.map((req) => (
                      <div key={req.id} className="py-3.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-[#0B1320]">
                            {req.payout_destination || 'Withdrawal Request'} ·{' '}
                            <span className="font-mono">{formatCurrency(req.amount, req.currency || accountCurrency)}</span>
                          </p>
                          <StatusTag status={req.status || 'pending'} />
                        </div>
                        <p className="font-mono text-[11px] text-[#64748B]">
                          Submitted {formatDateTime(req.created_at)}
                        </p>
                        {req.admin_notes ? (
                          <p className="border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-[11px] text-[#334155]">
                            Administrator Determination: {req.admin_notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* =========================================
            F. TRANSACTION HISTORY
           ========================================= */}
        {activeSection === 'transactions' ? (
          <div className="border border-[#E2E8F0] bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="font-serif text-lg text-[#0B1320]">Immutable Transaction Ledger</h3>
                <p className="text-xs text-[#64748B]">
                  Complete audit trail with Transaction IDs, before/after balances, and verified references.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#0B1320]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={exportFilteredLedgerCsv}
                  className="inline-flex items-center gap-1.5 bg-[#0B1320] px-3.5 py-2 text-xs font-medium text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Statement (.CSV)</span>
                </button>
              </div>
            </div>

            {ledgerExportNotice ? <AlertBanner tone="info" message={ledgerExportNotice} /> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'All'],
                    ['deposit', 'Deposits'],
                    ['withdrawal', 'Withdrawals'],
                    ['investment', 'Investments'],
                    ['refund', 'Refunds & Reversals'],
                    ['adjustment', 'Account Adjustments'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLedgerCategoryFilter(k)}
                    className={`border px-3 py-1.5 text-xs font-medium ${
                      ledgerCategoryFilter === k
                        ? 'border-[#0B1320] bg-[#0B1320] text-white'
                        : 'border-[#CBD5E1] bg-white text-[#0B1320]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ID, reference, memo..."
                  className="w-64 border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#0B1320]"
                />
              </div>
            </div>

            {filteredLedger.length === 0 ? (
              <EmptyState
                title="No Ledger Transactions Found"
                description="No verified account ledger records match your current category or search filter."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="py-2.5 pr-4 font-medium">Transaction ID &amp; Date</th>
                      <th className="py-2.5 pr-4 font-medium">Category &amp; Description</th>
                      <th className="py-2.5 pr-4 font-medium">Payment Ref</th>
                      <th className="py-2.5 pr-4 font-medium text-right">Amount</th>
                      <th className="py-2.5 pr-4 font-medium text-right">Resulting Balance</th>
                      <th className="py-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 pr-4">
                          <p className="font-mono font-medium text-[#0B1320]">
                            {entry.transaction_uid || entry.id.slice(0, 12).toUpperCase()}
                          </p>
                          <p className="font-mono text-[11px] text-[#64748B] tabular-nums">
                            {formatDateTime(entry.posted_at || entry.created_at)}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-[#0B1320]">
                            {entry.category || normalizeStatusLabel(entry.entry_type || entry.type || 'Entry')}
                          </p>
                          <p className="text-[#475569]">{entry.description || entry.memo || '—'}</p>
                        </td>
                        <td className="py-3 pr-4 font-mono text-[#475569]">
                          {entry.reference || '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono font-medium text-[#0B1320] tabular-nums">
                          {formatCurrency(entry.amount, entry.currency || accountCurrency)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[#475569] tabular-nums">
                          {entry.balance_after !== null && entry.balance_after !== undefined
                            ? formatCurrency(entry.balance_after, entry.currency || accountCurrency)
                            : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <StatusTag status={entry.status || entry.entry_type || 'recorded'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* =========================================
            G. NOTIFICATION CENTER
           ========================================= */}
        {activeSection === 'notifications' ? (
          <div className="space-y-6">
            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="font-serif text-lg text-[#0B1320]">
                    Client Notifications ({notifications.length})
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Automated alerts for manual adjustments, deposit/withdrawal approvals, investments, and verification decisions.
                  </p>
                </div>
                {unreadNotifCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark All Read</span>
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'All'],
                    ['funding', 'Funding'],
                    ['withdrawal', 'Withdrawals'],
                    ['investment', 'Investments'],
                    ['verification', 'Verification'],
                    ['security', 'Security'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNotifCategoryFilter(k)}
                    className={`border px-3 py-1.5 text-xs font-medium ${
                      notifCategoryFilter === k
                        ? 'border-[#0B1320] bg-[#0B1320] text-white'
                        : 'border-[#CBD5E1] bg-white text-[#0B1320]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredNotifications.length === 0 ? (
                <EmptyState
                  title="No Notifications"
                  description="Account activity alerts and transaction confirmations appear here automatically."
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                  {filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 flex flex-wrap items-start justify-between gap-4 text-xs ${
                        n.is_read ? 'bg-white' : 'bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="space-y-1 max-w-2xl">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                          {n.category} · {formatDateTime(n.created_at)}
                        </p>
                        <p className="font-medium text-sm text-[#0B1320]">{n.title}</p>
                        <p className="text-[#475569] leading-relaxed">{n.message}</p>
                      </div>
                      {!n.is_read ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkNotifRead(n.id)}
                          className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
                        >
                          Mark Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#64748B]">Read</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
              <h3 className="font-serif text-lg text-[#0B1320] border-b border-[#E2E8F0] pb-3">
                Official Company Announcements
              </h3>
              {broadcasts.length === 0 ? (
                <p className="text-xs text-[#64748B]">No company-wide announcements published.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {broadcasts.map((item) => (
                    <article key={item.id} className="py-4">
                      <p className="text-[11px] text-[#8F6F3E]">
                        {item.category || 'Institutional Notice'} · {formatDateTime(item.published_at || item.created_at)}
                      </p>
                      <h4 className="mt-1 font-serif text-base text-[#0B1320]">{item.title}</h4>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs text-[#475569] leading-relaxed">
                        {item.message || item.body || item.content || ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* =========================================
            J. DOCUMENTS & STATEMENTS
           ========================================= */}
        {activeSection === 'documents' ? (
          <ClientDocumentsCenter
            clientName={clientName}
            clientEmail={clientEmail}
            account={account}
            ledger={ledger}
            requests={requests}
            clientInvestments={clientInvestments}
            verificationDocs={verificationDocs}
            complianceReviews={complianceReviews}
          />
        ) : null}

        {/* =========================================
            PRESERVED: COMPANY INFORMATION
           ========================================= */}
        {activeSection === 'company' ? (
          <CompanyInformationSection
            broadcasts={broadcasts}
            dataLoading={dataLoading}
            clientName={clientName}
            clientEmail={clientEmail}
            userId={user.id}
            onNavigateSection={handleSelectSection}
            onMessageSentToAdmin={loadClientPortalData}
          />
        ) : null}

        {/* =========================================
            PRESERVED: MARKET INSIGHTS
           ========================================= */}
        {activeSection === 'insights' ? (
          <div className="space-y-6">
            <div className="border border-[#E2E8F0] bg-white p-6">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Research &amp; Briefings
              </p>
              <h3 className="mt-1 font-serif text-2xl text-[#0B1320]">Market Insights</h3>
              <p className="mt-2 max-w-3xl text-sm text-[#475569]">
                Institutional commentary on fixed income, multi-currency liquidity, and governance frameworks. Published strictly for informational purposes; nothing herein constitutes investment advice or a forecast of future returns.
              </p>
              <div className="mt-5 flex flex-wrap gap-2" role="tablist">
                {INSIGHT_CATEGORIES.map((category) => {
                  const active = insightCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setInsightCategory(category);
                        const next =
                          category === 'All'
                            ? INSIGHT_ARTICLES
                            : INSIGHT_ARTICLES.filter((a) => a.category === category);
                        if (next.length > 0 && !next.some((a) => a.id === activeInsightId)) {
                          setActiveInsightId(next[0].id);
                        }
                      }}
                      className={`px-4 py-2 text-xs font-medium whitespace-nowrap ${
                        active
                          ? 'bg-[#0B1320] text-white'
                          : 'border border-[#CBD5E1] bg-white text-[#334155] hover:border-[#0B1320]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0] self-start">
                {filteredInsights.map((article) => {
                  const isSelected = activeInsight.id === article.id;
                  return (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setActiveInsightId(article.id)}
                      className={`w-full text-left p-5 transition-colors ${
                        isSelected ? 'bg-[#F8FAFC]' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <p className="text-xs text-[#8F6F3E]">
                        {article.category} · {article.publishedAt} · {article.readTime}
                      </p>
                      <p className="mt-1.5 font-serif text-lg text-[#0B1320]">{article.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#475569] line-clamp-2">
                        {article.summary}
                      </p>
                    </button>
                  );
                })}
              </div>

              <article className="lg:col-span-7 border border-[#E2E8F0] bg-white">
                <div className="h-48 overflow-hidden border-b border-[#E2E8F0]">
                  <ResilientImage
                    src="/src/assets/images/insights_financial_facade_1795357573004.jpg"
                    alt="European financial district architecture"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-xs text-[#8F6F3E]">
                    {activeInsight.category} · {activeInsight.publishedAt} · {activeInsight.readTime}
                  </p>
                  <h4 className="mt-2 font-serif text-2xl text-[#0B1320]">{activeInsight.title}</h4>
                  <p className="mt-1 text-xs text-[#64748B]">{activeInsight.author}</p>
                  <div className="mt-5 space-y-4 border-t border-[#E2E8F0] pt-5 text-sm leading-relaxed text-[#334155]">
                    {activeInsight.body.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        ) : null}

        {/* =========================================
            PRESERVED: COMMUNITY
           ========================================= */}
        {activeSection === 'community' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6 space-y-5">
              <div className="border-b border-[#E2E8F0] pb-4">
                <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">
                  Admin-Moderated Client Community
                </p>
                <h3 className="mt-1 font-serif text-xl text-[#0B1320]">Published Community Posts</h3>
              </div>
              {broadcasts.length === 0 ? (
                <EmptyState
                  title="No Community Posts Published"
                  description="Community briefings published by verified administrators will appear here."
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {broadcasts.map((post) => {
                    const isSelected = selectedPostId === post.id;
                    const postComments = commentsByBroadcastId.get(post.id) ?? [];
                    return (
                      <article
                        key={post.id}
                        className={`py-4 ${isSelected ? 'bg-[#F8FAFC] px-4 -mx-4' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-[#8F6F3E]">
                            {post.category || 'Community Briefing'} · {formatDateTime(post.published_at || post.created_at)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedPostId(post.id)}
                            className="text-xs font-medium text-[#0B1320] underline"
                          >
                            {isSelected ? 'Selected' : `Discuss (${postComments.length})`}
                          </button>
                        </div>
                        <h4 className="mt-1 font-serif text-lg text-[#0B1320]">{post.title}</h4>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs text-[#475569] leading-relaxed">
                          {post.message || post.body || post.content}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                <h3 className="font-serif text-lg text-[#0B1320]">Client Discussion</h3>
                {communityCommentsMissing ? (
                  <AlertBanner
                    tone="info"
                    title="Community Discussion Setup Required"
                    message="Comments require public.community_comments in Supabase."
                  />
                ) : selectedPostId ? (
                  <>
                    {communityFeedback ? (
                      <AlertBanner tone={communityFeedback.tone} message={communityFeedback.message} />
                    ) : null}
                    <div className="max-h-56 space-y-2.5 overflow-y-auto">
                      {(commentsByBroadcastId.get(selectedPostId) ?? []).map((c) => (
                        <div key={c.id} className="border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                          <div className="flex justify-between text-[11px] text-[#64748B]">
                            <span className="font-medium text-[#0B1320]">{c.author_name || 'Verified Client'}</span>
                            <span>{formatDateTime(c.created_at)}</span>
                          </div>
                          <p className="mt-1 text-[#334155]">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => handleSubmitCommunityComment(e, selectedPostId)} className="space-y-2.5">
                      <textarea
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                      />
                      <button
                        type="submit"
                        disabled={commentSubmitting}
                        className="w-full bg-[#0B1320] py-2 text-xs font-medium text-white"
                      >
                        {commentSubmitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </form>
                  </>
                ) : null}
              </div>

              <div className="border border-[#E2E8F0] bg-white p-6 space-y-3">
                <h3 className="font-serif text-base text-[#0B1320]">Send Review to Administration</h3>
                {adminReviewFeedback ? (
                  <AlertBanner tone={adminReviewFeedback.tone} message={adminReviewFeedback.message} />
                ) : null}
                <form onSubmit={handleCommunityReviewToAdmin} className="space-y-3">
                  <textarea
                    rows={3}
                    value={adminReviewNote}
                    onChange={(e) => setAdminReviewNote(e.target.value)}
                    placeholder="Direct note to Administration..."
                    className="w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                  />
                  <button
                    type="submit"
                    disabled={adminReviewSubmitting}
                    className="w-full border border-[#0B1320] py-2 text-xs font-medium text-[#0B1320] hover:bg-[#0B1320] hover:text-white"
                  >
                    Send Review to Admin Control
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {/* =========================================
            H. CUSTOMER SUPPORT
           ========================================= */}
        {activeSection === 'support' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 border border-[#E2E8F0] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="font-serif text-lg text-[#0B1320]">Support Tickets</h3>
                <button
                  type="button"
                  onClick={() => setSelectedThreadKey('new')}
                  className="bg-[#0B1320] px-3 py-1.5 text-xs font-medium text-white"
                >
                  New Ticket
                </button>
              </div>

              {supportThreads.length === 0 ? (
                <p className="text-xs text-[#64748B]">No prior support conversations.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {supportThreads.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedThreadKey(t.key)}
                      className={`w-full p-3 text-left text-xs ${
                        selectedThreadKey === t.key ? 'bg-[#0B1320] text-white' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{t.subject}</p>
                        <span className="text-[11px] opacity-80">{normalizeStatusLabel(t.status)}</span>
                      </div>
                      <p className="mt-1 text-[11px] opacity-75">
                        {t.category} · {formatDate(t.lastUpdated)}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-[#E2E8F0] pt-4 text-xs space-y-1">
                <p className="font-medium text-[#0B1320]">Direct Desk Email</p>
                <p className="font-mono text-[#475569]">{COMPANY_EMAIL}</p>
              </div>
            </div>

            <div className="lg:col-span-8 border border-[#E2E8F0] bg-white p-6 space-y-5">
              {selectedThreadKey === 'new' ? (
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h3 className="font-serif text-xl text-[#0B1320]">Open New Support Ticket</h3>
                  <p className="text-xs text-[#64748B]">
                    Select a category and attach any supporting document reference for faster routing.
                  </p>
                </div>
              ) : (
                (() => {
                  const activeThread = supportThreads.find((t) => t.key === selectedThreadKey);
                  if (!activeThread) return null;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                        <div>
                          <h3 className="font-serif text-lg text-[#0B1320]">{activeThread.subject}</h3>
                          <p className="text-xs text-[#64748B]">{activeThread.category}</p>
                        </div>
                        <StatusTag status={activeThread.status} />
                      </div>
                      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                        {activeThread.messages.map((m) => {
                          const isAdm =
                            m.is_admin === true || (m.sender_role || '').toLowerCase() === 'admin';
                          return (
                            <div
                              key={m.id}
                              className={`border p-4 text-xs ${
                                isAdm ? 'border-[#CBD5E1] bg-[#F8FAFC]' : 'border-[#E2E8F0] bg-white'
                              }`}
                            >
                              <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                                <span className="font-medium text-[#0B1320]">
                                  {isAdm ? 'Northbridge Client Services' : clientName}
                                </span>
                                <span>{formatDateTime(m.created_at)}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-[#1E293B]">
                                {m.message || m.body || m.content}
                              </p>
                              {m.attachment_name ? (
                                <p className="mt-1.5 font-mono text-[11px] text-[#8F6F3E]">
                                  Attached Reference: {m.attachment_name}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              <form onSubmit={handleSendSupport} className="space-y-3 border-t border-[#E2E8F0] pt-4">
                {supportFeedback ? (
                  <AlertBanner
                    tone={supportFeedback.tone}
                    message={supportFeedback.message}
                    onDismiss={() => setSupportFeedback(null)}
                  />
                ) : null}

                {selectedThreadKey === 'new' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Category</label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        <option value="Account Problem">Account Problem</option>
                        <option value="Investment Question">Investment Question</option>
                        <option value="Transaction Issue">Transaction Issue</option>
                        <option value="Verification / KYC">Verification / KYC</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155]">Subject *</label>
                      <input
                        type="text"
                        required
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Summarize your inquiry..."
                        className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-medium text-[#334155]">
                    Supporting Document / Receipt Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={supportAttachment}
                    onChange={(e) => setSupportAttachment(e.target.value)}
                    placeholder="e.g. wire-receipt-2026.pdf"
                    className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155]">Message *</label>
                  <textarea
                    rows={3}
                    required
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Write your message to Client Services..."
                    className="mt-1 w-full border border-[#CBD5E1] px-3 py-2 text-xs text-[#0B1320]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="bg-[#0B1320] px-5 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
                  >
                    {supportSubmitting ? 'Sending...' : 'Send Ticket Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* =========================================
            I. ACCOUNT SECURITY
           ========================================= */}
        {activeSection === 'security' ? (
          <ClientSecurityModule
            user={user}
            clientEmail={clientEmail}
            isAdmin={isAdmin}
            onOpenSupport={() =>
              openSupportWithPreset('Account Security Review Inquiry', 'Account Problem')
            }
            onSignOut={handleSignOut}
          />
        ) : null}
      </div>
    </PortalShell>
  );
}
