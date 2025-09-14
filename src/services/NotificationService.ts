import admin from 'firebase-admin';
import UserModel from '../models/user.model.js';

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
    ttlSeconds?: number;
}

class NotificationService {
    private defaultTitle = '🔔 New Notification';
    private defaultBody = 'You have a new message.';
    private defaultUrl = 'https://bmat.onrender.com/';

    private buildBaseMessage(payload: NotificationPayload) {
        const {
            title = this.defaultTitle,
            body = this.defaultBody,
            imageUrl = '',
            url = this.defaultUrl,
            click_action,
            data = {},
            ttlSeconds = 3600,
        } = payload;

        const clickActionUrl = click_action || url;

        // Base notification object
        const notification = {
            title,
            body,
            ...(imageUrl && { image: imageUrl }),
        };

        // Data payload - matching your service worker expectations
        const dataPayload = {
            ...data,
            title: title.toString(),
            body: body.toString(),
            icon: 'https://bhoi.joodi.in/uploads/images/compressed/android-chrome-192x192.png', // Match your SW default
            badge: 'https://bhoi.joodi.in/uploads/images/compressed/android-chrome-192x192.png',   // Match your SW default
            image: imageUrl.toString(),
            url: clickActionUrl.toString(),
            click_action: clickActionUrl.toString(),
        };

        // PWA/Web specific configuration - matching your service worker
        const webpush = {
            headers: {
                'Urgency': 'high',
                'TTL': ttlSeconds.toString(),
            },
            notification: {
                title,
                body,
                sound: 'default',
                icon: '/icons/icon-192x192.png', // Match your SW
                badge: '/icons/badge-icon.png',   // Match your SW
                ...(imageUrl && { image: imageUrl }),
                click_action: clickActionUrl,
                requireInteraction: false,
                silent: false,
                tag: 'default',
            },
            fcmOptions: {
                link: clickActionUrl,
            },
            data: dataPayload, // This is key - data goes here for PWA
        };

        // Android specific configuration
        const android = {
            ttl: ttlSeconds * 1000,
            priority: 'high' as const,
            notification: {
                title,
                body,
                clickAction: clickActionUrl,
                ...(imageUrl && {
                    icon: imageUrl,
                    imageUrl: imageUrl
                }),
                defaultSound: true,
                defaultVibrateTimings: true,
                defaultLightSettings: true,
            },
            data: dataPayload,
        };

        // iOS/APNS specific configuration
        const apns = {
            headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert',
            },
            payload: {
                aps: {
                    alert: {
                        title,
                        body,
                    },
                    sound: 'default',
                    badge: 1,
                    'content-available': 1,
                    'mutable-content': 1,
                },
                ...dataPayload,
            },
            fcmOptions: {
                imageUrl: imageUrl || undefined,
            },
        };

        return {
            // Remove top-level notification for PWA (let service worker handle it)
            data: dataPayload, // Data is primary for PWA
            webpush,
            android,
            apns,
        };
    }

    async send(payload: NotificationPayload) {
        const baseMessage = this.buildBaseMessage(payload);

        try {
            // 1. Single token
            if (payload.token) {
                const message = { token: payload.token, ...baseMessage };
                const response = await admin.messaging().send(message);
                return { success: true, type: 'single', response };
            }

            // 2. Multiple tokens
            if (payload.tokens?.length) {
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

                responses.forEach((res) => {
                    if (res.success) {
                        successCount++;
                    } else {
                        failureCount++;
                        const code = res.error?.code;
                        if (
                            code === 'messaging/invalid-registration-token' ||
                            code === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(res.token);
                        }
                    }
                });

                // Clean up invalid tokens
                if (invalidTokens.length > 0) {
                    try {
                        await UserModel.updateMany(
                            {},
                            { $pull: { fcmTokens: { $in: invalidTokens } } }
                        );
                        console.log(`🧹 Removed ${invalidTokens.length} invalid tokens`);
                    } catch (err) {
                        console.warn('⚠️ Failed to clean invalid tokens:', err);
                    }
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

            // 3. Topic
            if (payload.topic) {
                const message = { topic: payload.topic, ...baseMessage };
                const response = await admin.messaging().send(message);
                return { success: true, type: 'topic', response };
            }

            // 4. No valid target
            throw new Error('No valid target provided: token, tokens[], or topic');
        } catch (error: any) {
            console.error('🚨 Notification send error:', error);
            return {
                success: false,
                error: error?.message || 'Unknown error occurred',
            };
        }
    }
}

export default new NotificationService();