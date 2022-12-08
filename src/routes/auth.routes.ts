import { Router } from "../deps.ts";
import authController from "../controllers/auth.controller.ts";
import requireUser from "../middleware/requireUser.ts";

const router = new Router();

router.post<string>("/register", authController.signUpUserController);
router.post<string>("/login", authController.loginUserController);

router.get<string>("/logout", requireUser, authController.logoutController);

router.get<string>("/refresh", authController.refreshAccessTokenController);

export default router;
