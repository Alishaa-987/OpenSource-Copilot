import { parsedResumeSchema, skillGapIssueContextSchema, skillGapResultSchema } from './resume-intelligence.types';

describe('resume-intelligence.types', () => {
  describe('parsedResumeSchema', () => {
    it('accepts a well-formed structured resume', () => {
      const candidate = {
        summary: 'Backend-leaning full-stack developer with open-source experience.',
        skills: ['REST APIs', 'Database design'],
        programmingLanguages: ['TypeScript', 'Python'],
        frameworksTools: ['NestJS', 'React', 'Docker'],
        projects: [{ name: 'OpenPath', description: 'Contributor guidance platform', technologies: ['NestJS', 'Next.js'] }],
        experience: [{ role: 'Backend Intern', organization: 'Acme Co', duration: 'Jun 2025 - Aug 2025', highlights: ['Built a pagination API'] }],
        education: [{ credential: 'B.Sc. Computer Science', institution: 'State University', year: '2026' }],
      };
      expect(() => parsedResumeSchema.parse(candidate)).not.toThrow();
    });

    it('rejects unknown extra fields (strict) so the LLM cannot smuggle unexpected shapes', () => {
      const candidate = { summary: 'x', skills: [], programmingLanguages: [], frameworksTools: [], projects: [], experience: [], education: [], extra: 'nope' };
      expect(() => parsedResumeSchema.parse(candidate)).toThrow();
    });

    it('rejects a resume with no summary', () => {
      const candidate = { summary: '', skills: [], programmingLanguages: [], frameworksTools: [], projects: [], experience: [], education: [] };
      expect(() => parsedResumeSchema.parse(candidate)).toThrow();
    });
  });

  describe('skillGapIssueContextSchema', () => {
    it('fills in safe defaults for a minimal/partial payload instead of throwing', () => {
      const parsed = skillGapIssueContextSchema.parse({ title: 'Fix pagination bug' });
      expect(parsed.title).toBe('Fix pagination bug');
      expect(parsed.labels).toEqual([]);
      expect(parsed.requiredKnowledge).toEqual([]);
      expect(parsed.complexity).toBe('unknown');
    });

    it('caps oversized arrays so a crafted request cannot inflate the LLM prompt', () => {
      const parsed = skillGapIssueContextSchema.parse({ requiredKnowledge: Array.from({ length: 50 }, (_, i) => `skill-${i}`) });
      expect(parsed.requiredKnowledge.length).toBeLessThanOrEqual(15);
    });
  });

  describe('skillGapResultSchema', () => {
    it('accepts a well-formed skill-gap comparison result', () => {
      const candidate = {
        readinessSummary: 'You have the backend basics but should read the pagination helper first.',
        matchedSkills: ['REST APIs'],
        missingSkills: ['GraphQL'],
        partialSkills: [{ skill: 'Testing', note: 'You have unit test experience but not integration tests.' }],
        relevantExperience: ['OpenPath contributor project used a similar pagination pattern.'],
        thingsToUnderstand: ['How pagination.ts computes offsets'],
        actionChecklist: ['Read pagination.ts', 'Write a regression test'],
      };
      expect(() => skillGapResultSchema.parse(candidate)).not.toThrow();
    });
  });
});
