import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import { findBestBackup, calculateFinalAvailability } from '@/lib/reassignment-engine';

export async function POST(request: Request) {
  try {
    const { atRiskTasks, allProfiles } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Run our Tiered Logic first (Deterministic)
    const proposals = atRiskTasks.map((task: any) => {
      const bestMatch = findBestBackup(task, allProfiles);
      if (!bestMatch) return null;

      const availability = calculateFinalAvailability(bestMatch).toFixed(1);
      
      return {
        taskId: task.id,
        taskTitle: task.title,
        suggestedOwnerId: bestMatch.id,
        suggestedOwnerName: bestMatch.full_name,
        // Default reasoning if AI fails
        reasoning: `${bestMatch.full_name} has the highest availability (${availability}h) on the same team.`
      };
    }).filter(Boolean);

    // 2. Try to upgrade reasoning with AI if Key is present
    if (apiKey && proposals.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `Review these reassignments for a 100-person tech dept. 
        Provide a 1-sentence professional justification for each. 
        Return as a JSON array of strings only: ${JSON.stringify(proposals)}`;

        const result = await model.generateContent(prompt);
        const aiJustifications = JSON.parse(result.response.text());

        // Merge AI justifications into our proposals
        proposals.forEach((p: any, i: number) => {
          if (aiJustifications[i]) p.reasoning = aiJustifications[i];
        });
      } catch (aiError) {
        console.warn("AI failed, falling back to deterministic reasoning", aiError);
      }
    }

    return NextResponse.json({ proposals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}