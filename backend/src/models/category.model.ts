import slugify from "slugify";

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const generateCategorySlug = (name: string): string => {
  return slugify(name, { lower: true, strict: true });
};
