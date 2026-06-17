import { DatabaseStorage } from "./storage";

const CASPIO_ENABLED = (process.env.CASPIO_ENABLED || "false").toLowerCase() === "true";

function makeStorage() {
  const db = new DatabaseStorage();
  if (!CASPIO_ENABLED) {
    return db;
  }

  // Caspio storage is disabled since the integration files were removed
  
  return db;
}

export const storage = makeStorage();

export function getStorageInfo() {
  const enabled = CASPIO_ENABLED;
  if (!enabled) {
    return {
      mode: "local",
      caspio: null,
    } as const;
  }

  const baseUrl = process.env.CASPIO_BASE_URL || "";
  const clientId = process.env.CASPIO_CLIENT_ID || "";
  const orderColumn = process.env.CASPIO_QUESTIONS_ORDER_COLUMN || "order";
  const surveysTable = process.env.CASPIO_TABLE_SURVEYS || "surveys";
  const questionsTable = process.env.CASPIO_TABLE_QUESTIONS || "questions";
  const responsesTable = process.env.CASPIO_TABLE_RESPONSES || "responses";

  const redactedClientId = clientId ? clientId.slice(0, 6) + "…" + clientId.slice(-4) : null;

  return {
    mode: "caspio",
    caspio: {
      baseUrl,
      tables: {
        surveys: surveysTable,
        questions: questionsTable,
        responses: responsesTable,
        orderColumn,
      },
      clientId: redactedClientId,
      hasClientSecret: Boolean(process.env.CASPIO_CLIENT_SECRET),
    },
  } as const;
}
