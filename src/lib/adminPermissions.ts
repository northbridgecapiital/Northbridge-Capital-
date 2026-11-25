import type { AdminRole } from '../types/database';

export type AdminSectionId =
  | 'overview'
  | 'clients'
  | 'funds'
  | 'finance'
  | 'investments'
  | 'compliance'
  | 'support'
  | 'broadcasts'
  | 'roles';

export type AdminCapability =
  | 'view_overview'
  | 'view_clients'
  | 'edit_client_profile'
  | 'edit_account_status'
  | 'manage_fund_adjustments'
  | 'manage_finance_requests'
  | 'post_ledger_adjustment'
  | 'view_reconciliation'
  | 'manage_holdings'
  | 'manage_investment_products'
  | 'manage_compliance'
  | 'manage_support'
  | 'manage_leads'
  | 'manage_broadcasts'
  | 'view_audit_log'
  | 'manage_admin_roles';

export interface AdminRoleDefinition {
  role: AdminRole;
  label: string;
  description: string;
  sections: AdminSectionId[];
  capabilities: AdminCapability[];
}

export const ADMIN_ROLE_DEFINITIONS: Record<AdminRole, AdminRoleDefinition> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    description:
      'Full authorized administrative oversight across manual client funding, financial reconciliation, investments, compliance, support, and role governance.',
    sections: [
      'overview',
      'clients',
      'funds',
      'finance',
      'investments',
      'compliance',
      'support',
      'broadcasts',
      'roles',
    ],
    capabilities: [
      'view_overview',
      'view_clients',
      'edit_client_profile',
      'edit_account_status',
      'manage_fund_adjustments',
      'manage_finance_requests',
      'post_ledger_adjustment',
      'view_reconciliation',
      'manage_holdings',
      'manage_investment_products',
      'manage_compliance',
      'manage_support',
      'manage_leads',
      'manage_broadcasts',
      'view_audit_log',
      'manage_admin_roles',
    ],
  },
  FINANCE_ADMIN: {
    role: 'FINANCE_ADMIN',
    label: 'Finance Admin',
    description:
      'Client funds management, verified deposit credits, withdrawal debits, financial request review, and balance reconciliation.',
    sections: ['overview', 'clients', 'funds', 'finance', 'broadcasts'],
    capabilities: [
      'view_overview',
      'view_clients',
      'manage_fund_adjustments',
      'manage_finance_requests',
      'post_ledger_adjustment',
      'view_reconciliation',
      'view_audit_log',
    ],
  },
  INVESTMENT_ADMIN: {
    role: 'INVESTMENT_ADMIN',
    label: 'Investment Admin',
    description:
      'Investment product administration, client investment contract management, holdings oversight, and financial request review.',
    sections: ['overview', 'clients', 'investments', 'finance'],
    capabilities: [
      'view_overview',
      'view_clients',
      'manage_holdings',
      'manage_investment_products',
      'manage_finance_requests',
    ],
  },
  SUPPORT_ADMIN: {
    role: 'SUPPORT_ADMIN',
    label: 'Support Admin',
    description:
      'Client support tickets, profile assistance, website lead handling, and official community announcements.',
    sections: ['overview', 'clients', 'support', 'broadcasts'],
    capabilities: [
      'view_overview',
      'view_clients',
      'edit_client_profile',
      'manage_support',
      'manage_leads',
      'manage_broadcasts',
    ],
  },
  COMPLIANCE_ADMIN: {
    role: 'COMPLIANCE_ADMIN',
    label: 'Compliance Admin',
    description:
      'Identity verification documents, suspicious activity screening, account suspension/restriction controls, and audit log oversight.',
    sections: ['overview', 'clients', 'compliance', 'finance', 'broadcasts'],
    capabilities: [
      'view_overview',
      'view_clients',
      'edit_account_status',
      'manage_compliance',
      'view_reconciliation',
      'view_audit_log',
    ],
  },
};

export const ALL_ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'FINANCE_ADMIN',
  'INVESTMENT_ADMIN',
  'SUPPORT_ADMIN',
  'COMPLIANCE_ADMIN',
];

export function normalizeAdminRole(rawRole: unknown): AdminRole {
  const upper = String(rawRole || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (
    upper === 'SUPER_ADMIN' ||
    upper === 'FINANCE_ADMIN' ||
    upper === 'INVESTMENT_ADMIN' ||
    upper === 'SUPPORT_ADMIN' ||
    upper === 'COMPLIANCE_ADMIN'
  ) {
    return upper;
  }
  return 'SUPER_ADMIN';
}

export function canAccessAdminSection(role: AdminRole, section: AdminSectionId): boolean {
  return ADMIN_ROLE_DEFINITIONS[role].sections.includes(section);
}

export function hasAdminCapability(role: AdminRole, capability: AdminCapability): boolean {
  return ADMIN_ROLE_DEFINITIONS[role].capabilities.includes(capability);
}
