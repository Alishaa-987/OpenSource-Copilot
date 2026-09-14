import 'reflect-metadata';
import 'dotenv/config';
import { validateConfig, TypedConfigService } from '@osc/config';
import { guidanceEnvSchema } from './apps/guidance-service/src/app/env';
import { GuidanceLlmService } from './apps/guidance-service/src/app/contributor-intelligence/guidance-llm.service';
import { ResumeTextExtractor } from './apps/guidance-service/src/app/resume-intelligence/resume-text-extractor';

async function main() {
  console.log('--- Validating env ---');
  const env = validateConfig(guidanceEnvSchema, process.env);
  console.log('GROQ configured:', Boolean(env.GROQ_API_KEY), 'model:', env.GROQ_MODEL);
  const config = new TypedConfigService(env as unknown as Record<string, unknown>);

  const llm = new GuidanceLlmService(config as never);
  const extractor = new ResumeTextExtractor();

  const sampleResumeText = `John Doe
Software Engineer

Summary: Backend engineer with 3 years experience in Node.js and TypeScript.

Skills: JavaScript, TypeScript, Node.js, PostgreSQL, Docker

Experience:
Backend Developer at Acme Corp (2022-2024)
- Built REST APIs using NestJS
- Migrated services to PostgreSQL

Education:
BS Computer Science, State University, 2022
`;

  console.log('--- Testing ResumeTextExtractor.extractText (txt) ---');
  const buf = Buffer.from(sampleResumeText, 'utf-8');
  const extracted = await extractor.extractText(buf, 'txt');
  console.log('OK. Extracted length:', extracted.length);

  console.log('--- Testing GuidanceLlmService.parseResume (REAL Groq API call) ---');
  try {
    const parsed = await llm.parseResume(extracted);
    console.log('parseResume SUCCESS. Result:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('parseResume FAILED with error:');
    console.error(err);
    if (err && typeof err === 'object' && 'response' in (err as Record<string, unknown>)) {
      const axiosErr = err as { response?: { status?: number; data?: unknown } };
      console.error('HTTP status:', axiosErr.response?.status);
      console.error('Response body:', JSON.stringify(axiosErr.response?.data, null, 2));
    }
  }
}

main().catch((err) => {
  console.error('FATAL (uncaught):');
  console.error(err);
  process.exit(1);
});
