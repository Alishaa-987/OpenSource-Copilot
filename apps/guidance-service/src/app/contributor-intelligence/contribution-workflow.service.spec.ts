import { ContributionWorkflowService } from './contribution-workflow.service';

describe('ContributionWorkflowService', () => {
  it('returns an ordered ten-stage-plus-review workflow with explainable caution', async () => {
    const intelligence = { getIntelligence: jest.fn().mockResolvedValue({ issue: { title: 'Add pagination' }, analysis: { beginnerSuitable: true }, mapping: { limitations: [] } }) };
    const service = new ContributionWorkflowService({} as never, intelligence as never);
    const result = await service.getWorkflow('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'sid=session');
    expect(result.beginnerSuitable).toBe(true);
    expect(result.steps).toHaveLength(11);
    expect(result.steps.map((step) => step.order)).toEqual([1,2,3,4,5,6,7,8,9,10,11]);
    expect(result.steps[0].id).toBe('understand-repository');
    expect(result.steps[10].id).toBe('create-pr');
    expect(result.caution).toContain('guidance');
  });

  it('surfaces retrieval limitations instead of hiding uncertainty', async () => {
    const intelligence = { getIntelligence: jest.fn().mockResolvedValue({ issue: { title: 'Change architecture' }, analysis: { beginnerSuitable: false }, mapping: { limitations: ['No indexed repository context matched this issue.'] } }) };
    const service = new ContributionWorkflowService({} as never, intelligence as never);
    const result = await service.getWorkflow('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'sid=session');
    expect(result.beginnerSuitable).toBe(false);
    expect(result.caution).toContain('No indexed repository context');
  });
});
