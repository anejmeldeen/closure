import type { Profile } from "@/types/index";

// Mock employee data - will be replaced with Supabase query
export const mockEmployees: Record<string, Profile> = {
 "1": {
   id: "1",
   full_name: "Sarah Jenkins",
   role: "Frontend Engineer",
   avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
   skills: ["React", "TypeScript", "CSS", "Next.js"],
   max_capacity: 40,
   meeting_hours_7d: 8,
   task_hours_7d: 28,
   performance_rating: 4.5,
   team_id: "team-001",
   org_id: "org-001",
 },
 "2": {
   id: "2",
   full_name: "Marcus Chen",
   role: "Backend Engineer",
   avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
   skills: ["Node.js", "Python", "PostgreSQL", "AWS"],
   max_capacity: 40,
   meeting_hours_7d: 6,
   task_hours_7d: 32,
   performance_rating: 4.8,
   team_id: "team-001",
   org_id: "org-001",
 },
 "3": {
   id: "3",
   full_name: "Rayyan",
   role: "Full stack Engineer / Data analyst / Quant",
   avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rayyan",
   skills: ["Node.js", "Python", "PostgreSQL", "AWS", "TypeScript"],
   max_capacity: 40,
   meeting_hours_7d: 6,
   task_hours_7d: 32,
   performance_rating: 5,
   team_id: "team-002",
   org_id: "org-001",
 },
};


// Employee status mapping
export const employeeStatuses: Record<
 string,
 {
   status: string;
   statusColor: "green" | "red" | "yellow" | "gray";
   isInactive: boolean;
 }
> = {
 "1": { status: "Online", statusColor: "green", isInactive: false },
 "2": { status: "OOO - Sick", statusColor: "red", isInactive: true },
 "3": { status: "Online", statusColor: "green", isInactive: false },
};
