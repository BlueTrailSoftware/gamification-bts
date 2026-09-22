import { getDatabasePool } from '../connection';
import { Category } from '../../../domain/entities/Category';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';

/**
 * PostgreSQL implementation of CategoryRepository
 * Requirements: 4.1
 */
export class CategoryRepository implements ICategoryRepository {
  async listAll(): Promise<Category[]> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM categories ORDER BY name ASC';
    const result = await pool.query(query);

    return result.rows.map(row => this.mapRowToCategory(row));
  }

  async findById(id: string): Promise<Category | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result.rows[0]);
  }

  async findByName(name: string): Promise<Category | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM categories WHERE name = $1';
    const result = await pool.query(query, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result.rows[0]);
  }

  private mapRowToCategory(row: any): Category {
    return Category.create({
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at)
    });
  }
}
