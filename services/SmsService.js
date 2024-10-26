import axios from 'axios';

class SmsService {
    constructor() {
        this.apiKey = process.env.INFOBIP_API_KEY;
        this.baseUrl = process.env.INFOBIP_BASE_URL;
    }

    async sendSms(to, message) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/sms/2/text/advanced`,
                {
                    messages: [
                        {
                            destinations: [{ to }],
                            from: "InfoSMS",
                            text: message
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `App ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            console.log('Réponse de l\'API SMS:', response.data);
            return {
                success: true,
                messageId: response.data.messages[0].messageId,
                status: response.data.messages[0].status.description
            };
        } catch (error) {
            console.error('Erreur lors de l\'envoi du SMS:', error.response?.data || error.message);
            throw new Error('Échec de l\'envoi du SMS');
        }
    }

    // Méthode utilitaire pour formater les messages de transaction
    formatTransactionMessage(type, montant, expediteur, destinataire, solde) {
        switch (type.toLowerCase()) {
            case 'transfert_envoye':
                return `Transfert effectué: Vous avez envoyé ${montant} FCFA à ${destinataire}. Nouveau solde: ${solde} FCFA`;
            case 'transfert_recu':
                return `Transfert reçu: Vous avez reçu ${montant} FCFA de ${expediteur}. Nouveau solde: ${solde} FCFA`;
            case 'depot':
                return `Dépôt effectué: Vous avez reçu un dépôt de ${montant} FCFA. Nouveau solde: ${solde} FCFA`;
            case 'retrait':
                return `Retrait effectué: Vous avez retiré ${montant} FCFA. Nouveau solde: ${solde} FCFA`;
            default:
                return `Transaction effectuée: Nouveau solde: ${solde} FCFA`;
        }
    }
}

export default new SmsService();