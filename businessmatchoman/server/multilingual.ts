import fetch from "node-fetch";
import type { Language } from "../client/src/hooks/use-language";

/**
 * Interface for the listing data with title and description
 * for use with translation functions
 */
interface TranslatableContent {
  title?: string;
  description?: string;
  [key: string]: any; // Allow other fields
}

/**
 * Interface for Google Cloud Translation API response
 */
interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

/**
 * Interface for HuggingFace API response
 */
interface HuggingFaceResponse {
  generated_text: string;
}

/**
 * Translates a single field from source language to target language
 * using HuggingFace for Arabic and Google Translate as fallback
 *
 * @param text - Text to translate
 * @param source - Source language ('en' | 'ar')
 * @param target - Target language ('en' | 'ar')
 * @returns Promise with the translated text
 */
export async function translateField(
  text: string,
  source: Language,
  target: Language,
): Promise<string> {
  if (!text || source === target) {
    return text;
  }

  console.log(
    `[Translation] Translating from ${source} to ${target}: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
  );

  // For Arabic to English translations, use HuggingFace BERT model (aubmindlab/bert-base-arabertv02)
  if (source === "ar" && target === "en" && process.env.HUGGINGFACE_API_KEY) {
    try {
      console.log(
        "[Translation] Using HuggingFace for Arabic to English translation",
      );
      return await translateWithHuggingFace(text, source, target);
    } catch (error) {
      console.error("[Translation] HuggingFace translation error:", error);
      // Fall back to Google Translate if HuggingFace fails
      console.log("[Translation] Falling back to Google Translate");
      return await translateWithGoogleTranslate(text, source, target);
    }
  }

  // For English to Arabic translations, use HuggingFace BERT model (aubmindlab/bert-base-arabertv02)
  if (source === "en" && target === "ar" && process.env.HUGGINGFACE_API_KEY) {
    try {
      console.log(
        "[Translation] Using HuggingFace for English to Arabic translation",
      );
      return await translateWithHuggingFace(text, source, target);
    } catch (error) {
      console.error("[Translation] HuggingFace translation error:", error);
      // Fall back to Google Translate if HuggingFace fails
      console.log("[Translation] Falling back to Google Translate");
      return await translateWithGoogleTranslate(text, source, target);
    }
  }

  // Fallback to Google Translate for all other cases
  console.log("[Translation] Using Google Translate");
  return await translateWithGoogleTranslate(text, source, target);
}

/**
 * Translates text using HuggingFace BERT model (aubmindlab/bert-base-arabertv02)
 */
async function translateWithHuggingFace(
  text: string,
  source: Language,
  target: Language,
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HuggingFace API key not found");
  }

  // Prepare the prompt based on language direction
  let prompt = "";
  if (source === "en" && target === "ar") {
    prompt = `Translate from English to Arabic: ${text}`;
  } else if (source === "ar" && target === "en") {
    prompt = `Translate from Arabic to English: ${text}`;
  } else {
    throw new Error(`Unsupported language pair: ${source} to ${target}`);
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/aubmindlab/bert-base-arabertv02",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        options: {
          wait_for_model: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[Translation] HuggingFace API error:", error);
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const data = (await response.json()) as HuggingFaceResponse;

  // Extract the translated part (after the prompt)
  let translated = data.generated_text;

  if (source === "en" && target === "ar") {
    // Extract the Arabic translation (after "Arabic:")
    const match = translated.match(/Arabic:\s*(.*)/i);
    return match?.[1] || translated;
  } else if (source === "ar" && target === "en") {
    // Extract the English translation (after "English:")
    const match = translated.match(/English:\s*(.*)/i);
    return match?.[1] || translated;
  }

  return translated;
}

/**
 * Translates text using Google Cloud Translation API (fallback)
 */
async function translateWithGoogleTranslate(
  text: string,
  source: Language,
  target: Language,
): Promise<string> {
  try {
    // Call Google Cloud Translation API
    const apiKey = "AIzaSyCH5sO987TTkhesnEUfnvs2Hyloeqt_BH4";
    const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: "text",
      }),
    });

    if (!response.ok) {
      return text; // Return original text on error
    }

    const data = (await response.json()) as GoogleTranslateResponse;
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error("[Translation] Google Translate error:", error);
    return text; // Return original text on error
  }
}

/**
 * Translates listing content (title, description) to the other language
 *
 * @param content - Content object with title and description fields
 * @param sourceLanguage - Language in which content is being provided ('en' | 'ar')
 * @returns Promise with an object containing both language versions
 */
export async function translateListingContent(
  content: TranslatableContent,
  sourceLanguage: Language,
): Promise<{
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
}> {
  const targetLanguage: Language = sourceLanguage === "en" ? "ar" : "en";

  // Extract source content
  const title = content.title || "";
  const description = content.description || "";

  // Initialize result object with source content
  const result = {
    [`title_${sourceLanguage}`]: title,
    [`description_${sourceLanguage}`]: description,
    title_en: sourceLanguage === "en" ? title : "",
    title_ar: sourceLanguage === "ar" ? title : "",
    description_en: sourceLanguage === "en" ? description : "",
    description_ar: sourceLanguage === "ar" ? description : "",
  };

  try {
    // Translate title and description to the target language
    const translatedTitle = await translateField(
      title,
      sourceLanguage,
      targetLanguage,
    );
    const translatedDescription = await translateField(
      description,
      sourceLanguage,
      targetLanguage,
    );

    // Set the translated fields
    result[`title_${targetLanguage}`] = translatedTitle;
    result[`description_${targetLanguage}`] = translatedDescription;

    if (targetLanguage === "en") {
      result.title_en = translatedTitle;
      result.description_en = translatedDescription;
    } else {
      result.title_ar = translatedTitle;
      result.description_ar = translatedDescription;
    }
  } catch (error) {
    console.error("Error translating listing content:", error);
  }

  return result;
}

/**
 * Get the appropriate language version of a field based on user's language preference
 *
 * @param listing - Listing object with title_en, title_ar, description_en, description_ar
 * @param language - User's preferred language ('en' | 'ar')
 * @returns Object with title and description in the preferred language
 */
export function getLocalizedFields(
  listing: any,
  language: Language,
): { title: string; description: string } {
  return {
    title: listing[`title_${language}`] || "",
    description: listing[`description_${language}`] || "",
  };
}
