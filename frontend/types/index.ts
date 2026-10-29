// ============================================================
// AgriSense AI — TypeScript Type Definitions
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  farm_size: number;
  irrigation_type: string | null;
  owner_id: string;
  crops?: Crop[];
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  farm_id: string;
  crop_type: string;
  crop_stage: string;
  sowing_date: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  farm_id: string;
  equipment_name: string;
  quantity: number;
  created_at: string;
}

export interface Budget {
  id: string;
  farm_id: string;
  available_budget: number;
  created_at: string;
  updated_at: string;
}

export interface SoilReport {
  id: string;
  farm_id: string;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organic_matter: number | null;
  created_at: string;
}

export interface FarmerProfile {
  id: string;
  user_id: string;
  phone: string | null;
  address: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  farm_id: string;
  target_action?: string;
  recommendation: string;
  explanation: string;
  status?: 'GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'NEEDS_REVISION' | 'IMPLEMENTED' | 'ARCHIVED';
  estimated_cost: number | null;
  confidence_score: number;
  is_high_impact?: boolean;
  implemented_at?: string | null;
  implemented_by_id?: string | null;
  constraints_considered?: Record<string, unknown>;
  constraints?: string[];
  created_at: string;
}


// Form types
export interface AddFarmFormValues {
  name: string;
  location: string;
  farm_size: string;
  irrigation_type: string;
}

export interface AddCropFormValues {
  crop_type: string;
  crop_stage: string;
  sowing_date: string;
}

export interface AddEquipmentFormValues {
  equipment_name: string;
  quantity: string;
}

export interface AddBudgetFormValues {
  available_budget: string;
}

export interface AddSoilFormValues {
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  organic_matter: string;
}

// Dashboard aggregates
export interface DashboardStats {
  totalFarms: number;
  totalCrops: number;
  totalBudget: number;
  activeRecommendations: number;
}

// ============================================================
// Phase 2 — Explainable AI (XAI), Sources & Expert Reviews
// ============================================================

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVISION';

export interface ConstraintEvaluation {
  name: string;
  passed: boolean;
  details?: unknown;
  explanation: string;
}

export interface DecisionSummary {
  recommendation: string;
  reason: string;
  key_bottleneck: string | null;
}

export interface ConfidenceItem {
  factor: string;
  passed: boolean;
  impact: string;
}

export interface ConfidenceBreakdown {
  overall_score: number;
  overall_percentage: number;
  items: ConfidenceItem[];
  summary: string;
}

export interface AlternativeRecommendation {
  primary_recommendation: string;
  alternative_recommendation: string;
  reason: string;
  estimated_cost_difference: number | null;
}

export interface SoilNutrientsSnapshot {
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  status: string;
}

export interface ResourceSnapshot {
  farm_size: number | string;
  budget: number | string;
  current_cash: number | string;
  machinery: string[];
  irrigation_method: string;
  soil_nutrients: SoilNutrientsSnapshot;
  crop: string;
  crop_stage: string;
  influence_explanation: string;
  weather?: Record<string, any> | null;
}

export interface ExplanationResponse {
  recommendation_id: string;
  decision_summary: DecisionSummary;
  constraints: ConstraintEvaluation[];
  decision_factors: string[];
  alternative: AlternativeRecommendation | null;
  confidence_breakdown: ConfidenceBreakdown;
  resource_snapshot?: ResourceSnapshot | null;
}

export interface RecommendationSource {
  id: string;
  recommendation_id: string;
  title: string;
  organization: string;
  url: string | null;
  crop: string | null;
  action: string | null;
  description: string;
  created_at: string;
}

export type OverrideReason =
  | 'RESOURCE_CONSTRAINT'
  | 'WEATHER_CONDITION'
  | 'SOIL_CONDITION'
  | 'FARMER_PREFERENCE'
  | 'SAFETY_CONCERN'
  | 'AGRONOMIC_JUDGMENT'
  | 'OTHER';

export interface RecommendationReview {
  id: string;
  recommendation_id: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  status: ReviewStatus;
  comment: string;
  override_reason?: OverrideReason | string | null;
  created_at: string;
}

export interface AuditResponse {
  id: string;
  recommendation_id: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface RecommendationDetail {
  recommendation: Recommendation;
  explanation: ExplanationResponse;
  sources: RecommendationSource[];
  latest_review: RecommendationReview | null;
  audit_trail: AuditResponse[];
}

export interface OfficerQueueItem {
  id: string;
  farm_id: string;
  farm_name: string;
  farmer_name: string;
  farmer_email: string;
  crops: string[];
  recommendation: string;
  explanation: string;
  confidence_score: number;
  estimated_cost: number | null;
  is_high_impact?: boolean;
  created_at: string;
  status: string;
  review_status: string;
  latest_review: RecommendationReview | null;
}

export interface OfficerStats {
  total_recommendations: number;
  pending_reviews: number;
  approved: number;
  needs_revision: number;
  average_confidence: number;
  average_estimated_cost: number;
  recommendations_this_week: number;
}

// ==========================================
// REVIEW 3 TYPES: Companies, Contracts, Notifications, Admin
// ==========================================

export interface Company {
  id: string;
  user_id?: string | null;
  company_name: string;
  address?: string | null;
  email: string;
  phone?: string | null;
  processing_category: string;
  supported_crops: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProcurementStatus = 'OPEN' | 'PAUSED' | 'FULFILLED' | 'CLOSED';

export interface ProcurementRequirement {
  id: string;
  company_id: string;
  company_name?: string | null;
  crop: string;
  required_quantity: number;
  minimum_quality_grade: string;
  moisture_percentage?: number | null;
  nitrogen_requirement?: number | null;
  phosphorus_requirement?: number | null;
  potassium_requirement?: number | null;
  organic_matter_requirement?: number | null;
  minimum_farm_size?: number | null;
  preferred_irrigation?: string | null;
  harvest_window?: string | null;
  expected_delivery_date?: string | null;
  offered_price: number;
  status: ProcurementStatus;
  created_at: string;
  updated_at: string;
}

export type ContractStatus =
  | 'AVAILABLE'
  | 'INTERESTED'
  | 'APPLICATION_SUBMITTED'
  | 'UNDER_COMPANY_REVIEW'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'HARVEST_READY'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface Contract {
  id: string;
  procurement_id: string;
  farm_id: string;
  farmer_id: string;
  company_id: string;
  crop: string;
  farm_name: string;
  farmer_name: string;
  farmer_email: string;
  company_name: string;
  agreed_quantity: number;
  agreed_price: number;
  status: ContractStatus;
  terms_and_conditions?: string | null;
  rejection_reason?: string | null;
  signed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConstraintMatch {
  name: string;
  passed: boolean;
  description: string;
  farm_value: string;
  required_value: string;
}

export interface MatchingResult {
  procurement_id: string;
  company_id: string;
  company_name: string;
  processing_category: string;
  crop: string;
  offered_price: number;
  required_quantity: number;
  compatibility_score: number;
  matched_constraints: ConstraintMatch[];
  failed_constraints: ConstraintMatch[];
  estimated_revenue: number;
  estimated_cost: number;
  estimated_profit: number;
  match_explanation: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_farmers: number;
  total_officers: number;
  total_companies: number;
  total_farms: number;
  total_recommendations: number;
  total_reviews: number;
  total_contracts: number;
  approval_rate: number;
  average_confidence: number;
}

export interface AdminCharts {
  recommendations_by_crop: { crop: string; count: number }[];
  review_status_distribution: { status: string; count: number }[];
  contract_status_distribution: { status: string; count: number }[];
  confidence_distribution: { range: string; count: number }[];
  soil_nutrient_distribution: { nutrient: string; average: number; benchmark: number }[];
  procurement_demand_by_crop: { crop: string; quantity: number }[];
  monthly_activity: { month: string; recommendations: number; contracts: number; reviews: number }[];
}



