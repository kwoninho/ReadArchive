export const BOOK_WITH_CATEGORIES_SELECT = `
  *,
  book_categories (
    categories (
      id,
      name
    )
  )
`;
