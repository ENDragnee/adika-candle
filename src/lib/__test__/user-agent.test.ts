import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserAgent } from '../user-agent';
import * as nextHeaders from 'next/headers';
import * as nextServer from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('next/server', () => ({
  userAgent: vi.fn(),
}));

describe('getUserAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse desktop user agent and ip', async () => {
    const mockHeaders = new Map([
      ['x-forwarded-for', '192.168.1.1, 10.0.0.1'],
    ]);
    
    vi.mocked(nextHeaders.headers).mockResolvedValue(mockHeaders as any);
    vi.mocked(nextServer.userAgent).mockReturnValue({
      ua: 'Mozilla/5.0 Windows',
      device: { type: undefined },
    } as any);

    const result = await getUserAgent();
    expect(result.ip).toBe('192.168.1.1');
    expect(result.deviceType).toBe('desktop');
    expect(result.userAgent).toBe('Mozilla/5.0 Windows');
  });

  it('should handle mobile device type and missing x-forwarded-for', async () => {
    const mockHeaders = new Map();
    
    vi.mocked(nextHeaders.headers).mockResolvedValue(mockHeaders as any);
    vi.mocked(nextServer.userAgent).mockReturnValue({
      ua: 'Mobile Safari',
      device: { type: 'mobile' },
    } as any);

    const result = await getUserAgent();
    expect(result.ip).toBe('127.0.0.1');
    expect(result.deviceType).toBe('mobile');
    expect(result.userAgent).toBe('Mobile Safari');
  });
});
