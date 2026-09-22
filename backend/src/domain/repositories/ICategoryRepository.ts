import { Category } from '../entities/Category';

/**
 * Repository interface for Category entity
 * Requirements: 4.1
 */
export interface ICategoryRepository {
  listAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
}
