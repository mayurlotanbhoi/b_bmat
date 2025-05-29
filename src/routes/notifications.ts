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

const router = Router();
const sendNotification = async (token: string, payload: any) => {
  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl // Firebase expects 'image' not 'imageUrl'
    },
    data: {  // Additional data payload
      url: payload.url || '/',
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl
      // Add other data fields here
    },
    webpush: {
      headers: {
        Urgency: 'high'  // For browser prioritization
      }
    }
  };

  try {
    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error('FCM send error:', error);
    // throw error;
  }
};

// Store FCM tokens by userId
const tokens = new Map<string, string>();

router.post('/send-notification', async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    console.log("tokens", tokens);

    const results = await Promise.allSettled(
      Array.from(tokens.values()).map(token =>
        sendNotification(token, payload)
      )
    );

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    res.json({
      success: true,
      sent: successes.length,
      failed: failures.length,
      errors: failures.map(f => (f as PromiseRejectedResult).reason?.message || 'Unknown error'),
    });
  } catch (error: any) {
    console.error('Error in /send-notification:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});


router.post('/save-subscription', (req: Request, res: Response) => {
  try {
    const { userId, fcmToken } = req.body;


    console.log("userId, fcmToken", userId, fcmToken)

    if (!userId || !fcmToken) {
      res.status(400).json({ error: 'userId and fcmToken are required' });
      return;
    }

    tokens.set(userId, fcmToken);

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

