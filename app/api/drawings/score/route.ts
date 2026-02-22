import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Math Helper: Calculate strict, real-world free time
const calculateTrueFreeHours = (profile: any, busySlots: string[]) => {
  // 1. Calendar Time: Assuming standard 50-hour grid (10 hours * 5 days)
  const calendarFree = Math.max(0, 50 - (busySlots?.length || 0));
  
  // 2. Workload Time: Capacity minus what they are already working on this week
  const currentWorkload = (profile.task_hours_7d || 0) + (profile.meeting_hours_7d || 0);
  const workloadFree = Math.max(0, (profile.max_capacity || 40) - currentWorkload);

  // Their actual free time is the bottleneck (the lowest of the two)
  return Math.min(calendarFree, workloadFree);
};

export async function POST(request: Request) {
  try {
    const { drawings, allProfiles, allAvailability } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Step 1: Enrich profiles with mathematically strict free time
    const enrichedProfiles = allProfiles.map((profile: any) => {
      const userCalendar = allAvailability.find((a: any) => a.profile_id === profile.id);
      const trueFreeHours = calculateTrueFreeHours(profile, userCalendar?.busy_slots || []);
      return { ...profile, trueFreeHours };
    });

    // Step 2: Process each drawing using a dedicated LLM call for high-quality team building
    const assignmentPromises = drawings.map(async (drawing: any) => {
      
      // Pre-filter: Only give the AI candidates who have AT LEAST 1 hour free 
      // and sort them roughly by skill overlap to save AI context limits.
      const drawingSkills = drawing.required_skills || [];
      const eligibleCandidates = enrichedProfiles
        .filter(p => p.trueFreeHours >= 1)
        .map(p => {
          const matchedSkills = drawingSkills.filter((s: string) => (p.skills || []).includes(s));
          const score = drawingSkills.length ? (matchedSkills.length / drawingSkills.length) : 1;
          return { ...p, baseScore: score };
        })
        .sort((a, b) => b.baseScore - a.baseScore)
        .slice(0, 5); // Give the AI the top 5 candidates to build a team from

      if (eligibleCandidates.length === 0) {
        return {
          drawingId: drawing.id,
          drawingName: drawing.name,
          team: [],
          reasoning: "WARNING: No team members have any capacity left this week to take on this drawing."
        };
      }

      // Step 3: The AI Prompt - Ask it to act as a Resource Allocation Manager
      const prompt = `
        You are an expert Resource Manager allocating an engineering/design team for a project.
        
        Drawing Name: "${drawing.name}"
        Total Hours Required: ${drawing.estimated_hours}
        Required Skills: ${JSON.stringify(drawing.required_skills)}

        Available Candidates (DO NOT exceed their True Free Hours):
        ${eligibleCandidates.map((c: any) => `- Name: ${c.full_name} (ID: ${c.id}), True Free Hours: ${c.trueFreeHours}, Skills: ${JSON.stringify(c.skills)}, Performance: ${c.performance_rating}/5`).join('\n')}

        Task: Assemble a team to cover exactly ${drawing.estimated_hours} hours. 
        - If one highly-skilled person has enough "True Free Hours", assign it all to them.
        - If the best person doesn't have enough hours, split the hours among multiple candidates to cover the total required hours.
        - Do NOT assign more hours to a person than their "True Free Hours".

        Return ONLY a valid JSON object in this exact format, with no markdown formatting or extra text:
        {
          "drawingId": "${drawing.id}",
          "team": [
            { "id": "candidate_id", "name": "Candidate Name", "allocated_hours": number_of_hours }
          ],
          "reasoning": "A 1-2 sentence professional explanation of why this team was chosen based on their skills and strict capacity limits."
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();
        // Clean markdown wrappers if Gemini includes them
        rawText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        return JSON.parse(rawText);
      } catch (aiError) {
        console.error(`AI assignment failed for drawing ${drawing.id}`, aiError);
        return {
          drawingId: drawing.id,
          drawingName: drawing.name,
          team: [{ id: eligibleCandidates[0].id, name: eligibleCandidates[0].full_name, allocated_hours: Math.min(drawing.estimated_hours, eligibleCandidates[0].trueFreeHours) }],
          reasoning: "Fallback assignment based on highest base score. AI generation failed."
        };
      }
    });

    const proposals = await Promise.all(assignmentPromises);
    return NextResponse.json({ proposals });

  } catch (error: any) {
    console.error("Scoring Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}