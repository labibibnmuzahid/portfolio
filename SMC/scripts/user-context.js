import {
    getMagentoCache
} from './storage/util.js';
import {
    calcEnvironment
} from './configs.js';

const VISUAL_COMFORT_COMMERCE_CACHE_STORAGE_KEY = 'ds-customer';

export const CompanyTypes = {
    Guest: 'guest',
    Wholesale: 'wholesale',
    Employee: 'employee',
    Trade: 'trade',
    Retail: 'retail',
};

export function getCompanyTypeFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('companyType');
}

/**
 * Returns the customer type based on the company type
 *
 * @returns {string} of CompanyType
 */
export function getCompanyType() {
    if (getCompanyTypeFromQuery() !== '' && calcEnvironment() === 'dev') {
        // for testing! for example to test trade add ?companyType=trade to end of url
        const companyType = getCompanyTypeFromQuery();
        if (companyType) {
            return companyType.toLocaleLowerCase();
        }
    }

    const magentoCache = getMagentoCache();
    const companyType = magentoCache.customer ? .companyType;

    if (!Object.values(CompanyTypes).includes(companyType)) {
        return CompanyTypes.Guest;
    }

    return companyType;
}

/**
 * Returns boolean if additional price call is needed to other services
 *
 * @returns {boolean}
 */
export function isAdditionalPriceCallNeeded() {
    const companyType = getCompanyType();

    return ![CompanyTypes.Guest, CompanyTypes.Retail].includes(companyType);
}

export function getVisualComfortCommerceData(debug = false) {
    return getMagentoCache(VISUAL_COMFORT_COMMERCE_CACHE_STORAGE_KEY, debug);
}