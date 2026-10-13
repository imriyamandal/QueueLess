export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export interface Facility {
  id: string;
  name: string;
  description?: string;
  address?: string;
  timezone: string;
  is_active: boolean;
}

export interface Service {
  id: string;
  facility_id: string;
  department_id?: string;
  name: string;
  code: string;
  description?: string;
  baseline_duration_seconds: number;
}

export interface QueueItem {
  id: string;
  service_id: string;
  name: string;
  session_date: string;
  status: string;
  next_token_number: number;
  service_name?: string;
  facility_name?: string;
  waiting_count: number;
  in_service_count: number;
  completed_count: number;
}

export interface QueueEntry {
  id: string;
  queue_id: string;
  token_number: string;
  visitor_name?: string;
  visitor_phone?: string;
  status: string;
  priority: number;
  joined_at: string;
  called_at?: string;
  service_start_at?: string;
  completed_at?: string;
  assigned_counter_id?: string;
  assigned_counter_name?: string;
  notes?: string;
  travel_time_minutes: number;
  actual_waiting_seconds?: number;
  actual_service_seconds?: number;
}

export interface NotificationDelivery {
  id: string;
  entry_id: string;
  channel?: string;
  recipient_phone?: string;
  recipient_token?: string;
  event_type: string;
  provider: string;
  status: string;
  provider_message_id?: string;
  message_text?: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

export interface TicketDetail {
  ticket: QueueEntry;
  facility_id: string;
  facility_name: string;
  service_id: string;
  service_name: string;
  queue_name: string;
  position_ahead: number;
  estimated_wait_seconds: number;
  lower_bound_seconds: number;
  upper_bound_seconds: number;
  estimated_turn_time?: string;
  turn_time_lower?: string;
  turn_time_upper?: string;
  recommended_departure_time?: string;
  active_counters_count: number;
  data_quality: string;
  explanation: string;
  facility_timezone: string;
  last_updated_at: string;
  status_message: string;
  notifications: NotificationDelivery[];
}

export interface TicketHistoryItem {
  id: string;
  token_number: string;
  queue_id: string;
  facility_name: string;
  service_name: string;
  status: string;
  priority: number;
  joined_at: string;
  called_at?: string;
  service_start_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  actual_waiting_seconds?: number;
  actual_service_seconds?: number;
  assigned_counter_name?: string;
  notes?: string;
}

export interface Counter {
  id: string;
  facility_id: string;
  name: string;
  counter_number: number;
  status: 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE';
  current_entry_id?: string;
  current_token_number?: string;
  current_visitor_name?: string;
  service_elapsed_seconds?: number;
  last_state_change: string;
  supported_services: string[];
}

export interface StaffDashboardData {
  active_queue_id: string;
  counters: Counter[];
  waiting_entries: QueueEntry[];
  in_service_entries: QueueEntry[];
}

export interface AnalyticsData {
  total_served_today: number;
  currently_waiting: number;
  currently_in_service: number;
  avg_waiting_time_seconds: number;
  median_waiting_time_seconds: number;
  avg_service_time_seconds: number;
  no_show_rate_percent: number;
  cancellation_rate_percent: number;
  active_counters_count: number;
  total_counters_count: number;
  counter_utilization_percent: number;
  prediction_mae_seconds: number;
  prediction_coverage_percent: number;
  hourly_throughput: { hour: string; served: number }[];
  service_breakdown: { service: string; count: number }[];
}

// Fetch helper with descriptive error reporting
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
      throw new Error(`Unable to reach QueueLess API (${API_BASE_URL}). Ensure the backend server is running on port 8000.`);
    }
    throw err;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 500) {
      throw new Error(errorData.detail || 'Internal server error while processing queue request. Please retry.');
    }
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Public
  getFacilities: () => request<Facility[]>('/facilities'),
  getServices: () => request<Service[]>('/services'),
  getQueues: () => request<QueueItem[]>('/queues'),

  // Visitor
  joinQueue: (queueId: string, data: { visitor_name: string; visitor_phone?: string; fcm_token?: string; priority?: number; travel_time_minutes?: number }) =>
    request<TicketDetail>(`/queues/${queueId}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTicket: (ticketId: string) => request<TicketDetail>(`/tickets/${ticketId}`),
  cancelTicket: (ticketId: string) =>
    request<TicketDetail>(`/tickets/${ticketId}/cancel`, { method: 'POST' }),
  checkInTicket: (ticketId: string) =>
    request<TicketDetail>(`/tickets/${ticketId}/check-in`, { method: 'POST' }),
  registerFcmToken: (ticketId: string, fcmToken: string) =>
    request<{ success: boolean; message: string; ticket_id: string }>(`/tickets/${ticketId}/fcm-token`, {
      method: 'POST',
      body: JSON.stringify({ fcm_token: fcmToken }),
    }),
  getTicketHistory: (params?: { phone?: string; ids?: string; visitor_name?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.phone) searchParams.append('phone', params.phone);
    if (params?.ids) searchParams.append('ids', params.ids);
    if (params?.visitor_name) searchParams.append('visitor_name', params.visitor_name);
    const qs = searchParams.toString();
    return request<TicketHistoryItem[]>(`/tickets/history${qs ? `?${qs}` : ''}`);
  },
  getTicketNotifications: (ticketId: string) =>
    request<NotificationDelivery[]>(`/tickets/${ticketId}/notifications`),
  testFcmPush: (fcmToken: string, title?: string, body?: string) =>
    request<{ success: boolean; provider: string; channel: string; message_id: string; is_simulated: boolean; error?: string }>(
      '/notifications/test-fcm',
      { method: 'POST', body: JSON.stringify({ fcm_token: fcmToken, title: title || 'QueueLess Test', body: body || 'Real-time push alert' }) }
    ),
  testSms: (phone: string, message: string) =>
    request<{ success: boolean; provider: string; channel?: string; message_id: string; is_simulated: boolean; error?: string }>(
      '/notifications/test-sms',
      { method: 'POST', body: JSON.stringify({ phone, message }) }
    ),

  // Staff
  getStaffDashboard: (queueId?: string) =>
    request<StaffDashboardData>(queueId ? `/staff/dashboard?queue_id=${queueId}` : '/staff/dashboard'),
  callNext: (queueId: string, counterId: string) =>
    request<{ success: boolean; message: string; ticket_id: string }>(`/staff/queues/${queueId}/call-next`, {
      method: 'POST',
      body: JSON.stringify({ counter_id: counterId }),
    }),
  startService: (ticketId: string) =>
    request<{ success: boolean; message: string }>(`/staff/tickets/${ticketId}/start`, { method: 'POST' }),
  completeService: (ticketId: string) =>
    request<{ success: boolean; message: string }>(`/staff/tickets/${ticketId}/complete`, { method: 'POST' }),
  markNoShow: (ticketId: string) =>
    request<{ success: boolean; message: string }>(`/staff/tickets/${ticketId}/no-show`, { method: 'POST' }),
  requeueTicket: (ticketId: string) =>
    request<{ success: boolean; message: string }>(`/staff/tickets/${ticketId}/requeue`, { method: 'POST' }),
  pauseCounter: (counterId: string) =>
    request<{ success: boolean; message: string }>(`/staff/counters/${counterId}/pause`, { method: 'POST' }),
  resumeCounter: (counterId: string) =>
    request<{ success: boolean; message: string }>(`/staff/counters/${counterId}/resume`, { method: 'POST' }),

  // Analytics & Admin
  getAnalytics: () => request<AnalyticsData>('/analytics'),
  getAuditLogs: () => request<any[]>('/admin/audit-logs'),

  // Simulation
  simulate: (action: string, payload?: { counter_id?: string; visitor_name?: string; seed?: number }) =>
    request<{ success: boolean; message: string; token?: string }>(`/demo/simulate`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    }),
};
