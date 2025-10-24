/* eslint-disable camelcase */
/* eslint-disable import/no-cycle */
// eslint-disable-next-line no-unused-vars
import {
    sampleRUM,
    loadScript
} from './aem.js';
import {
    getConfigValue
} from './configs.js';
import {
    setAttributes
} from './utils.js';
// import { getConsent } from './scripts.js';

// Our Designers Highlight
async function showDesignerHighlights() {
    const designerHighlights = document.querySelectorAll('.our-designers-highlight');
    if (designerHighlights.length > 0) {
        import ('../blocks/our-designers-highlight/our-designers-highlight.js').then(({
            loadHighlight
        }) => {
            designerHighlights.forEach(async (block) => {
                await loadHighlight(block, block.dataset.pathPrefix);
                block.parentElement.parentElement.classList.remove('hidden');
            });
        });
    }
}

showDesignerHighlights();

// GTM script delayed load
loadScript(await getConfigValue('gtm-container-url'), {
    async: true
});

// One Trust Script for cookie settings
function appendOneTrustScript() {
    const script = document.createElement('script');
    setAttributes(script, {
        src: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js',
        type: 'text/javascript',
        charset: 'UTF-8',
        'data-domain-script': '7516f616-71f9-4d8a-8637-6f189d4d0511',
        'data-document-language': 'true',
        async: true,
    });
    const scriptContent = document.createTextNode(`
    function OptanonWrapper() { }
  `);
    script.appendChild(scriptContent);
    document.querySelector('body').append(script);
}

if (/\.visualcomfort\.com$/.test(window.location.hostname)) {
    appendOneTrustScript();
}

// Human Security
async function appendHumanSecurityScript() {
    const scriptSrc = await getConfigValue('human-security-script-src');
    const script = document.createElement('script');
    setAttributes(script, {
        src: scriptSrc,
        async: 'true',
    });
    document.querySelector('body').append(script);
}

await appendHumanSecurityScript();

// CJ Affiliates
async function appendCjScript() {
    const tagId = await getConfigValue('cj-token-id');
    const script = document.createElement('script');
    const scriptContent = document.createTextNode(`
  (function(a,b,c,d){
    a='//www.mczbf.com/tags/${tagId}/tag.js';
    b=document;c='script';d=b.createElement(c);d.src=a;
    d.type='text/java'+c;d.async=true;
    d.id='cjapitag';
    a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a)
    })();
  `);
    script.appendChild(scriptContent);
    document.head.appendChild(script);
}

await appendCjScript();

// Not using commerce SDK for tracking so commenting out this code
// Load Commerce events SDK and collector
/* if (getConsent('commerce-collection')) {
  const config = {
    environmentId: await getConfigValue('commerce-environment-id'),
    environment: await getConfigValue('commerce-environment') === 'Production'
      ? 'prod' : 'non-prod',
    storeUrl: await getConfigValue('commerce-store-url'),
    websiteId: parseInt(await getConfigValue('commerce-website-id'), 10),
    websiteCode: await getConfigValue('commerce-website-code'),
    storeId: parseInt(await getConfigValue('commerce-store-id'), 10),
    storeCode: await getConfigValue('commerce-store-code'),
    storeViewId: parseInt(await getConfigValue('commerce-store-view-id'), 10),
    storeViewCode: await getConfigValue('commerce-store-view-code'),
    websiteName: await getConfigValue('commerce-website-name'),
    storeName: await getConfigValue('commerce-store-name'),
    storeViewName: await getConfigValue('commerce-store-view-name'),
    baseCurrencyCode: await getConfigValue('commerce-base-currency-code'),
    storeViewCurrencyCode: await getConfigValue('commerce-base-currency-code'),
    storefrontTemplate: 'Franklin',
  };

  window.adobeDataLayer.push(
    { storefrontInstanceContext: config },
    { eventForwardingContext: { commerce: true, aep: false } },
  );

  // Load events SDK and collector
  import('./commerce-events-sdk.js');
  import('./commerce-events-collector.js');
}
 */