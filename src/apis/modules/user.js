/* Create Express Router */
import express from 'express'
const router = express.Router()

import userController from '../../controllers/user.controller';
import authencation from '../../middlewares/authencation';

router.get('/confirm/:token', userController.confirm)
router.post('/login', userController.login)
router.post('/authen-token', userController.authenToken)

router.get('/resend', authencation.checkResendEmail, userController.resend)
// router.post('/change-password', authencation.checkChangePassword, userController.changePassword)
// router.get('/change-password-confirm/:token', userController.changePasswordConfirm)
router.post('/', userController.create)
router.get('/', userController.findAllUsers)

export default router;