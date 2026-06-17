export interface Goals {
  id: number;
  new_leads_per_day: number;
  outreach_per_day: number;
  followups_per_day: number;
  meetings_per_week: number;
}

export interface DailyKPI {
  date: string;
  new_leads: number;
  outreach_count: number;
  followup_count: number;
  meetings_count: number;
  replies_received: number;
  leads_converted: number;
  score: number;
  leadsScore: number;
  outreachScore: number;
  followupScore: number;
  goals: Goals;
}

export interface WeeklyKPI {
  weekStart: string;
  weekEnd: string;
  days: DailyKPI[];
  totals: { new_leads: number; outreach_count: number; followup_count: number; meetings_count: number; replies_received: number; leads_converted: number };
  score: number;
  goals: Goals;
  rates: { replyRate: number; meetingRate: number; conversionRate: number };
}

export interface MonthlyKPI {
  month: string;
  weeks: { days: DailyKPI[] }[];
  totals: { new_leads: number; outreach_count: number; followup_count: number; meetings_count: number; replies_received: number; leads_converted: number };
  score: number;
  goals: Goals;
  rates: { replyRate: number; meetingRate: number; conversionRate: number };
}

export interface Streaks { prospecting: StreakInfo; followup: StreakInfo; kpiTarget: StreakInfo }
export interface StreakInfo { current: number; longest: number; todayCompleted: boolean }

export interface Recommendation {
  focusArea: string;
  messages: string[];
  priorities: PriorityTask[];
  gaps: KPIGap[];
  hotLeads: number;
  overdue: number;
}
export interface PriorityTask { task: string; reason: string; priority: 'high' | 'medium' | 'low' }
export interface KPIGap { metric: string; current: number; target: number; gap: number }
export interface DailyReview { date: string; new_leads: number; outreach_count: number; followup_count: number; meetings_count: number; replies_received: number; leads_converted: number; goals: Goals; wentWell: string[]; needsAttention: string[]; recommendedActions: string[]; score: number }
export interface WeeklyReport { weekStart: string; weekEnd: string; dailyData: any[]; totals: any; goals: Goals; rates: any; trends: any }
export interface PipelineStage { pipeline_stage: string; count: number }

export interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  contact_type?: string;
  status: string;
  source?: string;
  pipeline_stage?: string;
  notes?: string;
  archive_status: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  interactions?: Interaction[];
  days_since_last_contact?: number;
  relationship_health?: string;
  interaction_count?: number;
  followup_count?: number;
  open_followups?: number;
}

export interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  status: string;
  lead_score: number;
  archive_status: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact[];
  tags?: Tag[];
  interactions?: Interaction[];
  contact_count?: number;
  open_followups?: number;
  last_activity?: string;
}

export interface Interaction {
  id: number;
  lead_id?: number;
  company_id?: number;
  type: string;
  outcome?: string;
  notes?: string;
  created_at: string;
  lead_name?: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface ActivityLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

export interface ValidationResult {
  errors: { row: number; errors: string[] }[];
  duplicates: { row: number; field: string; value: string; existingId: number; existingName: string }[];
  validCount: number;
}
