import express from "express"
import { loginUser,registerUser ,bulkRegister, adminResetPassword, updatePassword} from "../controllers/userController.js"
import {startNewSession} from "../controllers/newSession.js"

const userRouter = express.Router();

userRouter.post("/register",registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/admin-reset-password", adminResetPassword);
userRouter.post("/admin-update-password", updatePassword);
userRouter.post("/bulk-register", bulkRegister); 
userRouter.delete("/startNewSession", startNewSession); 

export default userRouter;