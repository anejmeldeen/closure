import { Profile, DbTask } from '@/types';

export function calculateBandwidthScore(profile: Profile): number {
  // Meetings are 20% more draining due to context switching
  const cognitiveLoad = (profile.meeting_hours_7d * 1.2) + profile.task_hours_7d;
  
  // Calculate availability: (Max Capacity - Current Load) scaled by Performance
  // Higher score = Better candidate for new work
  const rawAvailability = profile.max_capacity - cognitiveLoad;
  return rawAvailability * (profile.performance_rating / 5);
}

export function findBestBackup(task: DbTask, allProfiles: Profile[]): Profile | null {
  // 1. Filter for people who have at least one required skill
  const qualified = allProfiles.filter(p => 
    p.skills.some(skill => task.required_skills.includes(skill))
  );

  if (qualified.length === 0) return null;

  // 2. Sort by Bandwidth Score (Descending - highest score is most available)
  return qualified.sort((a, b) => calculateBandwidthScore(b) - calculateBandwidthScore(a))[0];
}