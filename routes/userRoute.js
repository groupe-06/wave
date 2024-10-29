import express from "express";
import { activeAccountWithVerificationCode, createUser, login } from "../controllers/utilisateurController.js";
import upload from "../utils/multer.js";

const userRoute = express.Router();

userRoute.post('/create',  upload.single('photoProfile'), createUser);
userRoute.post('/login', login);
userRoute.post('/active-account-with-code', activeAccountWithVerificationCode);

export default userRoute;

