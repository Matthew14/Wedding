export async function getQuestionId(question: string): Promise<string> {
  try {
    if (!question.trim()) {
      return 'unknown';
    }

    const response = await fetch('/api/generate-faq-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      // Generate fallback ID
      return generateFallbackId(question);
    }

    const data = await response.json();
    return data.questionId || generateFallbackId(question);
  } catch (error) {
    console.error('Error generating ID:', error);
    return generateFallbackId(question);
  }
}

function generateFallbackId(question: string): string {
  if (!question.trim()) {
    return 'unknown';
  }

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special characters with spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    || 'unknown';
}