import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'API Key missing' }, { status: 500 });

    // Single Unified Smart-Fill Prompt
    const systemPrompt = `
      You are an expert technical collaborator and engineer.
      TASK: Analyze the user's current whiteboard state and perform a "Smart Autofill."

      The user may be working on math, physics, art, or any subject, so please think carefully about how you should complete it.
      
      CRITICAL VISUAL STYLE:
      - **STYLE MATCHING**: You MUST mimic the line weight, "hand-drawn" feel, and aesthetic of the user's existing work. It should look like a high quality doodle in a notebook!
      - **IMAGE TYPE**: Generate a flat, 2D digital scan.
      - **BACKGROUND**: PURE WHITE (#FFFFFF) only.
      - **INK**: PURE BLACK (#000000) high-contrast lines only.
      - **SPATIAL AWARENESS MOST IMPORTANT**: The image must not spatially be placed on top of any text. please be very aware of the location you are putting your content! 
      - **SPATIAL AWARENESS**: Integrate your additions seamlessly. Do not redraw the original; only provide the new content.
      - **TEXT RULE**: Use text ONLY if the user is solving a mathematical/textual problem. If the work is purely a diagram, DRAW ONLY.
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Closure HQ',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{ 
          role: 'user', 
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: systemPrompt }
          ] 
        }],
        modalities: ['image', 'text'],
      }),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    let imageUrl = null;
    
    // Robust image extraction
    const legacyImages = (message as any)?.images;
    if (Array.isArray(legacyImages) && legacyImages.length > 0) {
      imageUrl = legacyImages[0]?.image_url?.url ?? legacyImages[0]?.url;
    } else {
      const content = (message as any)?.content;
      if (Array.isArray(content)) {
        const imagePart = content.find((p: any) => p.type === 'image_url' || p.type === 'output_image');
        imageUrl = imagePart?.image_url?.url || imagePart?.url;
      }
    }

    if (!imageUrl) return NextResponse.json({ error: 'AI failed to generate a response' }, { status: 500 });

    return NextResponse.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}