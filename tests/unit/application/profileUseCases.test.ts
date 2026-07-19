import { describe, expect, it, vi } from 'vitest';

import { ProfileUseCases, type ProfileDataPort } from '@/application/profile';

describe('ProfileUseCases', () => {
  it('delegates profile and body-weight commands through the persistence port', async () => {
    const port: ProfileDataPort = {
      getProfile: vi.fn(() => Promise.resolve(undefined)),
      upsertProfile: vi.fn(() => Promise.resolve('profile-id')),
      getRegulationProfile: vi.fn(() => Promise.resolve(undefined)),
      upsertRegulationProfile: vi.fn(() => Promise.resolve('regulation-id')),
      getLatestBodyWeight: vi.fn(() => Promise.resolve(undefined)),
      getBodyWeightRecords: vi.fn(() => Promise.resolve([])),
      addBodyWeightRecord: vi.fn(() => Promise.resolve('weight-id')),
      updateBodyWeightRecord: vi.fn(() => Promise.resolve(1)),
      deleteBodyWeightRecord: vi.fn(() => Promise.resolve()),
    };
    const useCases = new ProfileUseCases(port);
    const profile = { id: 'profile-id', name: 'Ada', gender: 'undisclosed' as const, createdAt: new Date(), updatedAt: new Date() };
    const record = { id: 'weight-id', weight: 70, recordedAt: new Date() };

    await expect(useCases.upsertProfile(profile)).resolves.toBe('profile-id');
    await expect(useCases.addBodyWeightRecord(record)).resolves.toBe('weight-id');
    await expect(useCases.updateBodyWeightRecord(record.id, { weight: 71 })).resolves.toBe(1);
    await expect(useCases.deleteBodyWeightRecord(record.id)).resolves.toBeUndefined();

    expect(port.upsertProfile).toHaveBeenCalledWith(profile);
    expect(port.addBodyWeightRecord).toHaveBeenCalledWith(record);
    expect(port.updateBodyWeightRecord).toHaveBeenCalledWith(record.id, { weight: 71 });
    expect(port.deleteBodyWeightRecord).toHaveBeenCalledWith(record.id);
  });
});
