import { Profile, DbTask } from '@/types';

/**
 * Calculates a 'Headroom' score where HIGHER = MORE AVAILABLE.
 * Weights meetings heavier due to context-switching costs.
 */
export function calculateFinalAvailability(profile: Profile): number {
  const meetingWeight = 1.2; 
  const currentLoad = (profile.meeting_hours_7d * meetingWeight) + profile.task_hours_7d;
  
  // Calculate remaining capacity
  const headroom = profile.max_capacity - currentLoad;
  
  // Factor in the performance rating (1-5) to prioritize high-efficiency users
  // Score = (Available Hours) * (Performance Multiplier)
  return headroom * (profile.performance_rating / 5);
}

/**
 * Tiered Selection Logic:
 * 1. Same Team + High Availability
 * 2. Same Org + High Availability
 */
export function findBestBackup(task: DbTask, allProfiles: Profile[]): Profile | null {
  const originalOwner = allProfiles.find(p => p.id === task.assigned_to);
  
  // Filter for qualified candidates (Skills match & not the OOO person)
  const qualified = allProfiles.filter(p => 
    p.skills.some(skill => task.required_skills.includes(skill)) &&
    p.id !== task.assigned_to
  );

  if (qualified.length === 0) return null;

  // TIER 1: Find best match in the SAME TEAM
  const teamBackups = qualified.filter(p => p.team_id === originalOwner?.team_id);
  if (teamBackups.length > 0) {
    return teamBackups.sort((a, b) => 
      calculateFinalAvailability(b) - calculateFinalAvailability(a)
    )[0];
  }

  // TIER 2: Escalation to the whole Organization
  return qualified.sort((a, b) => 
    calculateFinalAvailability(b) - calculateFinalAvailability(a)
  )[0];
}