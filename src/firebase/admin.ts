// import admin from "firebase-admin";

// export const tokens = new Set<string>();

// export const saveToken = (token: string): void => {
//   if (token && !tokens.has(token)) {
//     tokens.add(token);
//     console.log('Saved token:', token);
//   }
// };

// export const removeToken = (token: string): void => {
//   if (tokens.has(token)) {
//     tokens.delete(token);
//     console.log('Removed token:', token);
//   }
// };

// export const sendNotification = async (payload: {
//   title: string;
//   body: string;
//   imageUrl?: string;
//   url?: string;
// }) => {
//   try {
//     if (tokens.size === 0) {
//       throw new Error('No FCM tokens available');
//     }

//     const messages = Array.from(tokens).map(token => ({
//       token,
//       data: {
//         title: payload.title,
//         body: payload.body,
//         imageUrl: payload.imageUrl || '',
//         url: payload.url || '',
//       },
//     }));

//     const results = await Promise.allSettled(
//       messages.map(msg => admin.messaging().send(msg))
//     );

//     const successes = results
//       .filter(r => r.status === 'fulfilled')
//       .map(r => (r as PromiseFulfilledResult<string>).value);

//     const failures = results
//       .filter(r => r.status === 'rejected')
//       .map(r => (r as PromiseRejectedResult).reason);

//     return { successes, failures };

//   } catch (error: any) {
//     console.error('Error in sendNotification:', error.message || error);
//     throw new Error(error.message || 'Failed to send notifications');
//   }
// };


// ../firebase/admin.js

import admin from 'firebase-admin';
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize firebase admin SDK once somewhere in your app
// Make sure to pass serviceAccount from env variables as you already do


// `tokens` can be a single token (string) or array of tokens
export async function sendNotification(tokens: string | string[], payload: {
  title: string,
  body: string,
  click_action?: string,
  data?: Record<string, string>
}) {
  const messageBase = {
    notification: {
      title: payload.title || 'Notification',
      body: payload.body || '',
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        icon: '/icon.png',
        click_action: payload.click_action || '/',
      },
    },
    data: payload.data || {}, // Optional custom data
  };

  try {
    // Single user notification
    if (typeof tokens === 'string') {
      const response = await admin.messaging().send({
        ...messageBase,
        token: tokens,
      });
      console.log('Single notification sent:', response);
      return response;
    }

    // Broadcast notification to multiple users
    if (Array.isArray(tokens) && tokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        ...messageBase,
        tokens,
      });
      console.log('Multicast notification sent:', response);
      return response;
    }

    throw new Error('No valid tokens provided.');
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}





// import webPush, { PushSubscription } from 'web-push';
// import dotenv from 'dotenv';

// dotenv.config();

// interface SubscriptionPayload {
//   userId: string;
//   subscription: PushSubscription;
// }

// // Set your VAPID keys (use dotenv in prod)


// webPush.setVapidDetails(
//   'mailto:mayurbhoi200@gmail.com',  // corrected email here
//   process.env.VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// );

// export const sendNotification = async (
//   subscription: PushSubscription,
//   payload: {
//     title: string;
//     body: string;
//     imageUrl?: string;
//     url?: string;
//   }
// ) => {
//   try {
//     const notificationPayload = JSON.stringify(payload);
//     await webPush.sendNotification(subscription, notificationPayload);
//   } catch (error: any) {
//     const errorMessage = error?.message || JSON.stringify(error) || 'Unknown error';
//     console.error('Error sending push notification:', errorMessage);
//     // throw new Error(errorMessage); // wrap to ensure it's always an Error instance
//   }
// };



