import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  it("uses Redis atomically and returns retry metadata", async () => {
    const client = { incr: jest.fn().mockResolvedValue(2), expire: jest.fn().mockResolvedValue(1), ttl: jest.fn().mockResolvedValue(58) };
    const service = new RateLimitService({ getClient: () => client } as never);
    await expect(service.consume("127.0.0.1|/api", 3, 60)).resolves.toEqual({ allowed: true, limit: 3, remaining: 1, retryAfterSeconds: 58 });
    expect(client.expire).not.toHaveBeenCalled();
  });

  it("falls back to bounded local state when Redis fails", async () => {
    const client = { incr: jest.fn().mockRejectedValue(new Error("redis down")), expire: jest.fn(), ttl: jest.fn() };
    const service = new RateLimitService({ getClient: () => client } as never);
    await expect(service.consume("subject", 1, 60)).resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(service.consume("subject", 1, 60)).resolves.toMatchObject({ allowed: false, retryAfterSeconds: expect.any(Number) });
  });
});
