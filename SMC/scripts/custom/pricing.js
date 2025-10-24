/* eslint-disable no-console */
import {
    events
} from '@dropins/tools/event-bus.js';
import {
    getLoggedInFromLocalStorage,
    getMagentoCache
} from '../storage/util.js';
import {
    getConfigValue
} from '../configs.js';
import {
    getCompanyType
} from '../user-context.js';
import {
    PRODUCT_PRICE_QUERY
} from '../graphql/commerce-queries.js';
// eslint-disable-next-line import/no-cycle
import {
    performMonolithGraphQLQuery
} from '../commerce.js';

const currencyCode = await getConfigValue('commerce-base-currency-code');

/**
 * Update prices based on results from Advanced Prices API
 *
 * @param {products[]} variants
 * @param {string} division
 * @returns {Promise<products[]>}
 *
 * Format of call to Advanced Prices API
 *
 * curl --location
 *   'https://api.visualcomfortco.com/v1/products/prices' \
 * --header 'Content-Type: application/json' \
 * --header 'x-api-key: {{api-token-value}}' \
 * --data '{
 *   "accounts": [
 *       {
 *           "division": "GL",
 *           "account": "272937"
 *       }
 *   ],
 *   "products": [
 *       "700FMBESSS-LED930"
 *   ],
 *   "currency": "USD"
 * }'
 */
export async function getWholesalePricing(variants, division) {
    const magentoCache = getMagentoCache();
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };
    const apiCall = new URL(await getConfigValue('pricing-endpoint-adv'));
    let skuList = [];
    const accounts = [];

    switch (division) {
        case 'tech':
            accounts.push({
                division: 'TE',
                account: magentoCache.customer ? .customerTechId,
            });
            break;
        case 'gl':
            accounts.push({
                division: 'GL',
                account: magentoCache.customer ? .customerGlId,
            });
            break;
        case 'vc':
            accounts.push({
                division: 'VC',
                account: magentoCache.customer ? .customerVcId,
            });
            break;
        default:
            break;
    }

    // If division there is no account, don't get prices
    if (accounts.every((acct) => acct.division && acct.account)) {
        skuList = variants.map((product) => product.sku);
    }

    const data = {
        accounts,
        products: skuList,
        currency: currencyCode,
    };

    const response = await fetch(apiCall, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        return;
    }

    const queryResponse = await response.json();

    // copy prices from queryResponse to product variants
    variants.forEach((productVariant, index) => {
        const price = queryResponse.data.find((pr) => pr.sku === productVariant.sku);
        if (price && !Number.isNaN(parseFloat(price.price))) {
            variants[index].price.regular.amount.value = price.price;
            variants[index].price.final.amount.value = price.price;
        }
    });

    // eslint-disable-next-line consistent-return
    return variants;
}

/**
 * Extracts product range from product variants
 * @returns {{product}}
 */
export function processProductPrice() {
    // Generate price range from product variants
    window.product.priceRange = {
        maximum: {
            roles: ['visible'],
            regular: {
                amount: {
                    currency: window.product.variants[0] ? .price.regular.amount.currency,
                    // eslint-disable-next-line max-len
                    value: window.product.variants.reduce((acc, variant) => Math.max(acc, variant.price.regular.amount.value), 0),
                },
            },
            final: {
                amount: {
                    currency: window.product.variants[0] ? .price.final.amount.currency,
                    // eslint-disable-next-line max-len
                    value: window.product.variants.reduce((acc, variant) => Math.max(acc, variant.price.final.amount.value), 0),
                },
            },
        },
        minimum: {
            roles: ['visible'],
            regular: {
                amount: {
                    currency: window.product.variants[0] ? .price.regular.amount.currency,
                    // eslint-disable-next-line max-len
                    value: window.product.variants.reduce((acc, variant) => Math.min(acc, variant.price.regular.amount.value), 0),
                },
            },
            final: {
                amount: {
                    currency: window.product.variants[0] ? .price.final.amount.currency,
                    // eslint-disable-next-line max-len
                    value: window.product.variants.reduce((acc, variant) => Math.min(acc, variant.price.final.amount.value), 0),
                },
            },
        },
    };
    // Translate roles to visible for price in all variants
    window.product.variants.forEach((variant, index) => {
        window.product.variants[index].price.visible = variant.price.roles.includes('visible');
    });
}

export async function getSignaturePrices(signatureList) {
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('pricing-endpoint'));

    // Fallback to default price list if no price list is found
    const skuList = signatureList.map((product) => product.sku);

    const magentoCache = getMagentoCache();
    const priceListID = magentoCache.customer ? .customerGroupId;

    const data = {
        priceListId: priceListID,
        skus: skuList,
    };

    const response = await fetch(apiCall, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    const queryResponse = await response.json();

    if (!response.ok) {
        return null;
    }

    // copy prices from queryResponse to signatureList
    signatureList.forEach((product, index) => {
        const price = queryResponse.data.find((pr) => pr.sku === product.sku);
        // If we are able to pull a price from the API, update the price in the signatureList
        // Otherwise, leave the price as obtained from PDP
        if (price && !Number.isNaN(parseFloat(price.price))) {
            signatureList[index].price.regular.amount.value = price.price;
            signatureList[index].price.final.amount.value = price.price;
        }
    });

    return signatureList;
}

export async function getBulbTradePrices(bulbData) {
    const skuList = (typeof bulbData === 'string') ? [bulbData] : bulbData.map((bulb) => bulb.sku);
    let result;
    try {
        // eslint-disable-next-line no-undef
        result = await performMonolithGraphQLQuery(
            PRODUCT_PRICE_QUERY, {
                skus: skuList,
                pageSize: 48,
                currentPage: 1,
            },
            false,
            true,
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading trade prices from commerce', error);
        return [];
    }

    if (!result || !result.data || !result.data.products || !result.data.products.items) {
        return [];
    }

    return result.data.products.items.map((product) => ({
        sku: product.sku,
        tradeprice: product.price_range.minimum_price.final_price.value,
    }));
}

export async function loadTradePricesFromCommerce(productSku) {
    const skuList = [productSku];

    let result;
    try {
        result = await performMonolithGraphQLQuery(
            PRODUCT_PRICE_QUERY, {
                skus: skuList,
                pageSize: 48,
                currentPage: 1,
            },
            false,
            true,
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading trade prices from commerce', error);
        return [];
    }

    if (!result || !result.data || !result.data.products || !result.data.products.items) {
        return [];
    }

    return {
        products: result.data.products.items.map((product) => ({
            sku: product.sku,
            price: product.price_range.minimum_price.final_price.value,
            variants: product.variants ? .map((variant) => ({
                sku: variant.product.sku,
                price: variant.product.price_range.minimum_price.final_price.value,
            })),
        })),
    };
}

export async function getTradePrices(productSku) {
    const prices = await loadTradePricesFromCommerce(productSku);

    if (prices.products.length > 0) {
        const product = prices.products.find((prod) => prod.sku === window.product.sku);
        if (product) {
            window.product.variants.forEach((variant, index) => {
                const variantPrice = product.variants.find(
                    (variantProd) => variantProd.sku === variant.sku,
                );
                if (variantPrice) {
                    window.product.variants[index].price.final.amount.value = variantPrice.price;
                }
            });
        }
    }
}

/**
 * Processes pricing for all products on the page
 * @returns {Promise<void>}
 */
export async function fetchAndSetProductPrice() {
    const companyType = getCompanyType();
    const isLoggedIn = getLoggedInFromLocalStorage();
    const division = window.product.attributes.find((attr) => attr.name === 'division') ? .value;

    try {
        if (isLoggedIn) {
            switch (companyType) {
                case 'wholesale':
                    if (division === 'vc') {
                        window.product.variants = await getSignaturePrices(window.product.variants);
                        window.product.isSignature = true;
                    } else {
                        window.product.variants = await getWholesalePricing(
                            window.product.variants,
                            division,
                        );
                    }
                    processProductPrice();
                    break;

                case 'trade':
                    await getTradePrices(window.product.sku);
                    processProductPrice();
                    break;

                case 'retail':
                    processProductPrice();
                    break;

                default:
                    console.warn('Unknown company type:', companyType);
            }
        } else {
            processProductPrice();
        }
        events.emit('eds/price', {
            sku: window.product.sku,
            priceRange: window.product.priceRange,
            variants: window.product.variants.map((variant) => ({
                sku: variant.sku,
                price: variant.price,
            })),
        });
    } catch (error) {
        console.error('Error fetching product price:', error);
        processProductPrice();
        events.emit('eds/price', {
            sku: window.product.sku,
            priceRange: window.product.priceRange,
            variants: window.product.variants.map((variant) => ({
                sku: variant.sku,
                price: variant.price,
            })),
        });
    }
}