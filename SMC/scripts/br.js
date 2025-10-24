/* eslint-disable import/no-cycle */
import {
    getConfigValue,
    getLocale
} from './configs.js';
import {
    getCompanyType,
    CompanyTypes
} from './user-context.js';
import {
    loadTradePrices,
    loadWholesalePrices
} from './load-customer-context.js';
import {
    getMagentoCache
} from './storage/util.js';
import {
    getCookie
} from './utils.js';
/**
 * Make a query to the bloomreach API.
 *
 * The query object does not need to include the auth_key, domain_key, or account_id.
 * These will be added automatically.
 * @param {*} query An object containing the query parameters.
 * @returns {object} An object containing the parsed JSON response.
 */
async function performBloomreachQuery(query) {
    const BASE_URL = await getConfigValue('bloomreach-base-url');

    // Add auth query options
    query.auth_key = await getConfigValue('bloomreach-auth-key');
    query.domain_key = await getConfigValue('bloomreach-domain-key');
    query.account_id = await getConfigValue('bloomreach-account-id');
    query._br_uid_2 = await getCookie('_br_uid_2');

    // Convert the query parameters object to a string
    const queryString = Object.keys(query).map((key) => {
        if (Array.isArray(query[key])) {
            return query[key].map((value) => `${key}=${value}`).join('&');
        }
        return `${key}=${query[key]}`;
    }).join('&');

    let response = await fetch(`${BASE_URL}?${queryString}`, {
        method: 'GET',
    });

    response = response.json();
    return response;
}

/**
 * Constructs a search query object for product search.
 *
 * Requires the following variables:
 * - categoryId or searchTerm
 * - pageSize
 * - currentPage
 *
 * @param {boolean} categorySearch - Indicates whether the search is based on category or keyword.
 * @param {object} variables - The variables object.
 * @returns {object} - The constructed search query object.
 */
function productSearchQuery(categorySearch, variables) {
    const magentoCache = getMagentoCache();
    const customerType = magentoCache ? .customer ? .customerType || null;
    let fqString = '';
    if (customerType !== 'wholesale' && customerType !== 'trade') {
        fqString = '-exclusive_trade_wholesale:"1"';
    }
    const query = {
        'facet.version': '3.0',
        url: 'circalighting',
        request_type: 'search',
        search_type: categorySearch ? 'category' : 'keyword',
        q: categorySearch ? variables.categoryId : variables.phrase,
        efq: fqString,
        fl: 'pid,title,brand,exclusive_trade_wholesale,price,sale_price,low_price,category_filter,thumb_image,sku_thumb_images,sku_swatch_images,sku_color_group,url,price_range,sale_price_range,description,sku_price,series,skuid,designer,sku_sale_price,badge,detail_description,division,is_architech_data,is_pdp',
        rows: variables.pageSize,
        start: (variables.currentPage - 1) * variables.pageSize,
        sort: `${variables.sort}`,
        'stats.field': 'price',
    };

    const urlParams = new URLSearchParams(window.location.search);
    const darkMode = urlParams.get('darkmode');

    if (darkMode !== 'yes') {
        if (variables.filters && variables.filters.length > 0) {
            const validFilters = variables.filters.filter((filter) => filter.value &&
                filter.value.length > 0);
            if (validFilters.length > 0) {
                query.fq = validFilters.map((filter) => {
                    if (filter.attribute === 'price') {
                        return `price:[${Math.floor(filter.value[0])} TO ${Math.ceil(filter.value[1])}]`;
                    }
                    return `${filter.attribute}:"${filter.value.map((value) => value.replaceAll('"', '\\"').replaceAll('_', ' ')).join('" OR "')}"`;
                });
                query.fq.push('is_pdp:"0"', 'is_architech_data:"0"');
            } else {
                // Reset to default if all filters are cleared
                query.fq = 'is_pdp:"0",is_architech_data:"0"';
            }
        } else {
            // Reset to default if no filters are present
            query.fq = 'is_pdp:"0",is_architech_data:"0"';
        }
    } else if (variables.filters) {
        query.fq = variables.filters.map((filter) => {
            if (filter.attribute === 'price') {
                return `price:[${Math.floor(filter.value[0])} TO ${Math.ceil(filter.value[1])}]`;
            }
            return `${filter.attribute}:"${filter.value.map((value) => value.replaceAll('"', '\\"').replaceAll('_', ' ')).join('" OR "')}"`;
        });
    }

    return query;
}

/**
 * Converts Bloomreach API response to look like a Commerce response
 * @param {object} product The Bloomreach product object
 * @returns {object} The converted product object
 */
function convertBloomreachProduct(product) {
    // eslint-disable-next-line no-unused-vars
    const {
        countryCode
    } = getLocale();
    // eslint-disable-next-line max-len
    //  const productUrl = (countryCode !== 'us') ? product.url : `/us/p${product.url.replace(/\/$/, '')}`;
    const productUrl = product.url;

    return {
        id: product.pid,
        sku: product.pid,
        name: product.title,
        series: product.series,
        category: product.category_filter,
        priceRange: product.price_range,
        salePriceRange: product.sale_price_range,
        price: {
            regular: {
                amount: {
                    value: product.price,
                },
            },
            final: {
                amount: {
                    value: product.sale_price,
                },
            },
        },
        images: [{
            url: product.thumb_image
        }, ],
        designer: product.designer,
        brand: product.brand,
        division: product.division,
        url: productUrl,
        variants: product.variants.map((variant) => ({
            id: variant.skuid,
            sku: variant.skuid,
            name: variant.detail_description,
            badge: variant.badge,
            series: variant.series,
            category: variant.category_filter,
            isArch: variant.is_architech_data,
            isArchPdp: variant.is_pdp,
            price: {
                regular: {
                    amount: {
                        value: variant.sku_price,
                    },
                },
                final: {
                    amount: {
                        value: variant.sku_sale_price,
                    },
                },
            },
            images: variant.sku_swatch_images.map((image) => ({
                url: image
            })),
        })),
    };
}

function convertBloomreachFacet(facet) {
    if (facet.type === 'text') {
        return {
            title: facet.name,
            attribute: facet.name,
            buckets: facet.value.map((bucket) => ({
                title: bucket.name,
                __typename: 'ScalarBucket',
                id: bucket.name,
                count: bucket.count,
            })),
        };
    }
    if (facet.type === 'number_stats') {
        return {
            title: facet.name,
            attribute: facet.name,
            buckets: [{
                __typename: 'RangeBucket',
                from: facet.value.start,
                to: facet.value.end,
            }],
        };
    }
    // eslint-disable-next-line no-console
    console.warn('Unknown facet type', facet.type, facet);
    return {};
}

/**
 * Transforms prices based on the users type.
 * @param {*} products the list of products
 * @returns {*} the list of products with prices transformed
 */
async function processPrices(products) {
    const companyType = getCompanyType();
    const {
        countryCode
    } = getLocale();

    switch (companyType) {
        case CompanyTypes.Wholesale:
            {
                const priceLoader = countryCode === 'us' ? loadWholesalePrices : loadTradePrices;
                await priceLoader(products);
                return products;
            }
        case CompanyTypes.Trade:
        case CompanyTypes.Employee:
            await loadTradePrices(products);
            return products;
        default:
            // Guest or Retail use prices from bloomreach - no transformation needed
            return products;
    }
}

/**
 * Makes a query to the bloomreach API based on the provided state.
 *
 * @param {Object} state - The state object containing the necessary information
 *                         for the Bloomreach query.
 * @returns {Object} - An object containing the parsed response data.
 */
export default async function loadFromBloomreach(state) {
    try {
        const variables = {
            pageSize: state.currentPageSize,
            currentPage: state.currentPage,
            sort: state.sort,
        };

        variables.phrase = state.type === 'search' || state.type === 'keyword' ? state.searchTerm : '';

        if (Object.keys(state.filters).length > 0) {
            variables.filters = [];
            Object.keys(state.filters).forEach((key) => {
                variables.filters.push({
                    attribute: key,
                    value: state.filters[key]
                });
            });
        }

        if (state.type === 'category' && state.category.id) {
            variables.categoryId = state.category.id;
        }

        let response;
        if (state.type === 'keyword') {
            response = await performBloomreachQuery(productSearchQuery(false, variables));
        } else {
            response = await performBloomreachQuery(productSearchQuery(state.type === 'category', variables));
        }

        if (!response.response) {
            throw new Error(`Invalid response from Bloomreach - ${response.message}`);
        }

        // Redirect SRP to URL provided by bloomreach
        let isRedirect = false;
        if (response.keywordRedirect) {
            isRedirect = true;
            // window.location = `https://${response.keywordRedirect['redirected url']}`;
            const redirectedURL = response.keywordRedirect['redirected url'];
            const urlParts = redirectedURL.split('/');
            window.location = `/${urlParts.slice(1).join('/')}`;
        }
        // Craft response object
        const processedResponse = {
            pages: Math.ceil(response.response.numFound / variables.pageSize),
            products: {
                items: response.response.docs
                    .map((product) => convertBloomreachProduct(product)),
                total: response.response.numFound,
            },

            isRedirect,
            facets: response.facet_counts.facets.map((facet) => convertBloomreachFacet(facet)),
        };

        processedResponse.products.items = await processPrices(processedResponse.products.items);

        if (processedResponse.products.items) {
            processedResponse.products.items.sort((a, b) => {
                if (a.price && b.price) {
                    const priceA = parseFloat(a.price.final.amount.value);
                    const priceB = parseFloat(b.price.final.amount.value);
                    if (variables.sort === 'price asc') {
                        return priceA - priceB;
                    }
                    if (variables.sort === 'price desc') {
                        return priceB - priceA;
                    }
                }
                return 0;
            });
        }
        return processedResponse;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading products', e);
        return {
            pages: 1,
            products: {
                items: [],
                total: 0,
            },
            facets: [],
        };
    }
}