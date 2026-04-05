import { initDb, closeDb } from '../db/database';
import { createApp } from '../app';
import { Application } from 'express';

export function setupTestApp(): Application {
  // Use in-memory SQLite for tests
  initDb(':memory:');
  return createApp();
}

export function teardownTestApp(): void {
  closeDb();
}