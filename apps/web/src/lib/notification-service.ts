import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Create an in-app notification and optionally send a push.
 * Call this from the frontend when an event happens (sale, expense, etc.)
 */
export async function createNotification({
  userId,
  commerceId,
  type,
  title,
  body,
  route,
  data = {},
  sendPush = true,
}: {
  userId: string;
  commerceId?: string;
  type: string;
  title: string;
  body: string;
  route?: string;
  data?: Json;
  sendPush?: boolean;
}) {
  // Insert in-app notification
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    commerce_id: commerceId || null,
    type,
    title,
    body,
    route: route || null,
    data,
  });

  if (error) {
    console.error('[Notification] Insert failed:', error);
    return false;
  }

  // Send push notification via edge function
  if (sendPush) {
    try {
      const spreadable =
        data !== undefined &&
        typeof data === 'object' &&
        data !== null &&
        !Array.isArray(data)
          ? (data as Record<string, Json>)
          : ({} as Record<string, Json>);
      await supabase.functions.invoke('send-push', {
        body: {
          user_id: userId,
          title,
          body,
          data: { type, route: route || '', ...spreadable },
        },
      });
    } catch (err) {
      console.error('[Notification] Push send failed:', err);
    }
  }

  return true;
}

/**
 * Notification templates for common events
 */
export const NotificationTemplates = {
  sale: (amount: number, manager: string, commerceId: string) => ({
    type: 'sale',
    title: 'Nouvelle vente',
    body: `Une vente de ${amount.toLocaleString()} FCFA a été enregistrée par ${manager}`,
    route: '/app/factures',
    data: { commerce_id: commerceId },
    commerceId,
  }),

  expense: (title: string, amount: number, commerceId: string) => ({
    type: 'expense',
    title: 'Dépense ajoutée',
    body: `${title} — ${amount.toLocaleString()} FCFA`,
    route: '/app/depenses',
    data: { commerce_id: commerceId },
    commerceId,
  }),

  stockAlert: (productName: string, stock: number, commerceId: string) => ({
    type: 'stock_alert',
    title: 'Stock faible',
    body: `Le produit "${productName}" est presque en rupture (${stock} restants)`,
    route: '/app/produits',
    data: { commerce_id: commerceId },
    commerceId,
  }),

  newMessage: (senderName: string) => ({
    type: 'message',
    title: 'Nouveau message',
    body: `Vous avez reçu un message de ${senderName}`,
    route: '/app/messages',
  }),

  managerCreated: (managerName: string, commerceId: string) => ({
    type: 'manager',
    title: 'Nouveau gérant',
    body: `${managerName} a été ajouté comme gérant`,
    route: '/app/gerants',
    data: { commerce_id: commerceId },
    commerceId,
  }),

  subscriptionExpiring: (daysLeft: number) => ({
    type: 'subscription',
    title: 'Abonnement bientôt expiré',
    body: `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
    route: '/app/abonnements',
  }),

  subscriptionExpired: () => ({
    type: 'subscription',
    title: 'Abonnement expiré',
    body: 'Passez à une formule pour continuer à utiliser toutes les fonctionnalités.',
    route: '/app/abonnements',
  }),

  securityAlert: (action: string) => ({
    type: 'security',
    title: 'Alerte sécurité',
    body: action,
    route: '/app/parametres',
  }),
};
