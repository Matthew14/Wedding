import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Return a one or two word (kebab-case if 2) lowercase question id for the given question. Please make sure it is no more than two words."
        },
        {
          role: "user",
          content: question
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "question_id_schema",
          schema: {
            type: "object",
            properties: {
              question_id: {
                type: "string",
                pattern: "^[a-z0-9-]+$",
                maxLength: 40
              }
            },
            required: ["question_id"],
            additionalProperties: false
          },
          strict: true
        }
      }
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    
    return NextResponse.json({ 
      questionId: data.question_id 
    });

  } catch (error) {
    console.error('Error generating question ID:', error);
    
    // Fallback ID generation
    const fallbackId = request.url
      ? new URL(request.url).searchParams.get('question')?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'unknown'
      : 'unknown';

    return NextResponse.json({ 
      questionId: fallbackId,
      fallback: true 
    });
  }
}
