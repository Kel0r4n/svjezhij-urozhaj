import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const CategoriesContext = createContext({ categories: [], labels: {}, colors: {}, loading: true });

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const labels = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
  const colors = Object.fromEntries(categories.map((c) => [c.slug, c.chart_color]));

  return (
    <CategoriesContext.Provider value={{ categories, labels, colors, loading, refresh: () => api.getCategories().then(setCategories) }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);
