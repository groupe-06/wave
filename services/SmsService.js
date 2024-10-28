import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

class SmsService {
    constructor() {
        
        this.validateEnvironmentVariables();
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    }

    validateEnvironmentVariables() {
        const requiredVars = [
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'TWILIO_PHONE_NUMBER'
        ];
       


        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
        }
    }

    async sendSms(to, message) {
        if (!to || !message) {
            throw new Error('Le numéro de téléphone et le message sont requis');
        }

        try {
            // Vérification et formatage du numéro
            const formattedNumber = this.formatPhoneNumber(to);
            
            // Validation supplémentaire du format
            if (!this.isValidPhoneNumber(formattedNumber)) {
                throw new Error(`Numéro de téléphone invalide: ${formattedNumber}`);
            }

            console.log('Tentative d\'envoi de SMS à:', formattedNumber);

            const response = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: formattedNumber,
            });

            console.log('SMS envoyé avec succès, SID:', response.sid);
            return {
                success: true,
                messageId: response.sid,
                status: response.status,
                to: formattedNumber
            };
        } catch (error) {
            console.error('Erreur Twilio détaillée:', {
                message: error.message,
                code: error.code,
                status: error.status,
                moreInfo: error.moreInfo,
                details: error.details
            });

            // Gestion spécifique des erreurs Twilio
            if (error.code === 21211) {
                throw new Error('Numéro de téléphone invalide');
            } else if (error.code === 21608) {
                throw new Error('Numéro non vérifié dans Twilio');
            } else if (error.code === 20003) {
                throw new Error('Erreur d\'authentification Twilio');
            }

            throw new Error(`Erreur d'envoi SMS: ${error.message}`);
        }
    }

    formatPhoneNumber(number) {
        let cleaned = number.replace(/\D/g, '');
        
        // Formatage avec le préfixe +221 si besoin
        if (!cleaned.startsWith('221') && cleaned.length === 9) {
            cleaned = '+221' + cleaned;
        } else if (cleaned.startsWith('221') && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        
        return cleaned;
    }
    
    isValidPhoneNumber(number) {
        // Vérification basique du format pour le Sénégal
        const senegalRegex = /^\+221[73]\d{7}$/;
        return senegalRegex.test(number);
    }

    async testConnection() {
        try {
            // Tester la connexion à Twilio
            await this.client.messages.list({ limit: 1 });
            return true;
        } catch (error) {
            console.error('Erreur de connexion Twilio:', error);
            return false;
        }
    }
}

export default new SmsService();