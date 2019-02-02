const { WebhookClient } = require('dialogflow-fulfillment');
const { dialogflow, Permission, Suggestions } = require('actions-on-google');

function welcome (agent) {
    agent.add(`That's great!.`);
}

function fallback (agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
}

function askPermission(agent) {
    let conv = agent.conv();
    
    conv.ask(new Permission({
        context: 'Hi there! Can we use your email?',
        permissions: 'EMAIL'
    }));

    agent.add(conv);
}

function webhookHandler(request, response) {
    // const app = dialogflow({debug: true});

    // app.intent('get language', (conv, {language}) => {
    //     conv.close(`You chose ${language}`);
    // });

    // return app;
    console.log(1);
    const agent = new WebhookClient({request, response});
    console.log(2);
    // console.log(agent.intent);
    // console.log(agent.query);
    // console.log(agent.originalRequest.payload.user);
    const queryData = agent.originalRequest;
    agent.handleRequest(askPermission);
}

module.exports = webhookHandler;