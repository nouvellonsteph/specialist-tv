import { CloudflareEnv } from '../types';

export interface Migration {
  id: string;
  name: string;
  sql: string;
  applied_at?: string;
}

export class MigrationManager {
  constructor(private env: CloudflareEnv) {}

  /**
   * Initialize the migrations table
   */
  async initializeMigrationsTable(): Promise<void> {
    await this.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    await this.initializeMigrationsTable();
    
    const result = await this.env.DB.prepare(`
      SELECT id FROM migrations ORDER BY applied_at ASC
    `).all();

    return result.results.map(row => (row as { id: string }).id);
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration: ${migration.id} - ${migration.name}`);
    
    try {
      // Execute the migration SQL
      await this.env.DB.exec(migration.sql);
      
      // Record that this migration was applied
      await this.env.DB.prepare(`
        INSERT INTO migrations (id, name) VALUES (?, ?)
      `).bind(migration.id, migration.name).run();
      
      console.log(`Migration ${migration.id} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if a migration has been applied
   */
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    await this.initializeMigrationsTable();
    
    const result = await this.env.DB.prepare(`
      SELECT id FROM migrations WHERE id = ?
    `).bind(migrationId).first();

    return !!result;
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Define available migrations
    const availableMigrations: Migration[] = [
      {
        id: '001_add_video_logs',
        name: 'Add video_logs table for tracking processing events',
        sql: `
          -- Video logs table - for tracking processing events and debugging
          CREATE TABLE IF NOT EXISTS video_logs (
              id TEXT PRIMARY KEY,
              video_id TEXT NOT NULL,
              level TEXT NOT NULL, -- info, warning, error, debug
              event_type TEXT NOT NULL, -- upload, transcription, tagging, chapters, webhook, etc.
              message TEXT NOT NULL,
              details TEXT, -- JSON string with additional context
              duration_ms INTEGER, -- processing time in milliseconds
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
          );

          -- Indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_video_logs_video_id ON video_logs(video_id);
          CREATE INDEX IF NOT EXISTS idx_video_logs_created_at ON video_logs(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_video_logs_level ON video_logs(level);
          CREATE INDEX IF NOT EXISTS idx_video_logs_event_type ON video_logs(event_type);
        `
      }
    ];

    // Apply pending migrations
    for (const migration of availableMigrations) {
      if (!appliedMigrations.includes(migration.id)) {
        await this.applyMigration(migration);
      } else {
        console.log(`Migration ${migration.id} already applied, skipping`);
      }
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{ applied: string[]; pending: string[] }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = ['001_add_video_logs']; // Add new migration IDs here
    
    const pending = allMigrations.filter(id => !appliedMigrations.includes(id));
    
    return {
      applied: appliedMigrations,
      pending
    };
  }
}
