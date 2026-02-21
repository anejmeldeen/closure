export interface Profile {
  id: string;
  full_name: string;
  role: string;
  skills: string[];
  max_capacity: number;
  meeting_hours_7d: number; // New
  task_hours_7d: number;    // New
  performance_rating: number; // New (1-5)
  avatar_url?: string;
}

export interface DbTask {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  required_skills: string[];
  assigned_to: string;
  status: string;
  estimated_hours: number; // New
}

export interface ReassignmentProposal {
  taskId: string;
  taskTitle: string;
  originalOwnerName: string;
  suggestedOwnerName: string;
  reasoning: string;
}