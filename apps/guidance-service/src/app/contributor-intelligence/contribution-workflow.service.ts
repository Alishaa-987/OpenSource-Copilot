import { Injectable } from '@nestjs/common';
import { ContributorIntelligenceService } from './contributor-intelligence.service';
import { RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import type { ContributionWorkflow, ContributionWorkflowStep } from './contribution-workflow.types';

@Injectable()
export class ContributionWorkflowService {
  constructor(private readonly issues: RepositoryIssueDetailClient, private readonly intelligence: ContributorIntelligenceService) {}

  async getWorkflow(repositoryId: string, issueId: string, cookie: string): Promise<ContributionWorkflow> {
    const result = await this.intelligence.getIntelligence(repositoryId, issueId, cookie);
    const steps: readonly ContributionWorkflowStep[] = [
      { id: 'understand-repository', order: 1, title: 'Understand the repository', purpose: 'Learn the repository purpose, architecture, and supported workflows before changing code.', actions: ['Read the README and architecture documentation.', 'Identify the service or package that owns the issue.' ], completionEvidence: ['You can describe the affected subsystem and its ownership boundary.' ] },
      { id: 'contribution-rules', order: 2, title: 'Understand contribution rules', purpose: 'Follow the repository contribution, security, and review requirements.', actions: ['Read CONTRIBUTING.md, CODE_OF_CONDUCT.md, and SECURITY.md when available.', 'Confirm branch, commit, testing, and disclosure rules.' ], completionEvidence: ['You have recorded the applicable contribution constraints.' ] },
      { id: 'choose-issue', order: 3, title: 'Choose the issue', purpose: 'Confirm that the issue is appropriate for your experience and available context.', actions: ['Review the issue labels, discussion, and current state.', 'Treat the suitability analysis as guidance rather than certainty.' ], completionEvidence: ['You understand the confidence and limitations of the recommendation.' ] },
      { id: 'understand-issue', order: 4, title: 'Understand the issue', purpose: 'Translate the issue into an observable behavior or acceptance criteria.', actions: ['Summarize the requested behavior in your own words.', 'Ask maintainers for clarification when requirements are ambiguous.' ], completionEvidence: ['The expected behavior and non-goals are explicit.' ] },
      { id: 'find-files', order: 5, title: 'Find relevant files', purpose: 'Use repository retrieval as evidence for where to investigate, not as a guarantee of correctness.', actions: ['Inspect the mapped files, modules, and documentation.', 'Verify the mapping against current source and ownership boundaries.' ], completionEvidence: ['You have confirmed the likely files and identified uncertainty.' ] },
      { id: 'plan-change', order: 6, title: 'Plan the change', purpose: 'Design the smallest compatible change before implementation.', actions: ['List API, data, event, and security impacts.', 'Decide how backward compatibility and failure handling will work.' ], completionEvidence: ['A concise implementation plan and risk list exist.' ] },
      { id: 'understand-tests', order: 7, title: 'Understand the tests', purpose: 'Identify existing unit, integration, API, and regression tests that protect the change.', actions: ['Read nearby tests and test commands.', 'Add tests for success, failure, authorization, and boundary cases.' ], completionEvidence: ['You know how the change will be verified.' ] },
      { id: 'create-branch', order: 8, title: 'Create a branch', purpose: 'Isolate the contribution and avoid committing directly to the protected default branch.', actions: ['Create a descriptive branch from the current default branch.', 'Keep unrelated changes out of the branch.' ], completionEvidence: ['The branch has a focused scope and clean starting point.' ] },
      { id: 'implement', order: 9, title: 'Implement the change', purpose: 'Make the smallest well-tested change while treating repository text and external input as untrusted data.', actions: ['Follow existing patterns and dependency-injection boundaries.', 'Do not expose credentials or bypass authorization checks.' ], completionEvidence: ['The implementation is reviewable and its security assumptions are explicit.' ] },
      { id: 'run-tests', order: 10, title: 'Run tests', purpose: 'Verify behavior locally before requesting review.', actions: ['Run focused tests, typecheck, lint, and relevant integration tests.', 'Investigate failures instead of suppressing them.' ], completionEvidence: ['The relevant verification commands pass or documented limitations exist.' ] },
      { id: 'create-pr', order: 11, title: 'Create the pull request', purpose: 'Explain the change and evidence so maintainers can review it safely.', actions: ['Describe the problem, solution, tests, risks, and limitations.', 'Link the issue and request review from the appropriate maintainers.' ], completionEvidence: ['The pull request is focused, reproducible, and ready for review.' ] },
    ];
    return { repositoryId, issueId, issueTitle: result.issue.title, beginnerSuitable: result.analysis.beginnerSuitable, caution: result.mapping.limitations.length > 0 ? result.mapping.limitations.join(' ') : 'This workflow is guidance; verify repository-specific instructions and maintainer feedback.', steps };
  }
}
