import { getDatabasePool } from '../connection';
import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { TrainingFile } from '../../../domain/entities/TrainingFile';
import { TrainingHours } from '../../../domain/value-objects/TrainingHours';
import {
  ITrainingRecordRepository,
  SearchCriteria,
  BrowseCriteria,
  BrowseRecord,
} from '../../../domain/repositories/ITrainingRecordRepository';

/**
 * Date-range filters target the date the training was actually completed.
 * Records saved without a completion date fall back to their creation date so
 * they never drop out of every range.
 */
const EFFECTIVE_DATE_SQL = 'COALESCE(tr.completion_date, tr.created_at::date)';

/**
 * Binds a range boundary as a calendar day (YYYY-MM-DD) instead of a timestamp,
 * keeping both ends of the range inclusive regardless of the server timezone.
 */
function toDateParam(value: Date): string {
  return value.toISOString().split('T')[0];
}

/**
 * PostgreSQL implementation of TrainingRecordRepository
 * Requirements: 4.1, 5.4
 */
export class TrainingRecordRepository implements ITrainingRecordRepository {
  async create(record: TrainingRecord): Promise<TrainingRecord> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO training_records (id, user_id, technology_id, title, description, hours, completion_date, study_platform, training_link, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      record.id,
      record.userId,
      record.technologyId,
      record.title,
      record.description,
      record.hours.getValue(),
      record.completionDate,
      record.studyPlatform,
      record.trainingLink,
      record.createdAt,
      record.updatedAt,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToTrainingRecord(result.rows[0]);
  }

  async findById(id: string): Promise<TrainingRecord | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM training_records WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTrainingRecord(result.rows[0]);
  }

  async update(
    id: string,
    updates: Partial<Omit<TrainingRecord, 'id' | 'createdAt'>>
  ): Promise<TrainingRecord> {
    const pool = getDatabasePool();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.technologyId !== undefined) {
      setClauses.push(`technology_id = $${paramIndex++}`);
      values.push(updates.technologyId);
    }

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.hours !== undefined) {
      setClauses.push(`hours = $${paramIndex++}`);
      values.push(
        (updates.hours as any).getValue ? (updates.hours as any).getValue() : updates.hours
      );
    }

    if ((updates as any).completedDate !== undefined) {
      setClauses.push(`completed_date = $${paramIndex++}`);
      values.push((updates as any).completedDate);
    }

    if ((updates as any).completionDate !== undefined) {
      setClauses.push(`completion_date = $${paramIndex++}`);
      values.push((updates as any).completionDate);
    }

    if ((updates as any).studyPlatform !== undefined) {
      setClauses.push(`study_platform = $${paramIndex++}`);
      values.push((updates as any).studyPlatform);
    }

    if ((updates as any).trainingLink !== undefined) {
      setClauses.push(`training_link = $${paramIndex++}`);
      values.push((updates as any).trainingLink);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE training_records
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Training record with id ${id} not found`);
    }

    return this.mapRowToTrainingRecord(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM training_records WHERE id = $1';
    await pool.query(query, [id]);
  }

  async findByUserId(userId: string): Promise<TrainingRecord[]> {
    const pool = getDatabasePool();
    // Join with training_files to get files for each record
    const query = `
      SELECT tr.*, tf.id as file_id, tf.training_record_id as file_training_record_id,
             tf.original_filename, tf.stored_filename, tf.file_size, tf.mime_type, tf.uploaded_at
      FROM training_records tr
      LEFT JOIN training_files tf ON tr.id = tf.training_record_id
      WHERE tr.user_id = $1
      ORDER BY tr.created_at DESC
    `;
    const result = await pool.query(query, [userId]);

    // Aggregate files by training record
    const recordsMap = new Map<string, TrainingRecord>();
    const filesMap = new Map<string, TrainingFile[]>();

    for (const row of result.rows) {
      const recordId = row.id;

      if (!recordsMap.has(recordId)) {
        recordsMap.set(
          recordId,
          TrainingRecord.create({
            id: recordId,
            userId: row.user_id,
            technologyId: row.technology_id,
            title: row.title,
            description: row.description,
            hours: new TrainingHours(parseFloat(row.hours)),
            completedDate: row.completed_date ? new Date(row.completed_date) : null,
            completionDate:
              row.completion_date != null
                ? row.completion_date instanceof Date
                  ? row.completion_date.toISOString().split('T')[0]
                  : String(row.completion_date)
                : null,
            studyPlatform: row.study_platform ?? null,
            trainingLink: row.training_link ?? null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            files: [],
          })
        );
        filesMap.set(recordId, []);
      }

      // Add file if exists
      if (row.file_id) {
        const files = filesMap.get(recordId)!;
        files.push(
          TrainingFile.create({
            id: row.file_id,
            trainingRecordId: row.file_training_record_id,
            originalFilename: row.original_filename,
            storedFilename: row.stored_filename,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            uploadedAt: new Date(row.uploaded_at),
          })
        );
      }
    }

    // Attach files to records using the addFile method
    for (const [recordId, files] of filesMap) {
      const record = recordsMap.get(recordId)!;
      for (const file of files) {
        record.addFile(file);
      }
    }

    return Array.from(recordsMap.values());
  }

  async search(criteria: SearchCriteria): Promise<TrainingRecord[]> {
    const pool = getDatabasePool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (criteria.searchTerm) {
      conditions.push(`(tr.title ILIKE $${paramIndex} OR tr.description ILIKE $${paramIndex})`);
      values.push(`%${criteria.searchTerm}%`);
      paramIndex++;
    }

    if (criteria.technologyId) {
      conditions.push(`tr.technology_id = $${paramIndex++}`);
      values.push(criteria.technologyId);
    }

    if (criteria.userId) {
      conditions.push(`tr.user_id = $${paramIndex++}`);
      values.push(criteria.userId);
    }

    if (criteria.startDate) {
      conditions.push(`${EFFECTIVE_DATE_SQL} >= $${paramIndex++}::date`);
      values.push(toDateParam(criteria.startDate));
    }

    if (criteria.endDate) {
      conditions.push(`${EFFECTIVE_DATE_SQL} <= $${paramIndex++}::date`);
      values.push(toDateParam(criteria.endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Join with training_files to get files for each record
    const query = `
      SELECT tr.*, tf.id as file_id, tf.training_record_id as file_training_record_id,
             tf.original_filename, tf.stored_filename, tf.file_size, tf.mime_type, tf.uploaded_at
      FROM training_records tr
      LEFT JOIN training_files tf ON tr.id = tf.training_record_id
      ${whereClause}
      ORDER BY tr.created_at DESC
    `;

    const result = await pool.query(query, values);

    // Aggregate files by training record
    const recordsMap = new Map<string, TrainingRecord>();
    const filesMap = new Map<string, TrainingFile[]>();

    for (const row of result.rows) {
      const recordId = row.id;

      if (!recordsMap.has(recordId)) {
        recordsMap.set(
          recordId,
          TrainingRecord.create({
            id: recordId,
            userId: row.user_id,
            technologyId: row.technology_id,
            title: row.title,
            description: row.description,
            hours: new TrainingHours(parseFloat(row.hours)),
            completedDate: row.completed_date ? new Date(row.completed_date) : null,
            completionDate:
              row.completion_date != null
                ? row.completion_date instanceof Date
                  ? row.completion_date.toISOString().split('T')[0]
                  : String(row.completion_date)
                : null,
            studyPlatform: row.study_platform ?? null,
            trainingLink: row.training_link ?? null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            files: [],
          })
        );
        filesMap.set(recordId, []);
      }

      // Add file if exists
      if (row.file_id) {
        const files = filesMap.get(recordId)!;
        files.push(
          TrainingFile.create({
            id: row.file_id,
            trainingRecordId: row.file_training_record_id,
            originalFilename: row.original_filename,
            storedFilename: row.stored_filename,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            uploadedAt: new Date(row.uploaded_at),
          })
        );
      }
    }

    // Attach files to records using the addFile method
    for (const [recordId, files] of filesMap) {
      const record = recordsMap.get(recordId)!;
      for (const file of files) {
        record.addFile(file);
      }
    }

    return Array.from(recordsMap.values());
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<TrainingRecord[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT tr.* FROM training_records tr
      WHERE ${EFFECTIVE_DATE_SQL} >= $1::date AND ${EFFECTIVE_DATE_SQL} <= $2::date
      ORDER BY ${EFFECTIVE_DATE_SQL} DESC
    `;

    const result = await pool.query(query, [toDateParam(startDate), toDateParam(endDate)]);
    return result.rows.map((row) => this.mapRowToTrainingRecord(row));
  }

  async browseAll(criteria: BrowseCriteria): Promise<BrowseRecord[]> {
    const pool = getDatabasePool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (criteria.technologyId) {
      conditions.push(`tr.technology_id = $${paramIndex++}`);
      values.push(criteria.technologyId);
    }

    if (criteria.userId) {
      conditions.push(`tr.user_id = $${paramIndex++}`);
      values.push(criteria.userId);
    }

    if (criteria.startDate) {
      conditions.push(`${EFFECTIVE_DATE_SQL} >= $${paramIndex++}::date`);
      values.push(toDateParam(criteria.startDate));
    }

    if (criteria.endDate) {
      conditions.push(`${EFFECTIVE_DATE_SQL} <= $${paramIndex++}::date`);
      values.push(toDateParam(criteria.endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        tr.id, tr.user_id, tr.technology_id,
        tr.title, tr.description, tr.hours,
        tr.completion_date, tr.study_platform, tr.training_link,
        tr.created_at,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) AS user_display_name,
        t.name AS technology_name
      FROM training_records tr
      JOIN users u ON tr.user_id = u.id
      JOIN technologies t ON tr.technology_id = t.id
      ${whereClause}
      ORDER BY tr.created_at DESC
    `;

    const result = await pool.query(query, values);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userDisplayName: row.user_display_name,
      technologyId: row.technology_id,
      technologyName: row.technology_name,
      title: row.title,
      description: row.description,
      hours: parseFloat(row.hours),
      completionDate:
        row.completion_date != null
          ? row.completion_date instanceof Date
            ? row.completion_date.toISOString().split('T')[0]
            : String(row.completion_date)
          : null,
      studyPlatform: row.study_platform ?? null,
      trainingLink: row.training_link ?? null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  private mapRowToTrainingRecord(row: any): TrainingRecord {
    return TrainingRecord.create({
      id: row.id,
      userId: row.user_id,
      technologyId: row.technology_id,
      title: row.title,
      description: row.description,
      hours: new TrainingHours(parseFloat(row.hours)),
      completedDate: row.completed_date ? new Date(row.completed_date) : null,
      completionDate:
        row.completion_date != null
          ? row.completion_date instanceof Date
            ? row.completion_date.toISOString().split('T')[0]
            : String(row.completion_date)
          : null,
      studyPlatform: row.study_platform ?? null,
      trainingLink: row.training_link ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      files: [],
    });
  }
}
