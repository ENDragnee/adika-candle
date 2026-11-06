import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HashPassword, ValidatePassword } from '../password-utils';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn(),
}));

describe('password-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ROUND_SALT = '10';
  });

  it('should hash password successfully', async () => {
    vi.mocked(bcrypt.genSalt).mockResolvedValue('somesalt' as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashedpassword' as never);

    const result = await HashPassword('mypassword');
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 'somesalt');
    expect(result).toBe('hashedpassword');
  });

  it('should throw error if ROUND_SALT is missing', async () => {
    delete process.env.ROUND_SALT;
    await expect(HashPassword('mypassword')).rejects.toThrow('ROUND_SALT has not been loaded');
  });

  it('should throw error if ROUND_SALT is invalid', async () => {
    process.env.ROUND_SALT = 'invalid';
    await expect(HashPassword('mypassword')).rejects.toThrow('ROUND_SALT has not been loaded');
  });

  it('should validate password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const result = await ValidatePassword('mypassword', 'hashedpassword');
    expect(bcrypt.compare).toHaveBeenCalledWith('mypassword', 'hashedpassword');
    expect(result).toBe(true);
  });
});
