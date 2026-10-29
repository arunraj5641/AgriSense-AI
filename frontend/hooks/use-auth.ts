'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, ApiError } from '@/lib/api';
import type { Farm } from '@/types';

export function useAuth() {
  const router = useRouter();

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }, []);

  const isAuthenticated = useCallback((): boolean => {
    return !!getToken();
  }, [getToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    router.push('/');
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return { getToken, isAuthenticated, logout };
}

export function useFarms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi('/farms');
      setFarms(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load farms';
      if ((err instanceof ApiError && err.status === 401) || message.includes('401') || message.includes('Unauthorized')) {
        router.push('/login');
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadFarms);
  }, [loadFarms]);

  return { farms, loading, error, loadFarms };
}
