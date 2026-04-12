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
  birth_date: string | null;
  feeding_notification_enabled: boolean;
  feeding_notification_hours: number;
  milestone_notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BabyWeight {
  id: string;
  baby_id: string;
  weight_grams: number;
  measured_at: string;
  created_at: string;
}

export interface BabyHeight {
  id: string;
  baby_id: string;
  height_mm: number;
  measured_at: string;
  created_at: string;
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

export interface Companion {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CompanionActivity {
  id: string;
  companion_id: string;
  content: string;
  position: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BabyFeeding {
  id: string;
  baby_id: string;
  started_at: string;
  ended_at: string | null;
  breast: 'left' | 'right' | 'both';
  created_at: string;
}

export interface UserInvite {
  id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  updated_at: string;
}

