
interface GenerateSurveyOptions {
  prompt: string;
  title: string;
  description: string;
  surveyType?: string;
}

interface GeneratedQuestion {
  title: string;
  description?: string;
  type: string;
  required?: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

const QUESTION_TYPES = [
  "evi-slider",
  "nps",
  "csat",
  "multiple-choice",
  "text-input",
  "rating",
  "yes-no",
  "number",
  "date"
];

const SYSTEM_PROMPT = `You are an expert survey designer. Generate survey questions based on the user's prompt.

Return ONLY valid JSON array of questions. Each question must have:
- title: string (required, the question text)
- type: one of ${JSON.stringify(QUESTION_TYPES)} (required)
- description: string (optional, additional context)
- required: boolean (optional, defaults to true)
- options: string[] (required for multiple-choice type only)
- minValue: number (optional, for rating/nps/evi-slider types, defaults based on type)
- maxValue: number (optional, for rating/nps/evi-slider types, defaults based on type)
- placeholder: string (optional, for text-input type)

Guidelines:
- For NPS questions: use type "nps" with minValue 0, maxValue 10
- For CSAT questions: use type "csat" with minValue 1, maxValue 5
- For EVI (Emotional Value Index): use type "evi-slider" with minValue 0, maxValue 100
- For rating scales: use type "rating" with appropriate min/max values
- For open feedback: use type "text-input"
- For yes/no decisions: use type "yes-no"
- Create 5-10 well-balanced questions
- Mix question types for better engagement
- Make questions clear and concise

Return only the JSON array, no other text. If you cannot comply, return an empty JSON array [] with no extra text.`;

function extractJsonArray(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const directMatch = candidate.match(/\[[\s\S]*\]/);
  if (directMatch) return directMatch[0];

  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return candidate.slice(firstBracket, lastBracket + 1);
  }

  return "";
}




const FREE_MODELS = [
  "deepseek/deepseek-r1-0528:free",
  "tngtech/deepseek-r1t2-chimera", // Corrected name (no :free suffix)
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free"
];


async function generateViaOpenRouter(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.Open_Router_API_New || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:5000",
    "X-Title": "InsightPulse",
  };

  let lastError: Error | null = null;


  for (const model of FREE_MODELS) {
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;


    try {
      console.log(`Attempting generation with model: ${model}`);

      controller = new AbortController();
      // Set a strict timeout to avoid hanging
      timeoutId = setTimeout(() => {
        console.warn(`Timeout triggered for model ${model}`);
        controller?.abort();
      }, 12000); // 12 seconds

      // Some models (like Gemma on some providers) prefer user message only or combined prompt
      const messages = model.includes("gemma")
        ? [{ role: "user", content: `${systemPrompt}\n\n${userMessage}` }]
        : [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages
        }),
        signal: controller.signal
      });

      // DO NOT clear timeout yet, wait for body!

      if (response.ok) {
        // This might hang if streaming is slow, so keeping timeout active
        const data: any = await response.json();

        if (timeoutId) clearTimeout(timeoutId); // NOW clear it

        const content = data.choices?.[0]?.message?.content || "";
        if (content.trim()) {
          console.log(`Success with model: ${model}`);
          return content;
        }
      } else {
        const errorText = await response.text();

        if (timeoutId) clearTimeout(timeoutId); // Clear it now

        console.warn(`Model ${model} failed: ${response.status} - ${errorText}`);

        // If rate limited, wait a short bit before next model (politeness)
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      const isTimeout = e instanceof Error && (e.name === 'AbortError' || e.message.includes('aborted'));

      if (isTimeout) {
        console.warn(`Model ${model} timed out after 12s. Skipping to next model.`);
      } else {
        console.error(`Error with model ${model}:`, e);
      }

      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }


  throw new Error(`All models failed. Last error: ${lastError?.message || "No specific error"}`);
}



export async function generateSurveyQuestions(
  options: GenerateSurveyOptions
): Promise<GeneratedQuestion[]> {
  const userMessage = `Survey Title: ${options.title}
Survey Description: ${options.description}
Survey Request: ${options.prompt}

Generate survey questions in JSON format.`;

  try {
    const content = await generateViaOpenRouter(SYSTEM_PROMPT, userMessage);

    // Parse the JSON response
    const jsonText = extractJsonArray(content);
    if (!jsonText) {
      throw new Error("Could not find JSON array in response");
    }

    const questions: GeneratedQuestion[] = JSON.parse(jsonText);

    // Validate and normalize questions
    return questions.map((q, idx) => ({
      title: q.title || `Question ${idx + 1}`,
      description: q.description || "",
      type: QUESTION_TYPES.includes(q.type) ? q.type : "text-input",
      required: q.required !== false,
      options: q.type === "multiple-choice" ? q.options || [] : undefined,
      minValue: q.minValue,
      maxValue: q.maxValue,
      placeholder: q.placeholder
    }))
      .filter((q) => q.type && q.title);
  } catch (error) {
    console.error("Error generating survey questions:", error);
    throw new Error(
      `Failed to generate survey questions: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
