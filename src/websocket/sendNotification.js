import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount ),
});

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

const registrationToken = "DEVICE_FCM_TOKEN_FROM_FRONTEND";

const message = {
  notification: {
    title: "Hello from Firebase!",
    body: "This is a test push notification.",
  },
  token: registrationToken,
};

admin
  .messaging()
  .send(message)
  .then((response) => {
    console.log("Successfully sent message:", response);
  })
  .catch((error) => {
    console.log("Error sending message:", error);
  });
