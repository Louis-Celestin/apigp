const express = require('express')
const router = express.Router()
const controllers = require('../../controllers/pointmarchandContollers/pmControllers')

router.post("/getpm",[],controllers.trouverPointsMarchandsProches)

module.exports=router