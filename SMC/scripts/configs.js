import {
    countries
} from './constants.js';

/**
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
export function getOrigin() {
    const {
        location
    } = window;
    return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

/**
 * Returns the true of the current page in the browser.mac
 * If the page is running in a iframe with srcdoc,
 * the ancestor origin + the path query param is returned.
 * @returns {String} The href of the current page or the href of the block running in the library
 */
export function getHref() {
    if (window.location.href !== 'about:srcdoc') return window.location.href;

    const {
        location: parentLocation
    } = window.parent;
    const urlParams = new URLSearchParams(parentLocation.search);
    return `${parentLocation.origin}${urlParams.get('path')}`;
}

/**
 * This function calculates the environment in which the site is running based on the URL.
 * It defaults to 'prod'. In non 'prod' environments, the value can be overwritten using
 * the 'environment' key in sessionStorage.
 *
 * @returns {string} - environment identifier (dev, stage or prod).
 */
export const calcEnvironment = () => {
    const {
        hostname,
        href
    } = window.location;

    if (
        hostname === 'www.visualcomfort.com' ||
        hostname === 'visualcomfort.com' ||
        href.includes('adobe-edge--visualcomfort')
    ) {
        return 'prod';
    }

    if (hostname === 'localhost') return 'stage2';

    // check for stage subdomain (e.g., stage, stage2, stage3, …)
    const stageSubdomain = hostname.match(/^(stage\d*)\./);
    if (stageSubdomain) return stageSubdomain[1];

    // check for adobe-edge stage pattern in the URL
    const stageEdge = href.match(/(stage\d*)--adobe-edge-stage--visualcomfort/);
    if (stageEdge) return stageEdge[1];

    // if some other branch on adobe-edge-stage use stage
    if (href.includes('adobe-edge-stage--visualcomfort')) {
        return 'stage';
    }

    // Fallback to prod
    return 'prod';
};

export const getLocale = (url) => {
    const defaultLocale = 'us';
    const targetUrl = url ? new URL(url) : window.location;
    const {
        pathname
    } = targetUrl;
    const pathParts = pathname.split('/');
    const detectedLocale = pathParts[1] || defaultLocale;
    const countryMeta = countries.find((country) => country.param ===
        detectedLocale) || countries.find((c) => c.param === defaultLocale);
    const baseUri = `/${countryMeta.param}`;
    const commerceBaseUri = countryMeta.param === defaultLocale ? '' : baseUri;
    const isDefaultLocale = countryMeta.param === defaultLocale;

    return {
        isDefaultLocale,
        baseUri,
        commerceBaseUri,
        language: detectedLocale,
        countryCode: countryMeta.param,
        countryFlag: countryMeta.flag,
        countryName: countryMeta.name,
        countryCurrency: countryMeta.currency,
        href: countryMeta.href,
        locale: countryMeta.locale,
    };
};

function buildConfigURL(environment, countryCode) {
    const origin = getOrigin();
    return new URL(`${origin}/configs/${countryCode}/config-${environment}.json`);
}

const getConfigForEnvironment = async (environment) => {
    const env = environment || calcEnvironment();
    const {
        countryCode
    } = getLocale();
    let configJSON = window.sessionStorage.getItem(`config:${env}:${countryCode}`);
    if (!configJSON) {
        configJSON = await fetch(buildConfigURL(env, countryCode)).then((res) => res.text());
        window.sessionStorage.setItem(`config:${env}:${countryCode}`, configJSON);
    }
    return configJSON;
};

export function getCountryCode() {
    const countryElem = document.querySelector('header #dropdownMenuButton .action.flag');
    if (countryElem === null || countryElem === undefined) {
        return 'us';
    }
    const nClasses = countryElem.classList.length;
    const flag = countryElem.classList[nClasses - 1];
    if (flag.startsWith('flag') && flag.length > 'flag'.length) {
        return flag.replace('flag', '')
            .toLowerCase();
    }
    return 'us';
}

/**
 * This function retrieves a configuration value for a given environment.
 *
 * @param {string} configParam - The configuration parameter to retrieve.
 * @param {string} [environment] - Optional, overwrite the current environment.
 * @returns {Promise<string|undefined>} - The value of the configuration parameter, or undefined.
 */
export const getConfigValue = async (configParam, environment) => {
    // TODO Remove
    const env = environment || calcEnvironment();
    // const env = 'stage';
    const configJSON = await getConfigForEnvironment(env);
    const configElements = JSON.parse(configJSON).data;
    return configElements.find((c) => c.key === configParam) ? .value;
};

export const getCountries = async () => {
    const origin = getOrigin();
    const disabledLocalesConfigUrl = new URL(`${origin}${window.hlx.codeBasePath}/disabled-locales.json`);

    try {
        const disabledLocalesConfig = await fetch(disabledLocalesConfigUrl);

        if (!disabledLocalesConfig.ok) {
            throw new Error('Failed to get disabled locales config.');
        }

        const {
            data
        } = await disabledLocalesConfig.json();

        return countries.filter((country) => !data.some((dc) => dc.country === country.param && dc.disabled === 'true'));
    } catch {
        // do nothing.
    }

    return countries;
};

export const getSiteMessages = async (key) => {
    const origin = getOrigin();
    const siteMesasgesConfigUrl = new URL(`${origin}${window.hlx.codeBasePath}/us/vcc-site-messages.json`);
    const siteMesasgesConfig = await fetch(siteMesasgesConfigUrl);

    if (!siteMesasgesConfig.ok) {
        throw new Error('Failed to get site messages config.');
    }

    const {
        data
    } = await siteMesasgesConfig.json();
    const messageObj = data.find((msg) => msg.Key === key);

    return messageObj ? messageObj.Value : null;
};