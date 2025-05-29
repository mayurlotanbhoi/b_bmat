// app.post("/save-token", async (req: Request, res: Response) => {
//   const { token } = req.body as { token?: string };



//   if (token && !tokens.includes(token)) {
//     tokens.push(token);
//     console.log("Saved token:", token);
//   }

//   res.json({ success: true });
// });

// app.post("/send-notification", async (req: Request, res: Response): Promise<void> => {
//   const { title, body, imageUrl, url } = req.body as {
//     title?: string;
//     body?: string;
//     imageUrl?: string;
//     url?: string;
//   };

//   if (!title || !body) {
//     res.status(400).json({ error: "Missing title or body" });
//     return;
//   }

//   if (!Array.isArray(tokens) || tokens.length === 0) {
//     res.status(400).json({ error: "No FCM tokens available" });
//     return;
//   }

//   try {
//     const messages = tokens.map(token => ({
//       token,
//   data: {
//     title,
//     body,
//     imageUrl: imageUrl || '',
//     url: url || ''
//   },
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

//     res.json({ success: true, results: { successes, failures } });
//   } catch (error: any) {
//     console.error("Error sending notifications:", error);
//     res.status(500).json({ error: "Failed to send notifications" });
//   }
// });