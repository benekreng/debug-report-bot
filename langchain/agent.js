import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { LLMService } from "./router.js";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. The real bug-report instructions will go here.";

export function createBugReportAgent() {
  const model = LLMService.getModel("gpt-4o-mini");

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", DEFAULT_SYSTEM_PROMPT],
    ["human", "{input}"],
  ]);

  const chain = RunnableSequence.from([prompt, model]);

  return chain;
}

export async function processMessageCollection(input) {
  const agent = createBugReportAgent();
  const result = await agent.invoke({ input });

  // Normalise the response content to a string.
  // LangChain may return content as a string or an array of text parts; flatten both into a single string.
  const content =
    typeof result.content === "string"
      ? result.content
      : Array.isArray(result.content)
        ? result.content
            .map((part) =>
              typeof part === "string" ? part : part?.text ?? "Error: No response from model"
            )
            .join("")
        : String(result.content ?? "Error: No response from model");

  return content;
}

