import axios from "axios";
import { Injectable } from "@nestjs/common";
import { TypedConfigService } from "@osc/config";
import { KnowledgeEnv } from "../env";
import { ChatMessage, LlmProvider } from "./ai.types";

interface CompletionResponse { choices?: Array<{ message?: { content?: unknown } }>; }

@Injectable()
export class HttpLlmProvider implements LlmProvider {
  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {}
  async complete(messages: readonly ChatMessage[]): Promise<string> {
    const baseUrl = this.config.get("LLM_BASE_URL");
    const apiKey = this.config.get("LLM_API_KEY");
    if (!baseUrl || !apiKey) throw new Error("LLM provider is not configured");
    const response = await axios.post<CompletionResponse>(baseUrl.replace(/\/$/, "") + "/chat/completions", { model: this.config.get("LLM_MODEL"), messages }, { timeout: this.config.get("AI_REQUEST_TIMEOUT_MS"), maxContentLength: 1_000_000, maxBodyLength: 1_000_000, maxRedirects: 0, headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" } });
    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 12_000) throw new Error("LLM provider returned an invalid response");
    return content.trim();
  }
}
