export interface Organization {
  id: string;
  name: string;
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  org_id: string;
  lead_id?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string; // Added to match your schema update
  role: string;
  skills: string[];
  max_capacity: number;
  meeting_hours_7d: number;
  task_hours_7d: number;    
  performance_rating: number; 
  avatar_url?: string;
  team_id?: string;
  org_id?: string;
  updated_at?: string;
}

export interface DbTask {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  required_skills: string[];
  assigned_to: string;
  status: string;
  due_date?: string; // Matches your 'tasks' table image
  estimated_hours: number;
  created_at?: string;
}

export interface Absence {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at?: string;
}

export interface ReassignmentProposal {
  taskId: string;
  taskTitle: string;
  originalOwnerName: string;
  suggestedOwnerId: string; // Added for easier PATCH requests
  suggestedOwnerName: string;
  reasoning: string;
  skillsMatch?: string[]; // Optional: for the UI to highlight relevant skills
}