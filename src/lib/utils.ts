/**
 * Generates an opaque, traceable ID for a user.
 * Format: [Random6]-[Sequence]
 */
export function generateTraceableId(sequence: number) {
  // Start sequence can be adjusted. 
  // If the user says "653+", we ensure the sequence part starts there.
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${randomPart}-${sequence.toString().padStart(3, '0')}`;
}
