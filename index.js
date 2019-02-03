const express = require('express');
const bodyParser = require('body-parser');
const webhookProcessing = require('./webhook');

const app = express();

app.use(bodyParser.json());

app.post('/hook/dialog', (req, res) => {
    webhookProcessing(req, res);
});

app.listen({ port: 3000 }, () => {
    console.log(`Server listening on port 3000`);
});
