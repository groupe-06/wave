import express from "express";
import { getToken } from "../middlewares/authMiddleware.js";
import {confirmerAnnulationTransaction} from "../controllers/adminController.js";

const adminRoute = express.Router();

adminRoute.post("/confirmer-annulation",getToken,confirmerAnnulationTransaction);


export default adminRoute;