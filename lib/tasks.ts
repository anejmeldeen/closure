import type { DbTask } from "@/types/index";

export const mockTasks: Record<string, DbTask> = {
  "board-1": {
    id: "board-1",
    title: "Project Alpha",
    description:
      "Build scalable backend infrastructure with API endpoints and authentication",
    priority: "High",
    required_skills: ["Node.js", "PostgreSQL", "TypeScript"],
    assigned_to: "1",
    collaborators: ["2"],
    status: "in-progress",
    estimated_hours: 40,
  },
  "board-2": {
    id: "board-2",
    title: "Project Beta",
    description: "Database optimization and data pipeline implementation",
    priority: "Medium",
    required_skills: ["PostgreSQL", "Python", "AWS"],
    assigned_to: "3",
    collaborators: ["1"],
    status: "in-progress",
    estimated_hours: 32,
  },
  "board-3": {
    id: "board-3",
    title: "Mobile App",
    description: "React Native mobile application development",
    priority: "Critical",
    required_skills: ["React Native", "TypeScript", "Firebase"],
    assigned_to: "2",
    collaborators: ["1", "3"],
    status: "pending",
    estimated_hours: 60,
  },
};
