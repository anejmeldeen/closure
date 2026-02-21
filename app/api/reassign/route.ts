import { NextResponse } from 'next/server';
import { findBestBackup, calculateBandwidthScore } from '@/lib/reassignment-engine';
import { Profile, DbTask, ReassignmentProposal } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { atRiskTasks, allProfiles }: { atRiskTasks: DbTask[], allProfiles: Profile[] } = body;

    const proposals = atRiskTasks.map((task) => {
      const bestMatch = findBestBackup(task, allProfiles);
      const originalOwner = allProfiles.find(p => p.id === task.assigned_to);

      if (!bestMatch) return null;

      // Deterministic reasoning based on your engine's logic
      const load = (bestMatch.meeting_hours_7d + bestMatch.task_hours_7d).toFixed(1);
      const reasoning = `${bestMatch.full_name} selected based on ${bestMatch.performance_rating}/5 performance rating and low weekly load (${load}h total).`;

      return {
        taskId: task.id,
        taskTitle: task.title,
        originalOwnerName: originalOwner?.full_name || 'Unknown',
        suggestedOwnerName: bestMatch.full_name,
        reasoning: reasoning // No AI needed!
      } as ReassignmentProposal;
    });

    return NextResponse.json({ proposals: proposals.filter(p => p !== null) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Reassignment failed" }, { status: 500 });
  }
}