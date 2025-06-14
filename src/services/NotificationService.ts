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
    private defaultUrl = '/';

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

        const notification = {
            title,
            body,
            image: imageUrl || undefined,
        };

        const dataPayload = {
            ...data,
            title,
            body,
            imageUrl,
            url,
            click_action: clickActionUrl,
        };

        const webpush = {
            headers: {
                Urgency: 'high',
            },
            notification: {
                title,
                body,
                icon: imageUrl || '/logo192.png',
                image: imageUrl || undefined,
                click_action: clickActionUrl,
            },
            fcmOptions: {
                link: clickActionUrl, // <-- this is critical for web (PWA)
            },
        };

        const android = {
            ttl: ttlSeconds * 1000,
            notification: {
                clickAction: clickActionUrl,
                icon: imageUrl || undefined,
                imageUrl: imageUrl || undefined,
            },
        };

        return {
            notification, // <-- this ensures background delivery
            data: dataPayload,
            webpush,
            android,
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
