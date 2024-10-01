const http = require('http');
const express = require("express");
const swaggerUi = require('swagger-ui-express');
const fs = require("fs");
const YAML = require('yaml');
const WebSocket = require('ws');

// Charger le fichier Swagger
const file  = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(file);

// ROUTES
const usersRoutes = require('./routes/usersRoutes/usersRoutes');
// const livraisonRoutes = require("./routes/livraisonRoutes/livraisonRoutes");
// const deploiementRoutes = require("./routes/deploiementRoutes/deploiementRoutes");
// const pmRoutes = require("./routes/pmRoutes/pmRoutes");

const cors = require('cors');

const app = express();
app.use(express.json({
  limit: '900mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '900mb'
}));

app.use(cors());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', usersRoutes);
// app.use('/api', livraisonRoutes);
// app.use('/api', deploiementRoutes);
// app.use('/api', pmRoutes);

// Définir et configurer le serveur HTTP
const server = http.createServer(app);

// Configurer WebSocket
const wss = new WebSocket.Server({ server });

// Fonction pour envoyer les mises à jour en temps réel
const sendRoutineUpdates = (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));  // Envoie des données à tous les clients WebSocket connectés
    }
  });
};

// Inclure les routes routines avec la fonction sendRoutineUpdates
const routinesRoutes = require("./routes/routineRoutes/routinesRoutes");
app.use('/api', routinesRoutes(sendRoutineUpdates));

// Gestion des erreurs du serveur
const errorHandler = error => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges.');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use.');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};
const port = normalizePort(process.env.PORT || 3000);
app.set('port', port);

server.on('error', errorHandler);
server.on('listening', () => {
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
  console.log('Listening on ' + bind);
});

server.listen(port);
