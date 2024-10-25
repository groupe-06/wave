import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoDBConnexion from "./db/mongo-connexion.js";
import typeTransactionRoute from "./routes/typeTransactionRoute.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
const BASE_URI = process.env.BASE_URI;

app.use(cors());
app.use(express.json());

mongoDBConnexion();

app.use(`${BASE_URI}/type-transaction`, typeTransactionRoute);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})