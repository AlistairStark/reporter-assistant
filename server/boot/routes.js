const webhookHandler = require('../services/webhookHandler');

module.exports = function(app) {
    // Install a "/ping" route that returns "pong"
    app.post('/hook/dialog', (req, res) => {
        console.log('HERE', req);
        webhookHandler(req, res);
        // res.send(appRes);
    });
}