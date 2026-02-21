import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { currentBoardText, prompt } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API Key is missing" }, { status: 500 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", 
        "X-Title": "Capacity HQ" 
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", 
        messages: [
          { 
            role: "system", 
            content: `You are an AI assistant built into an engineering whiteboard. The user wants you to generate a new sticky note based on what is currently on the board. Provide a concise, highly relevant response (1-3 sentences). Do not use markdown.` 
          },
          { 
            role: "user", 
            content: `Current Board Contents:\n${currentBoardText}\n\nUser Request:\n${prompt || "Generate a logical next step or related idea."}` 
          }
        ]
      })
    });

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    return NextResponse.json({ text: generatedText });

  } catch (error) {
    console.error("Magic Fill Error:", error);
    return NextResponse.json({ error: "Failed to generate Magic Fill data" }, { status: 500 });
  }
}