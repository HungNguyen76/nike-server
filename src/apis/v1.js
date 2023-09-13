import express from 'express'

const router = express.Router()

import userModule from './modules/user'

router.use('/users', userModule)

export default router