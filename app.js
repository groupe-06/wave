import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoDBConnexion from "./db/mongo-connexion.js";
import typeTransactionRoute from "./routes/typeTransactionRoute.js";
import userRoute from "./routes/userRoute.js";
import compteRoute from "./routes/compteRoute.js";
import transactionRoutes from './routes/transactionRoutes.js';
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
const BASE_URI = process.env.BASE_URI;

app.use(cors());
app.use(express.json());

mongoDBConnexion();

app.use(`${BASE_URI}/type-transaction`, typeTransactionRoute);
app.use(`${BASE_URI}/user`, userRoute);
app.use(`${BASE_URI}/compte`, compteRoute);
app.use(`${BASE_URI}/Transactions`, transactionRoutes);
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})