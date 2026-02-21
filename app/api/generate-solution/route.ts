import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image, mode = 'art' } = await req.json();

    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'API Key missing' }, { status: 500 });

    let systemPrompt = '';
    
    const baseVisualRules = `
      CRITICAL VISUAL STYLE:
      - **DIGITAL SCAN MODE**: Generate a flat digital image.
      - **BACKGROUND**: PURE WHITE (#FFFFFF). No texture, no shadows.
      - **INK**: High-contrast BLACK (#000000).
      - **NO REDRAWING**: DO NOT redraw the user's original lines.
    `;

    switch (mode) {
      case 'solve':
        systemPrompt = `
          You are a brilliant software architect in a war room.
          TASK: Look at the user's architectural diagram or notes and solve the problem.
          Write out logical steps or system flows only if necessary.
          ${baseVisualRules}
        `;
        break;
      case 'learn':
        systemPrompt = `
          You are a senior engineering mentor.
          TASK: Look at the user's drawing and provide visual hints, structural corrections, or architectural annotations.
          ${baseVisualRules}
        `;
        break;
      case 'art':
      default:
        systemPrompt = `
          You are a collaborative systems designer.
          TASK: Look at the user's diagram. Add to it creatively (finish the wireframe, add a missing database node, or structural element).
          - **NO TEXT**: UNDER NO CIRCUMSTANCES SHOULD YOU WRITE ANY TEXT IN YOUR RESPONSE. DRAW ONLY.
          ${baseVisualRules}
        `;
        break;
    }

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
    const legacyImages = (message as any)?.images;
    if (Array.isArray(legacyImages) && legacyImages.length > 0) {
      imageUrl = legacyImages[0]?.image_url?.url ?? legacyImages[0]?.url;
    } else {
      const content = (message as any)?.content;
      if (Array.isArray(content)) {
        imageUrl = content.find((p: any) => p.type === 'image_url' || p.type === 'output_image')?.image_url?.url 
                || content.find((p: any) => p.type === 'image_url' || p.type === 'output_image')?.url;
      }
    }

    return NextResponse.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}