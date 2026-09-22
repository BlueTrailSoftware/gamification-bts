export interface CategoryProps {
  id: string;
  name: string;
  createdAt: Date;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(params: {
    id: string;
    name: string;
    createdAt?: Date;
  }): Category {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    return new Category({
      id: params.id,
      name: params.name.trim(),
      createdAt: params.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
