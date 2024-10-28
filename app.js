import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoDBConnexion from "./db/mongo-connexion.js";
import typeTransactionRoute from "./routes/typeTransactionRoute.js";
import transactionClientRoute from "./routes/tranfertRoute.js";
import userRoute from "./routes/userRoute.js";
import compteRoute from "./routes/compteRoute.js";
import adminRoute from "./routes/adminRoute.js";
import deplafonRoute from "./routes/deplafonRoute.js"; 
import transactionRoute from "./routes/listeTransaction.js"; 
import changeCompteRoute from "./routes/changeCompteRoute.js";
import updatePasswordRoute from "./routes/updatePasswordRoute.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const BASE_URI = process.env.BASE_URI ;

app.use(cors());
app.use(express.json());

mongoDBConnexion();

app.use(`${BASE_URI}/type-transaction`, typeTransactionRoute);
app.use(`${BASE_URI}/client`, transactionClientRoute);
app.use(`${BASE_URI}/admin`, adminRoute);
app.use(`${BASE_URI}/user`, userRoute);
app.use(`${BASE_URI}/compte`, compteRoute);
app.use(`${BASE_URI}/transactions`, transactionRoute);
app.use(`${BASE_URI}/utilisateurs`, changeCompteRoute);
app.use(`${BASE_URI}/user`, updatePasswordRoute);
app.use(`${BASE_URI}/deplafonnement`, deplafonRoute);




/*app.post(`${BASE_URI}/generate-test-data`, async (req, res) => {
    try {
        await generateTestData();
        res.status(200).json({ message: 'Données de test générées avec succès' });
    } catch (error) {
        console.error('Erreur lors de la génération des données:', error);
        res.status(500).json({ error: 'Erreur lors de la génération des données' });
    }
});*/

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})