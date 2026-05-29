/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Registration {
  id: string;
  name: string;
  phone: string;
  date: string;
  timeSlot: string;
  guests: number;
  timestamp: string;
}

export interface AppStatus {
  isPaused: boolean;
  counts: Record<string, Record<string, number>>;
  limits: Record<string, Record<string, number>>;
}
