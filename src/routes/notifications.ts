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
import { notificationService } from '../services/index.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
const router = Router();



// Type for payload input


export interface NotificationPayload {
  title?: string;
  body?: string;
  imageUrl?: string;
  url?: string;
  click_action?: string;
  data?: Record<string, any>;
  token?: string;
  tokens?: string[];
  topic?: string;
}

export const sendNotification = async (payload: NotificationPayload) => {
  const {
    title = '🔔 New Notification',
    body = 'You have a new message.',
    imageUrl = '',
    url = '/',
    click_action,
    data = {},
    token,
    tokens,
    topic,
  } = payload;

  const targetUrl = click_action || url;

  const notification = { title, body, image: imageUrl };
  const dataPayload = {
    title,
    body,
    imageUrl,
    url,
    click_action: targetUrl,
    ...data,
  };

  const webpushOptions = {
    headers: { Urgency: 'high' },
    notification: {
      icon: imageUrl,
      click_action: targetUrl,
    },
  };

  const baseMessage = {
    notification,
    data: dataPayload,
    webpush: webpushOptions,
  };

  try {
    // Send to single token
    if (token) {
      const message = { token, ...baseMessage };
      const response = await admin.messaging().send(message);
      return { success: true, type: 'single', response };
    }

    // Send to multiple tokens manually
    if (Array.isArray(tokens) && tokens.length > 0) {
      const responses = await Promise.all(tokens.map(async (tkn) => {
        try {
          const message = { token: tkn, ...baseMessage };
          const res = await admin.messaging().send(message);
          return { success: true, token: tkn, response: res };
        } catch (error: any) {
          return { success: false, token: tkn, error };
        }
      }));

      const invalidTokens: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      responses.forEach(resp => {
        if (resp.success) {
          successCount++;
        } else {
          failureCount++;
          const code = resp.error?.code;
          if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(code)) {
            invalidTokens.push(resp.token);
          }
        }
      });

      // Remove invalid tokens from DB
      if (invalidTokens.length) {
        await UserModel.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } });
        console.log(`Removed ${invalidTokens.length} invalid tokens`);
      }

      return {
        success: true,
        type: 'multicast',
        successCount,
        failureCount,
        invalidTokens,
        responses,
      };
    }

    // Send to topic
    if (topic) {
      const message = { topic, ...baseMessage };
      const response = await admin.messaging().send(message);
      return { success: true, type: 'topic', response };
    }

    throw new Error('No valid recipient provided: token, tokens[], or topic');
  } catch (error: any) {
    console.error('Notification send error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during notification send',
    };
  }
};



// Store FCM tokens by userId
// const tokens = new Map<string, string>();

router.post('/send-notification', asyncHandler(async (req: Request<{}, {}, NotificationPayload>, res: Response) => {
  try {
    const payload = req.body;

    const genderFilter = payload.data?.gender
      ? { gender: payload.data.gender, fcmTokens: { $exists: true, $ne: [] } }
      : { fcmTokens: { $exists: true, $ne: [] } };

    const users = await UserModel.find(genderFilter, 'fcmTokens');
    const tokens: string[] = users.flatMap(user => user.fcmTokens || []);

    if (!tokens.length) {
      res.status(400).json({
        success: false,
        message: 'No valid FCM tokens found',
      });
      return
    }

    const result = await notificationService.send({ ...payload, tokens });
    console.log("✅ Notification result:", JSON.stringify(result, null, 2));

    res.json({
      success: result.success,
      type: result.type,
      total: tokens.length,
      sent: result.successCount || 0,
      failed: result.failureCount || 0,
      invalidTokens: result.invalidTokens || [],
      errors: result.responses?.filter(r => !r.success).map(r => r.error?.message) || [],
    });
    return
  } catch (error: any) {
    console.error('Notification send error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal Server Error',
    });
    return
  }
}));





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

