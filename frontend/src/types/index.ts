export interface User {
  id: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  username: string;
  mobile?: string;
  mobile_number?: string;
  gender?: string;
  dob?: string;
  role: 'customer' | 'staff' | 'admin';
  is_verified: boolean;
  email_verified?: boolean;
  mobile_verified?: boolean;
  is_active: boolean;
  organization_id?: string;
  profile_image?: string;
  auth_provider?: string;
  google_sub?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
  department_count?: number;
  created_at?: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string;
  floor?: string;
  room_number?: string;
  queue_prefix: string;
  max_daily_capacity: number;
  is_active: boolean;
  active_tokens_count?: number;
}

export interface Service {
  id: string;
  organization_id: string;
  department_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  department_name?: string;
}

export interface SlotAvailability {
  time_slot: string;
  available: boolean;
  booked_count: number;
  capacity: number;
}

export interface AvailabilityResponse {
  date: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  slots: SlotAvailability[];
}

export interface Appointment {
  id: string;
  user_id: string;
  customer_name?: string;
  customer_mobile?: string;
  organization_id: string;
  organization_name?: string;
  department_id: string;
  department_name?: string;
  service_id: string;
  service_name?: string;
  appointment_date: string;
  time_slot: string;
  token_id?: string;
  token_number?: string;
  status: 'booked' | 'in_service' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
  created_at: string;
}

export interface QueueToken {
  id: string;
  token_number: string;
  sequence_number: number;
  appointment_id?: string;
  user_id: string;
  customer_name: string;
  customer_mobile: string;
  organization_id: string;
  organization_name?: string;
  department_id: string;
  department_name?: string;
  service_id: string;
  service_name?: string;
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled' | 'missed';
  appointment_date?: string;
  appointment_time?: string;
  position_in_queue?: number;
  people_ahead?: number;
  estimated_waiting_time_minutes?: number;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  actual_duration_seconds?: number;
  created_at: string;
  position_info?: QueuePosition;
}

export interface QueuePosition {
  token_number: string;
  status: string;
  position: number;
  people_ahead: number;
  estimated_wait_minutes: number;
  currently_serving?: string;
  department_name: string;
  organization_name: string;
  customer_name?: string;
  token_id?: string;
}

export interface AdminMetrics {
  total_appointments_today: number;
  waiting_customers: number;
  completed_services: number;
  average_waiting_time_minutes: number;
  total_registered_customers: number;
}

export interface DepartmentPerformance {
  department_id: string;
  department_name: string;
  total_tokens: number;
  completed_tokens: number;
  waiting_tokens: number;
  avg_service_duration_minutes: number;
}

export interface AdminAnalytics {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  missed_appointments: number;
  average_waiting_time_minutes: number;
  average_service_duration_minutes: number;
  department_performance: DepartmentPerformance[];
  daily_volume: Array<{
    date: string;
    total: number;
    completed: number;
    cancelled: number;
  }>;
}

