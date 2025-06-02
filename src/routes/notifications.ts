// import { Router, Request, Response } from 'express';
// import { sendNotification } from '../firebase/admin.js';
// import { PushSubscription } from 'web-push';

// const router = Router();

// // In-memory token store — replace with DB if needed
// const subscriptions = new Map<string, PushSubscription>(); // key = userId
// // const subscriptions = new Map<string, PushSubscription>();

// router.post('/send-notification', async (req: Request, res: Response) => {
//   try {
//     const payload = req.body;

//     console.log("subscriptions", subscriptions)

//     const results = await Promise.allSettled(
//       Array.from(subscriptions.values()).map(subscription =>
//         sendNotification(subscription as PushSubscription, payload)
//       )
//     );

//     const successes = results.filter(r => r.status === 'fulfilled');
//     const failures = results.filter(r => r.status === 'rejected');

//     res.json({
//       success: true,
//       sent: successes.length,
//       failed: failures.length,
//       errors: failures.map(f => (f as PromiseRejectedResult).reason?.message || 'Unknown error'),
//     });
//   } catch (error: any) {
//     console.error('Error in /send-notification:', error);
//     res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
//   }
// });


import { Router, Request, Response } from 'express';
// import { sendNotification } from '../firebase/admin.js'; // this expects FCM token string
import admin from 'firebase-admin';
import { UserModel } from '../models/user.model.js'; // Make sure this path is correct
const router = Router();



// Type for payload input
interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  url?: string;
  click_action?: string;
  tokens?: string[];       // for multicast
  token?: string;          // for single device
  topic?: string;          // for broadcast
  data?: Record<string, string>; // additional custom data
}

// Unified Notification Sender
export const sendNotification = async (payload: NotificationPayload) => {
  const notification = {
    title: payload.title,
    body: payload.body,
    image: payload.imageUrl || undefined,
  };

  const dataPayload = {
    url: payload.url || '/',
    click_action: payload.click_action || payload.url || '/',
    title: payload.title,
    body: payload.body,
    imageUrl: payload.imageUrl || '',
    ...(payload.data || {}),
  };

  const webpushOptions = {
    headers: { Urgency: 'high' },
    notification: {
      icon: payload.imageUrl || '',
      click_action: payload.click_action || payload.url || '/',
    },
  };

  const baseMessage = {
    notification,
    data: dataPayload,
    webpush: webpushOptions,
  };

  try {
    // 1. Single device
    if (payload.token) {
      const message = { token: payload.token, ...baseMessage };
      const response = await admin.messaging().send(message);
      return { success: true, type: 'single', response };
    }

    // 2. Multiple devices (manual send loop)
    if (payload.tokens && payload.tokens.length > 0) {
      const responses = await Promise.all(
        payload.tokens.map(async (token) => {
          try {
            const message = { token, ...baseMessage };
            const res = await admin.messaging().send(message);
            return { success: true, token, response: res };
          } catch (error: any) {
            return { success: false, token, error };
          }
        })
      );

      const invalidTokens: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      responses.forEach((resp) => {
        if (resp.success) {
          successCount++;
        } else {
          failureCount++;
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(resp.token);
          }
        }
      });

      // Remove invalid tokens from DB
      if (invalidTokens.length > 0) {
        try {
          await UserModel.updateMany(
            {},
            { $pull: { fcmTokens: { $in: invalidTokens } } }
          );
        } catch (error) {

        }

        console.log(`Cleaned ${invalidTokens.length} invalid tokens from DB.`);
      }

      return {
        success: true,
        type: 'manual-multicast',
        successCount,
        failureCount,
        invalidTokens,
        responses,
      };
    }

    // 3. Topic broadcast
    if (payload.topic) {
      const message = { topic: payload.topic, ...baseMessage };
      const response = await admin.messaging().send(message);
      return { success: true, type: 'topic', response };
    }

    throw new Error('No valid target provided (token, tokens[], or topic)');
  } catch (error: any) {
    console.error('FCM send error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};


// Store FCM tokens by userId
// const tokens = new Map<string, string>();

router.post('/send-notification', async (req: Request<{}, {}, NotificationPayload>, res: Response) => {
  try {
    const payload = req.body;

    // Get all FCM tokens from the database
    const users = await UserModel.find({ fcmTokens: { $exists: true, $ne: [] } }, 'fcmTokens');
    const tokens: string[] = users.flatMap(user => user.fcmTokens || []);

    if (!tokens.length) {
      res.status(400).json({
        success: false,
        message: 'No FCM tokens found',
      });
      return
    }


    const result = await sendNotification({
      ...payload,
      tokens,
    });

    res.json({
      success: result.success,
      type: result.type,
      // sent: result.successCount || 0,
      // failed: result.failureCount || 0,
      // errors: result.responses?.filter(r => !r.success).map(r => r.error?.message) || [],
    });
    return
  } catch (error: any) {
    console.error('Notification send error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
});




router.post('/save-subscription', async (req: Request, res: Response) => {
  try {
    const { userId, fcmToken } = req.body;


    console.log("userId, fcmToken", userId, fcmToken)

    if (!userId || !fcmToken) {
      res.status(400).json({ error: 'userId and fcmToken are required' });
      return;
    }

    await UserModel.updateFcmTokens(userId, fcmToken);

    // tokens.set(userId, fcmToken);

    console.log('Saved FCM token for user:', userId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving token:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

export default router;




// router.post('/save-subscription', (req: Request, res: Response) => {
//   try {
//     const subscription = req.body as PushSubscription;
//     console.log("subscription", subscription)

//     if (
//       !subscription ||
//       !subscription.endpoint ||
//       !subscription.keys ||
//       !subscription.keys.p256dh ||
//       !subscription.keys.auth
//     ) {
//       res.status(400).json({ error: 'Invalid Push Subscription' });
//       return
//     }

//     subscriptions.set(subscription.endpoint, subscription);

//     console.log('Saved subscription:', subscription.endpoint);

//     res.json({ success: true });
//   } catch (error: any) {
//     console.error('Error saving subscription:', error);
//     res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
//   }
// });







// Save token
// router.post('/save-subscription', (req: Request, res: Response) => {
//   const { token } = req.body;
//   if (!token) {
//     res.status(400).json({ error: 'Token is required' });
//     return;
//   }

//   tokens.add(token);
//   console.log('Saved token:', token);
//   res.json({ success: true });
// });

// Remove token (unsubscribe)
// router.post('/remove-subscription', (req: Request, res: Response) => {
//   const { token } = req.body;

//   console.log("token", token)
//   if (!token) {
//     res.status(400).json({ error: 'Token is required' });
//     return;
//   }

//   if (tokens.has(token)) {
//     tokens.delete(token);
//     console.log('Removed token:', token);
//     res.json({ success: true });
//     return;
//   } else {
//     res.status(404).json({ error: 'Token not found' });
//     return;
//   }
// });

// Send notification to all saved tokens

