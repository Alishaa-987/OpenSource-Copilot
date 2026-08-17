import axios from "axios";
import { TypedConfigService } from "@osc/config";
import { KnowledgeEnv } from "../env";
import { HttpLlmProvider } from "./http-llm.provider";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("HttpLlmProvider", () => {
  const values = { LLM_BASE_URL: "https://llm.example/v1", LLM_API_KEY: "server-secret", LLM_MODEL: "test-model", AI_REQUEST_TIMEOUT_MS: 30_000 };
  const config = { get: (key: string) => values[key as keyof typeof values] } as unknown as TypedConfigService<KnowledgeEnv>;
  const provider = new HttpLlmProvider(config);

  beforeEach(() => { jest.clearAllMocks(); });

  it("returns trimmed validated content", async () => {
    mockedAxios.post.mockResolvedValue({ data: { choices: [{ message: { content: "  grounded answer  " } }] } });
    await expect(provider.complete([{ role: "user", content: "question" }])).resolves.toBe("grounded answer");
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining("/chat/completions"), expect.objectContaining({ model: "test-model" }), expect.objectContaining({ timeout: 30_000, maxRedirects: 0, headers: expect.objectContaining({ authorization: "Bearer server-secret" }) }));
  });

  it("rejects malformed provider responses", async () => {
    mockedAxios.post.mockResolvedValue({ data: { choices: [{ message: { content: 42 } }] } });
    await expect(provider.complete([{ role: "user", content: "question" }])).rejects.toThrow("invalid response");
  });

  it("fails closed when the provider is not configured", async () => {
    const missing = { get: (key: string) => key === "LLM_MODEL" ? "test-model" : undefined } as unknown as TypedConfigService<KnowledgeEnv>;
    await expect(new HttpLlmProvider(missing).complete([])).rejects.toThrow("not configured");
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
