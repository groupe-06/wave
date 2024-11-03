import express from "express";
import { activeAccountWithVerificationCode, createUser, login, getAllUsersExceptCurrent,getMerchantsExceptCurrent} from "../controllers/utilisateurController.js";
import upload from "../utils/multer.js";
import { getToken } from "../middlewares/authMiddleware.js";
const userRoute = express.Router();

userRoute.post('/create',  upload.single('photoProfile'), createUser);
userRoute.post('/login', login);
userRoute.post('/active-account-with-code', activeAccountWithVerificationCode);
userRoute.get('/all-users-except-current', getToken,getAllUsersExceptCurrent);
userRoute.get('/merchants-except-current', getToken,getMerchantsExceptCurrent);


export default userRoute;

