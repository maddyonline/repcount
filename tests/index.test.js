import { countReps } from '../src'
import frames from './data/frames.json'

describe('Test countReps', () => {
  it('should count reps correctly', () => {
    const { count } = countReps(frames);
    expect(count).toBe(24);
  });
});
