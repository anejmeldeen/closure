import { NextResponse } from "next/server";

const calculateTrueFreeHours = (profile: any, busySlots: string[]) => {
  const calendarFree = Math.max(0, 50 - (busySlots?.length || 0));
  const currentWorkload =
    (profile.task_hours_7d || 0) + (profile.meeting_hours_7d || 0);
  const workloadFree = Math.max(
    0,
    (profile.max_capacity || 40) - currentWorkload,
  );
  return Math.min(calendarFree, workloadFree);
};

export async function POST(request: Request) {
  try {
    const { drawings, allProfiles, allAvailability } = await request.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) throw new Error("OPENROUTER_API_KEY_MISSING");

    const enrichedProfiles = allProfiles.map((profile: any) => {
      const userCalendar = allAvailability.find(
        (a: any) => a.profile_id === profile.id,
      );
      const trueFreeHours = calculateTrueFreeHours(
        profile,
        userCalendar?.busy_slots || [],
      );
      const utilization =
        (profile.task_hours_7d || 0) / (profile.max_capacity || 40);

      return {
        ...profile,
        trueFreeHours,
        utilization,
        batchTaskCount: 0,
      };
    });

    const finalProposals = [];

    for (const drawing of drawings) {
      const drawingSkills = drawing.required_skills || [];

      const candidates = enrichedProfiles
        .map((p) => {
          const matchedSkills = drawingSkills.filter((s: string) =>
            (p.skills || []).some((ps: string) =>
              ps.toLowerCase().includes(s.toLowerCase()),
            ),
          );

          /**
           * THE BALANCED SCORECARD:
           * 1. SPECIALTY (+15 per match): High reward for the right skills.
           * 2. BATCH PENALTY (-40 per task): Heavy push to find "Fresh Blood".
           * 3. UTILIZATION (-10 per 25% full): Discourages burning out the same people.
           */
          const skillBonus = matchedSkills.length * 15;
          const batchPenalty = p.batchTaskCount * 40;
          const utilizationPenalty = p.utilization * 40;

          const score =
            skillBonus +
            (p.performance_rating || 3) -
            batchPenalty -
            utilizationPenalty;

          return { ...p, baseScore: score, matchCount: matchedSkills.length };
        })
        .sort((a, b) => b.baseScore - a.baseScore)
        .slice(0, 10); // Give AI a wider pool to find the best compromise

      const prompt = `
        SYSTEM: RESOURCE_ALLOCATION_PROTOCOL
        ROLE: Expert Project Coordinator
        
        TASK: "${drawing.title || drawing.name}"
        CONTEXT: "${drawing.description || "N/A"}"
        HOURS: ${drawing.estimated_hours}h
        REQUIRED: ${JSON.stringify(drawingSkills)}

        CANDIDATE_POOL:
        ${candidates.map((c) => `- ${c.full_name} (ID: ${c.id}): ${c.trueFreeHours}h free. Batch Load: ${c.batchTaskCount}. Skills: [${c.skills}]. Score: ${c.baseScore.toFixed(1)}`).join("\n")}

        PROTOCOL:
        1. OBJECTIVE: Find the intersection of "Highest Skill Match" and "Lowest Current Workload".
        2. CONSTRAINT: A candidate with Batch Load 0 is preferred unless their skills are totally irrelevant to the task.
        3. REASONING: Explain why you chose this person. If you chose a specialist who already has a task, justify why their expertise was worth the extra workload. Keep explanations concise.
        4. Add multiple people if the task is around 20 hours or more
        
        OUTPUT ONLY JSON:
        { "drawingId": "${drawing.id}", "team": [ { "id": "id", "name": "name", "allocated_hours": number } ], "reasoning": "Detailed justification." }
      `;

      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash-001", // Standard Flash has high logical fidelity
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
            }),
          },
        );

        const result = await response.json();
        const content = result.choices[0].message.content;
        let parsed = JSON.parse(content);

        if (!parsed.team && parsed[Object.keys(parsed)[0]]?.team) {
          parsed = parsed[Object.keys(parsed)[0]];
        }

        if (parsed && Array.isArray(parsed.team)) {
          parsed.team.forEach((member: any) => {
            const prof = enrichedProfiles.find((p) => p.id === member.id);
            if (prof) {
              const hours = Number(member.allocated_hours) || 0;
              prof.trueFreeHours = Math.max(0, prof.trueFreeHours - hours);
              prof.batchTaskCount += 1;
              prof.utilization =
                ((prof.task_hours_7d || 0) + hours) / (prof.max_capacity || 40);
            }
          });
          finalProposals.push({
            ...parsed,
            drawingId: drawing.id,
            drawingName: drawing.title || drawing.name,
          });
        }
      } catch (err) {
        console.error("AI Logic Failure:", err);
      }
    }

    return NextResponse.json({ proposals: finalProposals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
