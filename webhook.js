const { WebhookClient } = require('dialogflow-fulfillment');
const { dialogflow, Permission, Suggestions } = require('actions-on-google');
const axios = require('axios');
const translations = require('./translations');

/* 
    Placeholder url for local api server.
*/
const url = 'http://localhost:8080/api/';

/* 
    Placeholder storage for prototype. Use something like Redis for this in production!
*/
let pendingTransactions = {};

function getLang(agent) {
    const lang = agent.originalRequest.payload.user.locale;
    let langCode = lang.indexOf('fr') !== -1 ? 'fr-CA' : 'en-US';
    return langCode;
}

function fallback (agent) {
    const lang = getLang(agent);
    agent.add(translations[lang].fallback1);
    agent.add(translations[lang].fallback2);
}

function askPermission(agent) {
    const lang = getLang(agent);
    let conv = agent.conv();
    
    conv.ask(new Permission({
        context: translations[lang].askPermission,
        permissions: 'NAME'
    }));

    agent.add(conv);
}

async function permissionResponse(agent) {
    const lang = getLang(agent);
    let user = '';
    if (agent.originalRequest.payload.user.profile) {
        user = agent.originalRequest.payload.user.profile.givenName;
    }
    // placeholder auth. OAuth with Google to be implemented in full app
    const email = { email: `${user}@email.com` };
    try {
        const userData = await axios.get(`${url}/Accounts`, { params: { filter: { where: email } } });
        if (userData.data.length < 1) {
            await axios.post(`${url}Accounts`, email);
        }
    } catch(err) {
        console.log(new Error(err));
    }

    agent.add(`${translations[lang].permissionResponse1}${user}${translations[lang].permissionResponse2}`);
    agent.add(translations[lang].permissionResponse3);
} 

function subscribeCheck(agent) {
    const lang = getLang(agent);
    const queryString = agent.query.toLowerCase();
    const lowerCaseTrans = translations[lang].subscribeCheckSubscribe.toLowerCase();
    const query = queryString.split(lowerCaseTrans);
    const trigger = query[1];
    const user = agent.originalRequest.payload.userId;

    pendingTransactions[user] = trigger.trim();

    agent.add(`${translations[lang].subscribeCheckSuccess}${trigger}?`);
}

async function subscribeTo(agent) {
    const lang = getLang(agent);
    const user = agent.originalRequest.payload.userId;
    const userName = agent.originalRequest.payload.user.profile.givenName;
    const subscription = pendingTransactions[user];
    let error = null;
    // Placeholder for real auth flow account credentials. With OAuth implemented, google provides email in webhook call. 
    const subscribeData = {
        email: `${userName}@email.com`,
        phrase: subscription
    };

    try {
        const subscribe = await axios.post(`${url}GoogleAssistants/subscribe`, subscribeData);
    } catch(err) {
        console.log(new Error(err));
        error = 1;
    }
    
    if (error) {
        agent.add(translations[lang].subscribeTo);
    } else {
        agent.add(`${translations[lang].subscribeToSuccess} ${pendingTransactions[user]}!`);
        agent.add(translations[lang].subscribeToNext);
    }
}

async function listSubscriptions(agent) {
    const lang = getLang(agent);
    const user = agent.originalRequest.payload.userId;
    const userName = agent.originalRequest.payload.user.profile.givenName;
    // Placeholder for real auth flow account credentials. With OAuth implemented, google provides email in webhook call. 
    const email = `${userName}@email.com`;

    try {
        const subscriptions = await axios.get(`${url}GoogleAssistants/my-subscriptions`, { params: { email: email } });
        const subscriptionData = subscriptions.data;
        const subscriptionString = subscriptionData.reduce((acc, curr, i) => {
            let prefix = '';
            if (i !== 0 && i + 1 === subscriptionData.length) {
                prefix = translations[lang].and;
            } else if (i !== 0) {
                prefix = ',';
            }
            return `${acc} ${prefix} ${curr} `;
        })
        agent.add(`${translations[lang].listSubscriptions} ${subscriptionString}`);
    } catch(err) {
        console.log(new Error(err));
    }
}

function intentResolver(intent, query, user) {
    if (!user.profile) return askPermission;
    const intents = {
        'Default Welcome Intent': askPermission,
        'user_info': permissionResponse,
        'subscribe_to': subscribeCheck,
        'subscribe_to - yes': subscribeTo,
        'list_subscriptions': listSubscriptions,
    };
    
    const toReturn = intents[intent] || fallback;
    return toReturn;
}

function webhookProcessing(req, res) {
    const agent = new WebhookClient({request: req, response: res});
    const intent = agent.intent;
    const query = agent.query;
    const user = agent.originalRequest.payload.user;
    console.log(intent);
    console.log(query);
    console.log(user);
    let returnFunction;
    if (user && user.profile) {
        returnFunction = intentResolver(intent, query, user);
    } else {
        returnFunction = askPermission;
    }
    agent.handleRequest(returnFunction);
}

module.exports = webhookProcessing;