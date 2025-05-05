
import { useEffect, useState } from 'react';
import supabase from '@/supabase/supabaseClient';

export function useRealtime<T>(
  table: string,
  filter?: {
    column?: string;
    value?: string | number;
    user_id?: string;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    // Initial data fetch
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select('*');
        
        if (filter?.column && filter?.value !== undefined) {
          query = query.eq(filter.column, filter.value);
        }
        
        if (filter?.user_id) {
          query = query.eq('user_id', filter.user_id);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter?.column && filter?.value
          ? `${filter.column}=eq.${filter.value}`
          : undefined
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setData((currentData) => [...currentData, payload.new as T]);
        } else if (payload.eventType === 'UPDATE') {
          setData((currentData) =>
            currentData.map((item: any) =>
              item.id === payload.new.id ? payload.new : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setData((currentData) =>
            currentData.filter((item: any) => item.id !== payload.old.id)
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value, filter?.user_id]);

  return { data, loading, error };
}
