export interface TechnologyProps {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
}

export class Technology {
  private constructor(private props: TechnologyProps) {}

  static create(params: {
    id: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    createdAt?: Date;
  }): Technology {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Technology name is required');
    }
    if (!params.categoryId || params.categoryId.trim().length === 0) {
      throw new Error('Technology category is required');
    }

    return new Technology({
      id: params.id,
      name: params.name.trim(),
      categoryId: params.categoryId.trim(),
      categoryName: params.categoryName?.trim() ?? '',
      createdAt: params.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  /**
   * Display-only category name, resolved by the repository join.
   */
  get categoryName(): string {
    return this.props.categoryName;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      categoryId: this.props.categoryId,
      categoryName: this.props.categoryName,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
