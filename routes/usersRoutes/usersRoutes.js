const express = require('express')
const router = express.Router()
const controllers = require('../../controllers/usersControllers/usersControllers')
const middlewares = require('../../middlewares/userMiddlewares/verifyusernameOremail')

router.post("/register",middlewares.checkUser,controllers.register)
router.post("/login", middlewares.checkIfExists, controllers.login)
router.put("/updateFcmUserToken",[],controllers.updateFcmUserToken)

module.exports = router
