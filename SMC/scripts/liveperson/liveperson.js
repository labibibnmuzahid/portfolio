import {
    getMagentoCache
} from '../storage/util.js';

let token = '';
let userAuthenticated = window.userAuthenticated || false;
// Function to check if lpTag is defined and then push the identity function
function waitForLpTag(callback) {
    const interval = setInterval(() => {
        if (typeof window.lpTag !== 'undefined' && window.lpTag.identities) {
            clearInterval(interval);
            callback();
        }
    }, 100); // Check every 100ms
}

function identityFn(callback) {
    callback({
        iss: 'https://visualcomfort.com',
        acr: 'loa1',
        sub: '111111111',
    });
}

function getCustomerData() {
    const magentoCache = getMagentoCache();
    return magentoCache.customer || {};
}

waitForLpTag(() => {
    const customer = getCustomerData();
    if (customer && customer.firstname) {
        window.lpTag.section = ['auth'];
        userAuthenticated = true;
        window.userAuthenticated = true;
        window.lpTag.identities.push(identityFn);
        const unAuthFlag = localStorage.getItem('unAuthFlag'); // Retrieving unAuthFlag from localStorage
        // eslint-disable-next-line no-console
        // console.log(`unAuthFlag: ${unAuthFlag}`);
        if (unAuthFlag === true || unAuthFlag === 'true') { // Checks localStorage to confirm if the Customer already started a conversation on unAuth state
            // eslint-disable-next-line no-console
            // console.log('newPage as unauth');
            window.lpTag.section = ['unauth'];
            // window.lpTag.newPage(window.location.href, { section: ['unauth'] });
            // If conversation was already started on unAuth state, unauth section will be pushed
        } else {
            // eslint-disable-next-line no-console
            // console.log('newPage as auth');
            window.lpTag.section = ['auth'];
            // window.lpTag.newPage(window.location.href, { section: ['auth'] });
            // If conversation was not started on unAuth state, auth section will be pushed
        }
        // eslint-disable-next-line no-console
        // console.log('Customer is logged in: auth chat available. - EDS');
    } else {
        window.lpTag.section = ['unauth'];
        // window.lpTag.newPage(window.location.href, { section: ['unauth'] });
        // eslint-disable-next-line no-console
        // console.log('Customer is not logged in: default chat available. -EDS');
    }

    window.lpTag.events.bind('lpUnifiedWindow', 'state', (data) => {
        if (data.state === 'waiting') {
            localStorage.removeItem('unAuthFlag');
            // eslint-disable-next-line no-console
            // console.log('No conversation ongoing. unAuthFlag removed');
        }
    });

    window.lpTag.events.bind('lpUnifiedWindow', 'state', (data) => {
        if (data.state === 'interactive') {
            // Checks if user is not authenticated in page
            if (userAuthenticated === false || userAuthenticated === 'false') {
                localStorage.setItem('unAuthFlag', true);
                // eslint-disable-next-line no-console
                // console.log('Conversation is ongoing. unAuthFlag set as true');
            }
        }
    });

    window.lpTag.events.bind('lpUnifiedWindow', 'state', (data) => {
        if (data.state === 'ended') {
            localStorage.removeItem('unAuthFlag');
            // eslint-disable-next-line no-console
            // console.log('Conversation ended. unAuthFlag removed');

            // Checks if user still authenticated in page to display 'auth'
            // engagement when conversations ends
            if (window.userAuthenticated === true || window.userAuthenticated === 'true') {
                // eslint-disable-next-line no-console
                // console.log('User still authenticated. Displaying auth engagement');
                window.lpTag.newPage(window.location.href, {
                    section: ['auth']
                });
            }
        }
    });
});

// eslint-disable-next-line func-names
window.lpGetAuthenticationToken = function(callback) {
    const customer = getCustomerData();

    if (customer && customer.firstname) {
        // Customer is logged in, proceed with GraphQL call
        const query = `query Liveperson {
                        liveperson {
                            email
                            token
                        }
                    }`;

        fetch('/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query
                }),
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                if (data ? .data ? .liveperson) {
                    token = data.data.liveperson.token;
                    callback(token);
                } else {
                    throw new Error('Invalid GraphQL response');
                }
            })
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('GraphQL error:', error);
                callback(null);
            });
    } else {
        // Customer is not logged in, use default identity function
        callback({
            iss: 'https://visualcomfort.com',
            acr: 'loa1',
            sub: '111111111',
        });
    }
};