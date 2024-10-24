const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/routineControllers/routineControllers");
// const middlewares = require("../../middlewares/routinesMiddlewares/routinesMiddlewares");

// Définir les autres routes normalement
router.post("/makeRoutine", [], controllers.makeRoutine);
router.get("/routines", [], controllers.getRoutine);
router.post("/getRoutineByCommercial", [], controllers.getRoutineByCommercial);
router.post("/getSnBypointMarchand", [], controllers.getSnBypointMarchand);
router.post("/generateAuthCode", [], controllers.generateAuthCode);
router.post("/makeRouting", [], controllers.createRouting);
router.post("/getRoutingByCommercial", [], controllers.getRoutingByCommercial);
router.post("/importImage", [], controllers.importBase64File);
router.post("/validateAuthorizationCode", [], controllers.validateAuthCode);
router.post("/getRoutingByBdm", [], controllers.getAllRoutingsByBdm);
router.post("/getMyAgents", [], controllers.getMyAgents);
router.get("/getPms", [], controllers.getPms);
router.post("/getAllRoutinesByBdm", [], controllers.getAllRoutinesByBdm);
router.get("/getAllMerchants", [], controllers.getAllMerchants);
router.post("/updateMerchant", [], controllers.updateMerchant);
router.post("/profile", [], controllers.getProfile);
router.post("/AllRoutings", [], controllers.allRoutings);
router.post("/AllRoutines", [], controllers.allRoutines);
router.post("/getOneRoutine", [], controllers.getOneRoutine);

// Maintenant on modifie pour les WebSockets
module.exports = (sendRoutineUpdates) => {
    // Route pour récupérer les infos de routine
    router.post('/getRoutineInfos', (req, res) => {
        controllers.getRoutineInfos(req, res, sendRoutineUpdates);
    });

    // Route pour récupérer les infos de routine par intervalle de dates
    router.post('/getRoutineInfosByDateRange', (req, res) => {
        controllers.getRoutineInfosByDateRange(req, res, sendRoutineUpdates);
    });

    router.post('/getRoutineInfosForDc', (req, res) => {
        controllers.getRoutineInfosForDC(req, res, sendRoutineUpdates);
    });

    router.post('/getRoutineInfosForDcByCommercial', (req, res) => {
        controllers.getRoutineInfosForDcByCommercial(req, res, sendRoutineUpdates);
    });    
    router.post('/getRoutineInfosForDcByCommercialByDateRange', (req, res) => {
        controllers.getRoutineInfosForDcByCommercialByDateRange(req, res, sendRoutineUpdates);
    });    
    router.post('/getRoutineInfosForDCByDateRange', (req, res) => {
        controllers.getRoutineInfosForDCByDateRange(req, res, sendRoutineUpdates);
    });

    return router;  // Retourner le router configuré
};
