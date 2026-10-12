import { Category } from "@/database/models/mlCategory";
import { useStreamState } from "@/hooks/useStream";
import { CategoryRepository } from "@/repositories/categories";
import { of } from "@nozbe/watermelondb/utils/rx";

/** Lista reactiva de categorías del usuario (reacciona a cambios de nombre/icono). */
export function useCategories(userId: string): {
  categories: Category[];
  loading: boolean;
} {
  const { data, loading } = useStreamState<Category[]>(
    () =>
      userId
        ? CategoryRepository.buildByUserIdQuery(userId).observeWithColumns(
            CategoryRepository.OBSERVABLE_COLUMNS
          )
        : of<Category[]>([]),
    [],
    [userId]
  );

  return { categories: data, loading };
}
