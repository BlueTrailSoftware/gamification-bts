import { Technology } from '../Technology';

describe('Technology Entity', () => {
  describe('create', () => {
    it('should create a technology with all required fields', () => {
      const tech = Technology.create({
        id: '123',
        name: 'JavaScript',
        categoryId: 'cat-1',
        categoryName: 'Programming',
      });

      expect(tech.id).toBe('123');
      expect(tech.name).toBe('JavaScript');
      expect(tech.categoryId).toBe('cat-1');
      expect(tech.categoryName).toBe('Programming');
      expect(tech.createdAt).toBeInstanceOf(Date);
    });

    it('should trim whitespace from name and category', () => {
      const tech = Technology.create({
        id: '456',
        name: '  TypeScript  ',
        categoryId: '  cat-2  ',
        categoryName: '  Frontend  ',
      });

      expect(tech.name).toBe('TypeScript');
      expect(tech.categoryId).toBe('cat-2');
      expect(tech.categoryName).toBe('Frontend');
    });

    it('should create a technology with custom timestamp', () => {
      const createdAt = new Date('2024-01-01');
      const tech = Technology.create({
        id: '789',
        name: 'React',
        categoryId: 'cat-3',
        categoryName: 'Framework',
        createdAt,
      });

      expect(tech.createdAt).toBe(createdAt);
    });

    it('should throw error when name is empty', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: '',
          categoryId: 'cat-1',
        });
      }).toThrow('Technology name is required');
    });

    it('should throw error when name is only whitespace', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: '   ',
          categoryId: 'cat-1',
        });
      }).toThrow('Technology name is required');
    });

    it('should throw error when categoryId is empty', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: 'JavaScript',
          categoryId: '',
        });
      }).toThrow('Technology category is required');
    });

    it('should throw error when categoryId is only whitespace', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: 'JavaScript',
          categoryId: '   ',
        });
      }).toThrow('Technology category is required');
    });
  });

  describe('toJSON', () => {
    it('should serialize technology to JSON', () => {
      const tech = Technology.create({
        id: '123',
        name: 'JavaScript',
        categoryId: 'cat-1',
        categoryName: 'Programming',
      });

      const json = tech.toJSON();

      expect(json).toEqual({
        id: '123',
        name: 'JavaScript',
        categoryId: 'cat-1',
        categoryName: 'Programming',
        createdAt: expect.any(String),
      });
    });
  });
});
