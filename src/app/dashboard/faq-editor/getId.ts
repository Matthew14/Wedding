export async function getQuestionId(question: string): Promise<string> {
  try {
    const response = await fetch('/api/generate-faq-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.questionId;
  } catch (error) {
    console.error('Failed to generate question ID via API:', error);
    
    // Fallback to client-side generation if API fails
    const fallbackId = question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return fallbackId;
  }
}
