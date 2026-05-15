const twilio = require('twilio');
const nodemailer = require('nodemailer');
const db = require('../db');

const getMessagingSettings = async (provider = 'Twilio') => {
    try {
        const [rows] = await db.query('SELECT * FROM messaging_settings WHERE provider_name = ? AND is_active = 1 LIMIT 1', [provider]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('Error fetching messaging settings:', err);
        return null;
    }
};

const getEmailSettings = async () => {
    try {
        const [rows] = await db.query('SELECT * FROM email_settings WHERE is_active = 1 LIMIT 1');
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('Error fetching email settings:', err);
        return null;
    }
};

const sendSMS = async (to, message) => {
    const settings = await getMessagingSettings('Twilio');
    if (!settings || !settings.account_sid || !settings.auth_token) {
        console.warn('⚠️ Twilio settings not found or inactive in Database. Skipping SMS.');
        return false;
    }

    try {
        const client = twilio(settings.account_sid, settings.auth_token);
        const from = settings.sender_number;
        
        // Handle WhatsApp vs SMS
        const isWhatsApp = from.toLowerCase().includes('whatsapp:');
        const formattedTo = (isWhatsApp && !to.startsWith('whatsapp:')) ? `whatsapp:${to}` : (to.startsWith('+') ? to : `+${to}`);

        await client.messages.create({
            body: message,
            from: from,
            to: formattedTo
        });
        
        console.log(`✅ ${isWhatsApp ? 'WhatsApp' : 'SMS'} Sent successfully to:`, to);
        return true;
    } catch (err) {
        console.error('❌ Messaging Failed:', err.message);
        return false;
    }
};

const sendEmail = async (to, subject, text) => {
    const settings = await getEmailSettings();
    if (!settings || !settings.smtp_host) {
        console.warn('⚠️ Email settings not found or inactive in Database. Skipping Email.');
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_port == 465,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass
            }
        });

        await transporter.sendMail({
            from: `"${settings.from_name || 'Zamzam Kitchen'}" <${settings.from_email || settings.smtp_user}>`,
            to,
            subject,
            text
        });
        console.log('✅ Email Sent successfully to:', to);
        return true;
    } catch (err) {
        console.error('❌ Email Failed:', err.message);
        return false;
    }
};

const notifyReservationConfirmed = async (res) => {
    let message = `Hello ${res.first_name}, your reservation at Zamzam Kitchen is CONFIRMED! 📅 Date: ${res.reservation_date} 🕒 Time: ${res.reservation_time.substring(0, 5)}.`;
    
    if (res.booking_fee > 0) {
        message += ` 💡 Note: Your booking fee of $${res.booking_fee} will be adjusted in your final bill. (Non-refundable in case of no-show).`;
    }
    
    message += ` See you then!`;
    const subject = "Booking Confirmed - Zamzam Kitchen";

    if (res.notification_pref === 'whatsapp' || res.notification_pref === 'sms') {
        await sendSMS(res.phone, message);
    } else if (res.notification_pref === 'email') {
        await sendEmail(res.email, subject, message);
    }
};

module.exports = {
    sendSMS,
    sendEmail,
    notifyReservationConfirmed
};
