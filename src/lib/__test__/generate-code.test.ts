import { describe, it, expect, vi } from 'vitest';
import { GenerateCode } from '../generate-code';

describe('GenerateCode', () => {
  it('should generate code with default params', () => {
    const code = GenerateCode();
    expect(code).toBeDefined();
    expect(code?.length).toBe(7);
    expect(/^[A-Z0-9]+$/.test(code as string)).toBe(true);
  });

  it('should generate lowercase code', () => {
    const code = GenerateCode({ length: 8, mode: 'LOWER' });
    expect(code?.length).toBe(8);
    expect(/^[a-z0-9]+$/.test(code as string)).toBe(true);
  });

  it('should generate mixed case code', () => {
    const code = GenerateCode({ length: 10, mode: 'MIXED' });
    expect(code?.length).toBe(10);
  });

  it('should catch schema validation errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = GenerateCode({ length: 2 }); // below min 6
    expect(code).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
