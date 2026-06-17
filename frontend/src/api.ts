import type { Goals, DailyKPI, WeeklyKPI, MonthlyKPI, Streaks, Recommendation, DailyReview, WeeklyReport, PipelineStage, Contact, Company, Tag, ActivityLog, ImportResult, ValidationResult } from './types';

const BASE = '/api';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  return res.json();
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function del<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getGoals: () => get<Goals>('/goals'),
  updateGoals: (g: Partial<Goals>) => put<Goals>('/goals', g),
  getDailyKPI: (date: string) => get<DailyKPI>(`/kpi/daily/${date}`),
  getWeeklyKPI: (date: string) => get<WeeklyKPI>(`/kpi/weekly/${date}`),
  getMonthlyKPI: (date: string) => get<MonthlyKPI>(`/kpi/monthly/${date}`),
  logKPI: (type: string) => post('/kpi/log', { type }),
  getStreaks: () => get<Streaks>('/streaks'),
  getRecommendations: () => get<Recommendation>('/recommendations'),
  getDailyReview: (date: string) => get<DailyReview>(`/reports/daily/${date}`),
  getWeeklyReport: (date: string) => get<WeeklyReport>(`/reports/weekly/${date}`),
  getPipeline: () => get<PipelineStage[]>('/leads/pipeline'),

  // Contacts
  getContacts: (params?: string) => get<Contact[]>(`/contacts${params || ''}`),
  getContact: (id: number) => get<Contact>(`/contacts/${id}`),
  createContact: (c: Partial<Contact>) => post<Contact>('/contacts', c),
  updateContact: (id: number, c: Partial<Contact>) => put<Contact>(`/contacts/${id}`, c),
  deleteContact: (id: number) => del(`/contacts/${id}`),
  archiveContact: (id: number, action: string) => post(`/contacts/${id}/archive`, { action }),
  bulkDeleteContacts: (ids: number[]) => post('/contacts/bulk/delete', { ids }),
  bulkArchiveContacts: (ids: number[]) => post('/contacts/bulk/archive', { ids }),
  bulkRestoreContacts: (ids: number[]) => post('/contacts/bulk/restore', { ids }),
  bulkChangeContactType: (ids: number[], contact_type: string) => post('/contacts/bulk/change-type', { ids, contact_type }),
  bulkAddContactTag: (ids: number[], tag_id: number) => post('/contacts/bulk/add-tags', { ids, tag_id }),
  checkContactDuplicates: (email?: string, phone?: string, name?: string) =>
    get<{ duplicates: Contact[] }>(`/contacts/duplicates/check?${new URLSearchParams({ ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(name ? { name } : {}) })}`),

  // Companies
  getCompanies: (params?: string) => get<Company[]>(`/companies${params || ''}`),
  getCompany: (id: number) => get<Company>(`/companies/${id}`),
  createCompany: (c: Partial<Company>) => post<Company>('/companies', c),
  updateCompany: (id: number, c: Partial<Company>) => put<Company>(`/companies/${id}`, c),
  deleteCompany: (id: number) => del(`/companies/${id}`),
  archiveCompany: (id: number, action: string) => post(`/companies/${id}/archive`, { action }),
  bulkDeleteCompanies: (ids: number[]) => post('/companies/bulk/delete', { ids }),
  bulkArchiveCompanies: (ids: number[]) => post('/companies/bulk/archive', { ids }),
  bulkRestoreCompanies: (ids: number[]) => post('/companies/bulk/restore', { ids }),
  bulkChangeCompanyStatus: (ids: number[], status: string) => post('/companies/bulk/change-status', { ids, status }),
  bulkAddCompanyTag: (ids: number[], tag_id: number) => post('/companies/bulk/add-tags', { ids, tag_id }),
  checkCompanyDuplicates: (name?: string, website?: string) =>
    get<{ duplicates: Company[] }>(`/companies/duplicates/check?${new URLSearchParams({ ...(name ? { name } : {}), ...(website ? { website } : {}) })}`),

  // Tags
  getTags: () => get<Tag[]>('/tags'),
  createTag: (t: Partial<Tag>) => post<Tag>('/tags', t),
  deleteTag: (id: number) => del(`/tags/${id}`),

  // Activity
  getActivity: () => get<ActivityLog[]>('/activity'),
  getEntityActivity: (type: string, id: number) => get<ActivityLog[]>(`/activity/${type}/${id}`),

  // Import/Export
  importContacts: (records: any[]) => post<ImportResult>('/import/contacts', { records }),
  importCompanies: (records: any[]) => post<ImportResult>('/import/companies', { records }),
  validateImport: (records: any[], entity: string) => post<ValidationResult>('/import/validate', { records, entity }),
  exportData: (entity: string, ids?: number[], format?: string) => post<any>('/export/export', { entity, ids, format }),

  // Research
  searchLeads: (query: string, maxResults?: number) => post<any>('/research/leads', { query, maxResults }),

  // Merge
  mergeContacts: (primary_id: number, secondary_id: number, opts?: any) => post<Contact>('/merge/contacts', { primary_id, secondary_id, ...opts }),
  mergeCompanies: (primary_id: number, secondary_id: number, opts?: any) => post<Company>('/merge/companies', { primary_id, secondary_id, ...opts }),
};
