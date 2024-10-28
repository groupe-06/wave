import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


const apiKey = process.env.INFOBIP_API_KEY;
const baseUrl = process.env.INFOBIP_BASE_URL;

 const sendSMS = async (phoneNumber, message) => {
    try {
        const response = await axios.post(`${baseUrl}/sms/2/text/advanced`, {
            messages: [
                {
                    from: "InfoSMS",
                    destinations: [
                        {
                            to: phoneNumber
                        }
                    ],
                    text: message
                }
            ]
        }, {
            headers: {
                Authorization: `App ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('SMS sent successfully:', response.data);
        console.log('Sending SMS with the following details:');
        console.log(`Phone Number: ${phoneNumber}`);
        console.log(`Message: ${message}`);
        console.log('API Key:', apiKey);
        console.log('Base URL:', baseUrl);

    } catch (error) {
        console.error('Error sending SMS:', error);
    }
};

export default sendSMS ;