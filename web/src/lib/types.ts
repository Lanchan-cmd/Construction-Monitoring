/**
 * Shared domain types for the Nirman construction management system.
 * These mirror the Supabase database schema and are used across the web app.
 */

export type UserRole = "admin" | "engineer" | "contractor" | "owner" | "supervisor" | "labour";
export type Language = "en" | "kn";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  preferred_language: Language;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  engineer_id: string | null;
  contractor_id: string | null;
  status: ProjectStatus;
  budget: number;
  budget_used: number;
  progress_percent: number;
  gst_percent: number;
  start_date: string | null;
  end_date: string | null;
  state: string | null;
  district: string | null;
  taluk: string | null;
  village: string | null;
  pin_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_cost: number;
  gst_percent: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export type MaterialRequestStatus = "pending" | "approved" | "rejected" | "fulfilled";

export interface MaterialRequest {
  id: string;
  project_id: string;
  material_id: string | null;
  material_name: string;
  quantity: number;
  unit: string;
  status: MaterialRequestStatus;
  requested_by: string;
  approved_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  project_id: string;
  full_name: string;
  skill: string | null;
  phone: string | null;
  daily_wage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  project_id: string;
  date: string;
  status: AttendanceStatus;
  hours_worked: number | null;
  overtime_hours: number;
  recorded_by: string;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  worker_id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  period_start: string | null;
  period_end: string | null;
  status: "pending" | "paid" | "partial";
  method: "cash" | "upi" | "bank" | "cheque" | null;
  paid_by: string;
  note: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  description: string | null;
  amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  bill_image_path: string | null;
  expense_date: string;
  recorded_by: string;
  created_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  photo_path: string | null;
  reported_by: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyProgress {
  id: string;
  project_id: string;
  log_date: string;
  work_description: string;
  progress_percent: number;
  labour_count: number;
  hours_worked: number;
  weather_note: string | null;
  recorded_by: string;
  created_at: string;
}

export interface Photo {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string | null;
  caption: string | null;
  photo_type: "site" | "inspection" | "bill" | "issue" | "progress";
  uploaded_by: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  project_id: string | null;
  name: string;
  type: string | null;
  status: "available" | "in_use" | "under_maintenance" | "retired";
  rental_cost_per_day: number;
  purchase_date: string | null;
  last_service_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
