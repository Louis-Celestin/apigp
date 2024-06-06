const express = require("express")
const router = express.Router()
const controllers = require("../../controllers/routineControllers/routineControllers")
const middlewares = require("../../middlewares/routinesMiddlewares/routinesMiddlewares")


router.post("/makeRoutine",[],controllers.makeRoutine)
router.get("/routines",[],controllers.getRoutine)
router.post("/getRoutineByCommercial",[],controllers.getRoutineByCommercial)

module.exports=router