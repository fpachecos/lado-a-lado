export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Baby {
  id: string;
  user_id: string;
  name: string | null;
  gender: 'male' | 'female' | null;
  created_at: string;
  updated_at: string;
}

export interface VisitSchedule {
  id: string;
  user_id: string;
  guid: string;
  name: string | null;
  start_date: string;
  end_date: string;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitSlot {
  id: string;
  schedule_id: string;
  start_time: string;
  duration_minutes: number;
  max_people: number;
  date: string;
  is_skipped: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitBooking {
  id: string;
  slot_id: string;
  visitor_name: string;
  number_of_people: number;
  created_at: string;
  updated_at: string;
}

