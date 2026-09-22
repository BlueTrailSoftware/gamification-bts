import { getDatabasePool } from '../connection';
import { Technology } from '../../../domain/entities/Technology';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';

const SELECT_TECHNOLOGY = `
  SELECT t.id, t.name, t.category_id, t.created_at, c.name AS category_name
  FROM technologies t
  JOIN categories c ON t.category_id = c.id
`;

/**
 * PostgreSQL implementation of TechnologyRepository
 * Requirements: 4.1
 */
export class TechnologyRepository implements ITechnologyRepository {
  async create(technology: Technology): Promise<Technology> {
    const pool = getDatabasePool();
    const query = `
      WITH inserted AS (
        INSERT INTO technologies (id, name, category_id, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      )
      SELECT t.id, t.name, t.category_id, t.created_at, c.name AS category_name
      FROM inserted t
      JOIN categories c ON t.category_id = c.id
    `;

    const values = [
      technology.id,
      technology.name,
      technology.categoryId,
      technology.createdAt
    ];

    const result = await pool.query(query, values);
    return this.mapRowToTechnology(result.rows[0]);
  }

  async findById(id: string): Promise<Technology | null> {
    const pool = getDatabasePool();
    const query = `${SELECT_TECHNOLOGY} WHERE t.id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTechnology(result.rows[0]);
  }

  async findByName(name: string): Promise<Technology | null> {
    const pool = getDatabasePool();
    const query = `${SELECT_TECHNOLOGY} WHERE t.name = $1`;
    const result = await pool.query(query, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTechnology(result.rows[0]);
  }

  async listAll(): Promise<Technology[]> {
    const pool = getDatabasePool();
    const query = `${SELECT_TECHNOLOGY} ORDER BY t.name ASC`;
    const result = await pool.query(query);

    return result.rows.map(row => this.mapRowToTechnology(row));
  }

  async update(id: string, updates: Partial<Omit<Technology, 'id' | 'createdAt'>>): Promise<Technology> {
    const pool = getDatabasePool();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.categoryId !== undefined) {
      setClauses.push(`category_id = $${paramIndex++}`);
      values.push(updates.categoryId);
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const query = `
      WITH updated AS (
        UPDATE technologies
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      )
      SELECT t.id, t.name, t.category_id, t.created_at, c.name AS category_name
      FROM updated t
      JOIN categories c ON t.category_id = c.id
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Technology with id ${id} not found`);
    }

    return this.mapRowToTechnology(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM technologies WHERE id = $1';
    await pool.query(query, [id]);
  }

  private mapRowToTechnology(row: any): Technology {
    return Technology.create({
      id: row.id,
      name: row.name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      createdAt: new Date(row.created_at)
    });
  }
}
