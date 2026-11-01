import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { API } from './api';
import { useCart } from './cart';
import { confirm, useToast } from './ui';
import type { Dish } from './types';

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: API.meta, staleTime: 3600_000 });
export const useAddresses = () => useQuery({ queryKey: ['addresses'], queryFn: API.addresses });

export function useFavorites() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['favorites'], queryFn: API.favorites });
  const dishIds = new Set((q.data || []).map((f) => f.dish?.id).filter(Boolean) as string[]);
  const cookIds = new Set((q.data || []).map((f) => f.cook?.id).filter(Boolean) as string[]);
  const toggle = useMutation({ mutationFn: API.toggleFavorite, onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }) });
  return { ...q, dishIds, cookIds, toggle: (b: { dishId?: string; cookId?: string }) => toggle.mutate(b) };
}

/** Adds a dish to the cart, asking before replacing another kitchen's items. */
export function useAddToCart() {
  const cart = useCart();
  const toast = useToast();
  return async (d: Dish & { cook?: { id: string; displayName: string } }, qty = 1) => {
    const cook = { id: d.cookId, name: d.cook?.displayName || 'Kitchen' };
    const line = { dishId: d.id, name: d.name, price: d.price };
    if (cart.add(cook, line, qty) === 'other-cook') {
      const ok = await confirm('Start a new cart?', `Your cart has food from ${cart.cookName}. One order comes from one kitchen so it arrives together.`, 'Start new cart');
      if (!ok) return;
      cart.replaceWith(cook, line, qty);
    }
    toast(`Added ${qty} × ${d.name}`);
  };
}

export const goCart = () => router.push('/cart');
