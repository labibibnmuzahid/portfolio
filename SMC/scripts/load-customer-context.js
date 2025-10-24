/* eslint-disable import/no-cycle */
import {
    getProduct,
    performMonolithGraphQLQuery
} from './commerce.js';
import {
    getCompanyTypeFromQuery
} from './user-context.js';
import {
    getConfigValue,
    calcEnvironment
} from './configs.js';
import {
    getMagentoCache
} from './storage/util.js';

const defaultPageSize = 48;
const currencyCode = await getConfigValue('commerce-base-currency-code');

const PRODUCT_PRICE_QUERY = `query ProductPriceQuery($skus: [String]!, $pageSize: Int!, $currentPage: Int!) {
  products( filter: { sku: { in: $skus } } pageSize: $pageSize currentPage: $currentPage ) {
    items {
      sku
      price_range {
        minimum_price {
          regular_price {
            value
          }
          final_price {
            value
          }
        }
        maximum_price {
          regular_price {
            value
          }
          final_price {
            value
          }
        }
      }
      ... on ConfigurableProduct {
        variants {
          product {
            sku
            price_range {
              minimum_price {
                regular_price {
                  value
                }
                final_price {
                  value
                }
              }
              maximum_price {
                regular_price {
                  value
                }
                final_price {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
}`;

/**
 * Loads a list of trade prices from commerce.
 * @param {*} products The list of products. Products must have a sku, and can have variants.
 * @returns A list of objects with sku and price. This list includes the prices of the variants.
 *          Returns an empty list if commerce fails to return a valid response.
 */
export async function loadTradePriceFromCommerce(products) {
    const skuList = [];
    products.forEach((product) => {
        skuList.push(product.sku);
    });

    let result;
    try {
        result = await performMonolithGraphQLQuery(
            PRODUCT_PRICE_QUERY, {
                skus: skuList,
                pageSize: defaultPageSize,
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

    const skuToPrice = [];
    result.data.products.items.forEach((product) => {
        skuToPrice.push({
            sku: product.sku,
            price: product.price_range.minimum_price.final_price.value,
        });
        if (product.variants !== null && product.variants.length > 0) {
            product ? .variants.forEach((variant) => {
                skuToPrice.push({
                    sku: variant.product.sku,
                    price: variant.product.price_range.minimum_price.final_price.value,
                });
            });
        }
    });

    return skuToPrice;
}

export async function loadTradePrices(products) {
    const prices = await loadTradePriceFromCommerce(products);
    products.forEach((product) => {
        const priceObj = prices.find((price) => price.sku === product.sku);
        if (priceObj) {
            product.tradeprice = {
                regular: {
                    amount: {
                        value: priceObj.price,
                    },
                },
                final: {
                    amount: {
                        value: priceObj.price,
                    },
                },
            };
        } else {
            delete product.price;
        }

        // Lookup prices for variants
        product.variants.forEach((variant) => {
            const variantPriceObj = prices.find((price) => price.sku === variant.sku);
            if (variantPriceObj) {
                variant.tradeprice = {
                    regular: {
                        amount: {
                            value: variantPriceObj.price,
                        },
                    },
                    final: {
                        amount: {
                            value: variantPriceObj.price,
                        },
                    },
                };
            } else {
                delete variant.price;
            }
        });
    });

    return products;
}

export async function loadTradePriceFromCommercePdp(products) {
    const skuList = [];
    skuList.push(products.sku);

    let result;
    try {
        result = await performMonolithGraphQLQuery(
            PRODUCT_PRICE_QUERY, {
                skus: skuList,
                pageSize: defaultPageSize,
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

    const skuToPrice = [];
    result.data.products.items.forEach((product) => {
        skuToPrice.push({
            sku: product.sku,
            price: product.price_range.minimum_price.final_price.value,
        });
        product.variants.forEach((variant) => {
            skuToPrice.push({
                sku: variant.product.sku,
                price: variant.product.price_range.minimum_price.final_price.value,
            });
        });
    });

    return skuToPrice;
}

export async function loadTradePricesPdp(products) {
    const prices = await loadTradePriceFromCommercePdp(products);

    const priceObj = prices.find((price) => price.sku === products.sku);

    if (priceObj) {
        products.tradeprice = {
            regular: {
                amount: {
                    value: priceObj.price,
                },
            },
            final: {
                amount: {
                    value: priceObj.price,
                },
            },
        };
    } else {
        delete products.price;
    }

    // Lookup prices for variants
    products ? .variants ? .forEach((variant) => {
        const variantPriceObj = prices.find((price) => price.sku === variant.sku);
        if (variantPriceObj) {
            variant.tradeprice = {
                regular: {
                    amount: {
                        value: variantPriceObj.price,
                    },
                },
                final: {
                    amount: {
                        value: variantPriceObj.price,
                    },
                },
            };
        } else {
            delete variant.price;
        }
    });

    return products;
}

/**
 * Update prices based on results from Signature Prices API
 *
 * @param {products[]} signatureList
 * @returns
 *
 * Format of call to Signature Prices API
 *
 * curl --location
 *     'https://api.visualcomfortco.com/v1/products/prices/signature' \
 *  --header 'Content-Type: application/json' \
 *  --header 'x-api-key: {{api-token-value}}' \
 *  --data '{
 *   "priceListId": 50,
 *   "skus": [
 *       "81134 AN",
 *       "AH 3500GM",
 *   ],
 * }'
 */
export async function transformSignaturePrices(signatureList) {
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('pricing-endpoint'));
    // put all variant skus in signatureList in array and set all prices to $0
    // should always get a price from signature pricing API, but if we don't
    // $0 amounts will not be shown in the PLP
    const skuList = [];
    signatureList.forEach((product) => {
        product.price.regular.amount.value = 0;
        product.price.final.amount.value = 0;
        product.variants.forEach((variant) => {
            variant.price.regular.amount.value = 0;
            variant.price.final.amount.value = 0;
            skuList.push(variant.sku);
        });
    });

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
    queryResponse.data.forEach((price) => {
        const sigproduct = signatureList.find((product) => product.variants[0].sku === price.sku);
        if (sigproduct) {
            sigproduct.price.regular.amount.value = price.price;
            sigproduct.price.final.amount.value = price.price;

            // go back through signatureList and update prices
            signatureList.forEach((product) => {
                product.variants.forEach((variant) => {
                    const variantPrice = queryResponse.data.find((p) => p.sku === variant.sku);
                    if (variantPrice) {
                        variant.price.regular.amount.value = variantPrice.price;
                        variant.price.final.amount.value = variantPrice.price;
                    }
                });
            });
        }
    });

    return signatureList;
}

/**
 * Update prices based on results from Advanced Prices API
 *
 * @param {products[]} advancedPricingAPIList
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
export async function transformAdvancedPricingAPIPrices(advancedPricingAPIList) {
    const magentoCache = getMagentoCache();
    const customerTechId = magentoCache.customer ? .customerTechId || '';
    const customerGlId = magentoCache.customer ? .customerGlId || '';
    const customerVcId = magentoCache.customer ? .customerVcId || '';

    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('pricing-endpoint-adv'));
    const skuList = [];
    advancedPricingAPIList.forEach((product) => {
        // only add skus to list if they meet the criteria
        if (product.division === 'tech' &&
            !customerTechId) {
            // Does not qualify for Advanced Pricing
        } else if (product.division === 'gl' &&
            !customerGlId) {
            // Does not qualify for Advanced Pricing
        } else {
            product.variants.forEach((variant) => {
                skuList.push(variant.sku);
            });
        }
    });

    if (skuList.length === 0) {
        return;
    }

    const accounts = [];
    if (customerTechId) {
        accounts.push({
            division: 'TE',
            account: customerTechId,
        });
    }

    if (customerGlId) {
        accounts.push({
            division: 'GL',
            account: customerGlId,
        });
    }

    if (customerVcId) {
        accounts.push({
            division: 'VC',
            account: customerVcId,
        });
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
    advancedPricingAPIList.forEach((product) => {
        const price = queryResponse.data.find((p) => p.sku === product.variants[0].sku);
        if (price) {
            product.price.regular.amount.value = price.price;
            product.price.final.amount.value = price.price;

            product.variants.forEach((variant) => {
                const variantPrice = queryResponse.data.find((p) => p.sku === variant.sku);
                variant.price.regular.amount.value = variantPrice && variantPrice.price != null ?
                    variantPrice.price : 0;
                variant.price.final.amount.value = variantPrice && variantPrice.price != null ?
                    variantPrice.price : 0;
            });
        }
    });
}

export async function transformAdvancedPricingAPIPricesPdp(variants, division) {
    const magentoCache = getMagentoCache();
    const customerTechId = magentoCache.customer ? .customerTechId || '';
    const customerGlId = magentoCache.customer ? .customerGlId || '';
    const customerVcId = magentoCache.customer ? .customerVcId || '';

    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('pricing-endpoint-adv'));
    const skuList = [];

    if (division === 'tech' &&
        !customerTechId) {
        // Does not qualify for Advanced Pricing
    } else if (division === 'gl' &&
        !customerGlId) {
        // Does not qualify for Advanced Pricing
    } else {
        variants.forEach((variant) => {
            skuList.push(variant.sku);
        });
    }

    const accounts = [];
    if (customerTechId) {
        accounts.push({
            division: 'TE',
            account: customerTechId,
        });
    }

    if (customerGlId) {
        accounts.push({
            division: 'GL',
            account: customerGlId,
        });
    }

    if (customerVcId) {
        accounts.push({
            division: 'VC',
            account: customerVcId,
        });
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

    // copy prices from queryResponse to productVariant
    queryResponse.data.forEach((price) => {
        const productVariant = variants.find((variant) => variant.sku === price.sku);
        if (productVariant) {
            productVariant.regularPrice = price.price;
            productVariant.finalPrice = price.price;
        }
    });

    // eslint-disable-next-line consistent-return
    return variants;
}

export async function transformSignaturePricesPdp(signatureList) {
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': await getConfigValue('pricing-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('pricing-endpoint'));
    // put all variant skus in signatureList in array and set all prices to $0
    // should always get a price from signature pricing API, but if we don't
    // $0 amounts will not be shown in the PLP
    const skuList = [];
    signatureList.forEach((product) => {
        product.regularPrice = 0;
        product.finalPrice = 0;
        skuList.push(product.sku);
    });

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
    queryResponse.data.forEach((price) => {
        const sigproduct = signatureList.find((product) => product.sku === price.sku);
        if (sigproduct) {
            sigproduct.regularPrice = price.price;
            sigproduct.finalPrice = price.price;
        }
    });

    return signatureList;
}

export async function loadWholesalePrices(products) {
    // write to localstorage for testing
    if (getCompanyTypeFromQuery() === 'wholesale' && calcEnvironment() === 'dev') {
        const urlParams = new URLSearchParams(window.location.search);
        const customerGroupId = urlParams.get('customerGroupId') ? urlParams.get('customerGroupId') : 51;
        const customerTechId = urlParams.get('customerTechId') ? urlParams.get('customerTechId') : 0;
        const customerGlId = urlParams.get('customerGlId') ? urlParams.get('customerGlId') : '45046';
        const customerVcId = urlParams.get('customerVcId') ? urlParams.get('customerVcId') : '07793GA';
        const localCacheJSON = {
            customerGroupId,
            customerTechId,
            customerGlId,
            customerVcId,
        };
        window.localStorage.setItem('ds-customer', JSON.stringify(localCacheJSON));

        window.localStorage.setItem(
            'mage-cache-timeout',
            JSON.stringify(
                new Date(new Date().getTime() + 60 * 60000).toISOString(),
            ),
        );
    }

    const signatureList = [];
    const advancedPricingAPIList = [];

    products.forEach((product) => {
        if (product.division === 'vc') {
            signatureList.push(product);
        } else {
            advancedPricingAPIList.push(product);
        }
    });

    if (signatureList.length > 0) {
        await transformSignaturePrices(signatureList);
    }

    if (advancedPricingAPIList.length > 0) {
        await transformAdvancedPricingAPIPrices(advancedPricingAPIList);
    }
}

export async function getRealTimePricesForGuest(sku) {
    try {
        const result = await getProduct(sku);
        return result;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching real-time prices for guest user:', error);
        return null;
    }
}