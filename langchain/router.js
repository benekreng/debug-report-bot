import { ChatOpenAI } from "@langchain/openai";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Handle file paths in ES Modules (equivalent to pathlib logic)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LLMService {
  constructor() {
    this.openRouterKey = process.env.OPEN_ROUTER_API_KEY;

    if (!this.openRouterKey) {
      throw new Error("Open Router API key not set");
    }

    // Resolve models.yaml relative to this file
    const modelsPath = path.join(__dirname, "models.yaml");
    let models;

    try {
      const fileContents = fs.readFileSync(modelsPath, "utf8");
      models = yaml.load(fileContents);
    } catch (e) {
      throw new Error(`Failed to load models.yaml: ${e.message}`);
    }

    // Create the available models map
    this._availModels = {};
    for (const [provider, modelList] of Object.entries(models)) {
      for (const model of modelList) {
        this._availModels[model] = provider;
      }
    }

    this._clients = {};
  }

  _loadModel(modelName) {
    const modelProvider = this._availModels[modelName];
    console.log(`loading: ${modelProvider}`);

    if (modelProvider === "open_router") {
      // LangChain JS uses milliseconds for timeouts
      this._clients[modelName] = new ChatOpenAI({
        modelName: modelName,
        openAIApiKey: this.openRouterKey,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "X-OpenAI-Stream": "false",
            "max_output_tokens": "9123", // Kept specific to your Python logic
          },
        },
        streaming: false,
        timeout: 20000, // 20 seconds
        maxRetries: 1,
      });

      return this._clients[modelName];
    }
    
    // Placeholder for Groq or other providers if you add them later
    // else if (modelProvider === "groq") { ... }
  }

  getModel(modelName) {
    if (!this._availModels.hasOwnProperty(modelName)) {
      throw new Error("Model not found in models");
    }

    // Lazy load model
    if (!this._clients[modelName]) {
      this._loadModel(modelName);
    }

    return this._clients[modelName];
  }
}