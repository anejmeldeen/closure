export type Profile = {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  skills: string[];
  max_capacity: number;
};

export type Absence = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  required_skills: string[];
  assigned_to: string | null;
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
};