// import express from "express";
// <<<<<<< smt-branch-wave
// import { createUser, login,getCompteByUser } from "../controllers/utilisateurController.js";
// =======
// import { activeAccountWithVerificationCode, createUser, login } from "../controllers/utilisateurController.js";
// >>>>>>> master
// import upload from "../utils/multer.js";
// import { getToken } from '../middlewares/authMiddleware.js';

// const userRoute = express.Router();

// userRoute.post('/create',  upload.single('photoProfile'), createUser);
// userRoute.post('/login', login);
// <<<<<<< smt-branch-wave
// userRoute.get('/getcompte',getToken, getCompteByUser);
// =======
// userRoute.post('/active-account-with-code', activeAccountWithVerificationCode);
// >>>>>>> master

// export default userRoute;

import express from "express";
import { createUser, login,getCompteByUser } from "../controllers/utilisateurController.js";
import upload from "../utils/multer.js";
import { getToken } from '../middlewares/authMiddleware.js';

const userRoute = express.Router();

userRoute.post('/create',  upload.single('photoProfile'), createUser);
userRoute.post('/login', login);
userRoute.get('/getcompte',getToken, getCompteByUser);

export default userRoute;

