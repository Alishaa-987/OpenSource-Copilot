import { Injectable } from '@nestjs/common';
import type { ParsedResume } from './resume-intelligence.types';

/**
 * Deterministic, offline resume parsing used only when the LLM step fails
 * (provider down, key rejected, rate limited, malformed response).
 *
 * It deliberately extracts only what can be found reliably without a model -
 * the technology keywords that actually drive the skill-gap comparison, plus
 * a short summary taken verbatim from the resume. Projects/experience/
 * education stay empty rather than being guessed, which the schema allows.
 *
 * The point is that reading a resume must never depend on an external
 * service being healthy: the upload succeeds, the profile is stored, and the
 * user can retry the richer AI parse later by uploading again.
 */

const KNOWN_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift',
  'Kotlin', 'Scala', 'Dart', 'R', 'MATLAB', 'Perl', 'Haskell', 'Elixir', 'Lua', 'Solidity', 'SQL',
  'HTML', 'CSS', 'Bash', 'Shell', 'PowerShell', 'Assembly', 'Objective-C', 'Julia', 'Clojure',
];

const KNOWN_FRAMEWORKS = [
  'React', 'Next.js', 'Angular', 'Vue', 'Svelte', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask',
  'FastAPI', 'Spring', 'Spring Boot', 'Laravel', 'Rails', 'ASP.NET', '.NET', 'jQuery', 'Bootstrap',
  'Tailwind', 'Redux', 'GraphQL', 'REST', 'gRPC', 'Prisma', 'Sequelize', 'Hibernate', 'TensorFlow',
  'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy', 'OpenCV', 'LangChain', 'Hugging Face',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Elasticsearch', 'Kafka', 'RabbitMQ',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI',
  'AWS', 'Azure', 'GCP', 'Firebase', 'Supabase', 'Vercel', 'Netlify', 'Heroku',
  'Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Linux', 'Nginx', 'Webpack', 'Vite',
  'Jest', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'pytest', 'Mocha',
];

const KNOWN_SKILLS = [
  'Machine Learning', 'Deep Learning', 'Data Science', 'Data Analysis', 'NLP', 'Computer Vision',
  'Web Development', 'Frontend', 'Backend', 'Full Stack', 'Mobile Development', 'DevOps',
  'Microservices', 'API Design', 'Testing', 'CI/CD', 'Cloud Computing', 'Database Design',
  'Agile', 'Scrum', 'Open Source', 'Algorithms', 'Data Structures', 'System Design',
  'Cybersecurity', 'Technical Writing', 'UI/UX',
];

@Injectable()
export class ResumeFallbackParser {
  parse(resumeText: string): ParsedResume {
    const programmingLanguages = this.findTerms(resumeText, KNOWN_LANGUAGES, 20);
    const frameworksTools = this.findTerms(resumeText, KNOWN_FRAMEWORKS, 30);
    const namedSkills = this.findTerms(resumeText, KNOWN_SKILLS, 20);
    // Skills is the broad bucket the comparison reads first, so seed it with
    // everything detected, de-duplicated and capped to the schema's limit.
    const skills = [...new Set([...namedSkills, ...programmingLanguages, ...frameworksTools])].slice(0, 40);
    return {
      summary: this.buildSummary(resumeText),
      skills,
      programmingLanguages,
      frameworksTools,
      projects: [],
      experience: [],
      education: [],
    };
  }

  private findTerms(text: string, terms: readonly string[], limit: number): string[] {
    const found: string[] = [];
    for (const term of terms) {
      if (found.length >= limit) break;
      if (this.mentions(text, term)) found.push(term);
    }
    return found;
  }

  private mentions(text: string, term: string): boolean {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word-ish boundaries so "Go" does not match "Google" and "C" does not
    // match every capital C in the document.
    return new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}([^A-Za-z0-9+#]|$)`, 'i').test(text);
  }

  private buildSummary(resumeText: string): string {
    const line = resumeText
      .split(/\n+/)
      .map((entry) => entry.trim())
      .find((entry) => entry.length >= 40 && /[a-z]/.test(entry));
    const summary = line ?? resumeText.trim().slice(0, 300);
    return summary.slice(0, 600);
  }
}
