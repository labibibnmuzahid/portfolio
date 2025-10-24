import {
    getConfigValue,
    getLocale
} from './configs.js';
import {
    getConsent
} from './scripts.js';
import {
    getMagentoCache
} from '../scripts/storage/util.js';
import {
    getCookie
} from './utils.js';

/* Common query fragments */
export const priceFieldsFragment = `fragment priceFields on ProductViewPrice {
  roles
  regular {
      amount {
          currency
          value
      }
  }
  final {
      amount {
          currency
          value
      }
  }
}`;

/* Queries PDP */
export const refineProductQuery = `query RefineProductQuery($sku: String!, $optionIds: [String!]!) {
  refineProduct(
    sku: $sku,
    optionIds: $optionIds
  ) {
    images(roles: []) {
      url
      roles
      label
    }
    ... on SimpleProductView {
      price {
        ...priceFields
      }
    }
    addToCartAllowed
  }
}
${priceFieldsFragment}`;

export const productDetailQuery = `query ProductQuery($sku: String!) {
  products(skus: [$sku]) {
    __typename
    externalId
    sku
    name
    description
    shortDescription
    urlKey
    inStock
    metaTitle
    metaKeyword
    metaDescription
    images(roles: []) {
      url
      label
      roles
    }
    attributes(roles: []) {
      name
      label
      value
      roles
    }
    ... on SimpleProductView {
      price {
        ...priceFields
      }
    }
    ... on ComplexProductView {
      options {
        id
        title
        required
        values {
          id
          title
          inStock
          ...on ProductViewOptionValueSwatch {
            type
            value
          }
        }
      }
      priceRange {
        maximum {
          ...priceFields
        }
        minimum {
          ...priceFields
        }
      }
    }
  }
  variants(sku: $sku) {
    variants {
    selections
      product {
        __typename
        sku
        name
        urlKey
        inStock
        images(roles: "thumbnail") {
          url
          label
          roles
        }
        attributes(roles: []) {
          name
          label
          value
          roles
        }
        ... on SimpleProductView {
          price {
            ...priceFields
          }
        }
      }
    }
    cursor
  }
}
${priceFieldsFragment}`;

const variantsQuery = `query($sku: String!, $optionIds: [String!], $pageSize: Int, $cursor: String) {
  variants(sku: $sku, optionIds: $optionIds, pageSize: $pageSize, cursor: $cursor) {
    variants {
    selections
      product {
        __typename
        sku
        name
        urlKey
        inStock
        images(roles: "thumbnail") {
          url
          label
          roles
        }

      }
    }
    cursor
  }
}
`;

const accessoriesProductsQuery = `query ProductsBySkus($skus: [String!]!) {
  products(filter: { sku: { in: $skus } }) {
    items {
      sku
      name
      price {
        regularPrice {
          amount {
            currency
            value
          }
        }
      }
      image {
        url
      }
      url_key
    }
  }
}`;


/* Common functionality */

export async function performCatalogServiceQuery(query, variables) {
    const headers = {
        'Content-Type': 'application/json',
        'Magento-Environment-Id': await getConfigValue('commerce-environment-id'),
        'Magento-Website-Code': await getConfigValue('commerce-website-code'),
        'Magento-Store-View-Code': await getConfigValue('commerce-store-view-code'),
        'Magento-Store-Code': await getConfigValue('commerce-store-code'),
        'Magento-Customer-Group': await getConfigValue('commerce-customer-group'),
        'x-api-key': await getConfigValue('commerce-x-api-key'),
    };

    const apiCall = new URL(await getConfigValue('commerce-endpoint'));
    apiCall.searchParams.append('query', query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ')
        .replace(/\s\s+/g, ' '));
    apiCall.searchParams.append('variables', variables ? JSON.stringify(variables) : null);

    const response = await fetch(apiCall, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        return null;
    }

    const queryResponse = await response.json();

    return queryResponse.data;
}

export function getSignInToken() {
    const magentoCache = getMagentoCache();
    return magentoCache['side-by-side'] ? .token;
}

export async function performMonolithGraphQLQuery(query, variables, GET = true, USE_TOKEN = false) {
    const GRAPHQL_ENDPOINT = await getConfigValue('commerce-core-endpoint');

    const headers = {
        'Content-Type': 'application/json',
        Store: await getConfigValue('commerce-store-view-code'),
    };

    if (USE_TOKEN) {
        if (typeof USE_TOKEN === 'string') {
            headers.Authorization = `Bearer ${USE_TOKEN}`;
        } else {
            const token = getSignInToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }
    }

    let response;
    if (!GET) {
        response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ').replace(/\s\s+/g, ' '),
                variables,
            }),
        });
    } else {
        const endpoint = new URL(GRAPHQL_ENDPOINT);
        endpoint.searchParams.set('query', query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ').replace(/\s\s+/g, ' '));
        endpoint.searchParams.set('variables', JSON.stringify(variables));
        response = await fetch(
            endpoint.toString(), {
                headers
            },
        );
    }

    if (!response.ok) {
        return null;
    }

    return response.json();
}

export function renderPrice(product, format, html = (strings, ...values) => strings.reduce((result, string, i) => result + string + (values[i] || ''), ''), Fragment = null, customerGroupPrices = null, companyType) {
    const {
        countryCode
    } = getLocale()
    if (product.price) {
        const {
            regular,
            final
        } = product.price;
        if (companyType === 'wholesale' && countryCode === 'us') {
            if (final.amount.value === 0 || regular.amount.value === 0) return;
            if (product.variants) {
                const priceRangeHtml = renderVariantPriceRange(
                    product.variants,
                    variant => variant.price.final.amount.value,
                    format,
                    html,
                    Fragment
                );
                if (priceRangeHtml) return priceRangeHtml;
                if (regular.amount.value === final.amount.value) {
                    return html `<span class="price-final">${format(final.amount.value)}</span>`;
                }
            } else {
                if (regular.amount.value === final.amount.value) {
                    return html `<span class="price-final">${format(final.amount.value)}</span>`;
                }
            }
        } else if (companyType === 'wholesale') {
            if (product.tradeprice) {
                if (product.variants) {
                    const priceRangeHtml = renderVariantPriceRange(
                        product.variants,
                        variant => variant.tradeprice ? .final.amount.value || 0,
                        format,
                        html,
                        Fragment
                    );
                    if (priceRangeHtml) return priceRangeHtml;
                }
                return html `<span class="price-final">${format(product.tradeprice.final.amount.value)}</span>`;
            }
        }

        if (companyType === 'trade') {
            if (product.tradeprice) {
                if (product.variants) {
                    const variantTradePrices = product.variants.map(variant => {
                        if (variant.tradeprice) {
                            return variant.tradeprice.final.amount.value;
                        } else {
                            return 0;
                        }
                    });
                    const variantFilteredPrices = variantTradePrices.filter(price => price !== 0);
                    // Calculate minimum and maximum trade prices from the array
                    const minPriceTrade = Math.min(...variantFilteredPrices);
                    const maxPriceTrade = Math.max(...variantFilteredPrices);
                    if (variantFilteredPrices.length > 0 && minPriceTrade !== maxPriceTrade) {
                        if (product.priceRange) {
                            const [minPrice, maxPrice] = product.priceRange;
                            return html `
              <${Fragment}>
              <span class="price-range-sale">
                  <span class="price-regular">${format(minPrice)} - ${format(maxPrice)}</span>
                  <span class="price-range">
                      <span class="sale-label">TRADE </span>
                      ${format(minPriceTrade)} - ${format(maxPriceTrade)}
                  </span>
              </span>
              </${Fragment}>
              `;
                        }
                    } else {
                        return html `<${Fragment}>
            <span class="price-regular">${format(regular.amount.value)}</span> <span class="price-final"><span class="sale-label">TRADE</span> ${format(product.tradeprice.final.amount.value)}</span>
            </${Fragment}>`
                    }
                } else {
                    return html `<${Fragment}>
          <span class="price-regular">${format(regular.amount.value)}</span> <span class="price-final"><span class="sale-label">TRADE</span> ${format(product.tradeprice.final.amount.value)}</span>
        </${Fragment}>`
                }
            }
        }
    }
    if (companyType === 'retail' || companyType === 'guest') {
        if (product.variants) {
            if (product.variants.length === 1) {
                if (product.variants[0].price.final.amount.value !== product.variants[0].price.regular.amount.value) {
                    return html `<${Fragment}>
          <span class="price-regular">${format(product.variants[0].price.regular.amount.value)}</span> <span class="price-final"><span class="sale-label">SALE</span> ${format(product.variants[0].price.final.amount.value)}</span>
        </${Fragment}>`;
                } else {
                    return html `<${Fragment}>
          <span class="price-final">${format(product.variants[0].price.final.amount.value)}</span>
          </${Fragment}>`;
                }
            }
        }
        if (product.priceRange && product.salePriceRange && product.price) {
            const [minPrice, maxPrice] = product.priceRange;
            const [minPriceSale, maxPriceSale] = product.salePriceRange;
            const {
                regular,
                final
            } = product.price;
            // Check if all variants have the same final price
            const allVariantsSamePrice = product.variants.every(variant => {
                return variant.price.final.amount.value === product.variants[0].price.final.amount.value;
            });
            if (minPriceSale === maxPriceSale) {
                if (minPrice === maxPrice) {
                    if (final.amount.value === 0 || regular.amount.value === 0) {
                        return;
                    }
                    if (regular.amount.value === final.amount.value) {
                        return html `<span class="price-final">${format(final.amount.value)}</span>`;
                    }
                    return html `<${Fragment}>
            <span class="price-regular">${format(regular.amount.value)}</span> <span class="price-final"><span class="sale-label">SALE</span> ${format(final.amount.value)}</span>
          </${Fragment}>`;
                } else if (minPriceSale < minPrice) {
                    if (final.amount.value === 0 || regular.amount.value === 0) {
                        return;
                    }
                    return html `<${Fragment}>
            <span class="price-range-sale">
              <span class="price-regular">${format(minPrice)} - ${format(maxPrice)}</span>
              <span class="price-range">
                <span class="sale-label">SALE </span>
                ${format(minPriceSale)}
              </span>
            </span>
          </${Fragment}>`;
                } else if (minPrice < maxPrice) {
                    if (allVariantsSamePrice) {
                        return html `<${Fragment}>
              <span class="price-final">${format(product.variants[0].price.final.amount.value)}</span>
            </${Fragment}>`;
                    } else {
                        return html `<${Fragment}>
              <span class="price-range">${format(minPrice)} - ${format(maxPrice)}</span>
            </${Fragment}>`;
                    }
                } else {
                    if (product.variants.length === 1) {
                        return html `<${Fragment}>
              <span class="price-final">${format(product.variants[0].price.final.amount.value)}</span>
            </${Fragment}>`;
                    } else {
                        if (allVariantsSamePrice) {
                            return html `<${Fragment}>
                <span class="price-final">${format(product.variants[0].price.final.amount.value)}</span>
              </${Fragment}>`;
                        } else {
                            return html `<${Fragment}>
                <span class="price-range">${format(minPrice)} - ${format(maxPrice)}</span>
              </${Fragment}>`;
                        }
                    }
                }
            } else {
                if (allVariantsSamePrice) {
                    return html `<${Fragment}>
            <span class="price-final">${format(product.variants[0].price.final.amount.value)}</span>
          </${Fragment}>`;
                }
                return html `<${Fragment}>
          <span class="price-range-sale">
            <span class="price-regular">${format(minPrice)} - ${format(maxPrice)}</span>
            <span class="price-range">
              <span class="sale-label">SALE </span>
              ${format(minPriceSale)} - ${format(maxPriceSale)}
            </span>
          </span>
        </${Fragment}>`;
            }
        }
    }

    // Simple product
    if (product.price && (countryCode === 'us' || companyType !== 'wholesale')) {
        const {
            regular,
            final
        } = product.price;
        if (final.amount.value === 0 || regular.amount.value === 0) {
            return;
        }
        if (product.tradeprice) {
            return html `<${Fragment}>
        <span class="price-regular">${format(final.amount.value)}</span> <span class="price-final"><span class="sale-label">TRADE</span> ${format(product.tradeprice.final.amount.value)}</span>
      </${Fragment}>`
        }
        if (regular.amount.value === final.amount.value) {
            return html `<span class="price-final">${format(final.amount.value)}</span>`;
        }
        return html `<${Fragment}>
      <span class="price-regular">${format(regular.amount.value)}</span> <span class="price-final"><span class="sale-label">SALE</span> ${format(final.amount.value)}</span>
    </${Fragment}>`;
    }

    if (product.priceRange) {
        const [regular, final] = product.priceRange;
        if (final === 0 || final === 0) {
            return;
        }
        if (regular === final) {
            return html `<${Fragment}>
      <span class="price-final">${format(final)}</span>
      </${Fragment}>`;
        } else {
            return html `<${Fragment}>
        <span class="price-range">${format(regular)} - ${format(final)}</span>
      </${Fragment}>`;
        }
    }

    // Complex product
    if (product.priceRange) {
        const {
            regular: regularMin,
            final: finalMin
        } = product.priceRange.minimum;
        const {
            final: finalMax
        } = product.priceRange.maximum;
        if (finalMin.amount.value === 0 || finalMax.amount.value === 0) {
            return;
        }

        if (finalMin.amount.value !== finalMax.amount.value) {
            return html `
      <div class="price-range">
        ${finalMin.amount.value !== regularMin.amount.value ? html`<span class="price-regular">${format(regularMin.amount.value)}</span>` : ''}
        <span class="price-from">${format(finalMin.amount.value)} - ${format(finalMax.amount.value)}</span>
      </div>`;
        }

        if (finalMin.amount.value !== regularMin.amount.value) {
            return html `<${Fragment}>
      <span class="price-final">${format(finalMin.amount.value)} - ${format(regularMin.amount.value)}</span>
    </${Fragment}>`;
        }

        return html `<span class="price-final">${format(finalMin.amount.value)}</span>`;
    }

    return null;
}

function renderVariantPriceRange(variants, getPriceFn, format, html, Fragment) {
    const variantFilteredPrices = variants
        .map(getPriceFn)
        .filter(price => price !== 0);

    if (variantFilteredPrices.length === 0) return null;

    const min = Math.min(...variantFilteredPrices);
    const max = Math.max(...variantFilteredPrices);

    if (min !== max) {
        return html `<${Fragment}>
      <span class="price-range">${format(min)} - ${format(max)}</span>
    </${Fragment}>`;
    }

    return null;
}

/* PDP specific functionality */

export function getSkuFromUrl() {
    const path = window.location.pathname;
    const result = path.match(/\/products\/[\w|-]+\/([\w|-]+)$/);
    // return result?.[1];
    // TODO Remove | For testing purposes
    return 'TOB5090';
    return 'KW5531';
    return 'TOB5115';
    return 'CHO2152'; // Social native gallery has only two images
}

const productsCache = {};
export async function getProduct(sku) {
    // eslint-disable-next-line no-param-reassign
    sku = sku.toUpperCase();
    if (productsCache[sku]) {
        return productsCache[sku];
    }
    const rawProductPromise = performCatalogServiceQuery(productDetailQuery, {
        sku
    });
    const productPromise = rawProductPromise.then((productData) => {
        if (!productData ? .products ? .[0]) {
            return null;
        }

        // TODO: Remove if not needed and separate query for variants is used
        // Alternatively return with variants data
        productData.products[0].variants = productData.variants.variants;

        return productData ? .products ? .[0];
    });

    productsCache[sku] = productPromise;
    return productPromise;
}
// Not currently useing Adobe Data Layer for tracking so commenting out this code
/* export async function trackHistory() {
  if (!getConsent('commerce-recommendations')) {
    return;
  }
  // Store product view history in session storage
  const storeViewCode = await getConfigValue('commerce-store-view-code');
  window.adobeDataLayer?.push((dl) => {
    dl.addEventListener('adobeDataLayer:change', (event) => {
      const key = `${storeViewCode}:productViewHistory`;
      let viewHistory = JSON.parse(window.localStorage.getItem(key) || '[]');
      viewHistory = viewHistory.filter((item) => item.sku !== event.productContext.sku);
      viewHistory.push({ date: new Date().toISOString(), sku: event.productContext.sku });
      window.localStorage.setItem(key, JSON.stringify(viewHistory.slice(-10)));
    }, { path: 'productContext' });
    dl.addEventListener('place-order', () => {
      const shoppingCartContext = dl.getState('shoppingCartContext');
      if (!shoppingCartContext) {
        return;
      }
      const key = `${storeViewCode}:purchaseHistory`;
      const purchasedProducts = shoppingCartContext.items.map((item) => item.product.sku);
      const purchaseHistory = JSON.parse(window.localStorage.getItem(key) || '[]');
      purchaseHistory.push({ date: new Date().toISOString(), items: purchasedProducts });
      window.localStorage.setItem(key, JSON.stringify(purchaseHistory.slice(-5)));
    });
  });
} */

export function setJsonLd(data, name, appendToBody = false) {
    const existingScript = document.head.querySelector(`script[data-name="${name}"]`);
    if (existingScript) {
        existingScript.innerHTML = JSON.stringify(data);
        return;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';

    script.innerHTML = JSON.stringify(data);
    script.dataset.name = name;
    if (appendToBody) {
        document.body.appendChild(script);
    } else {
        document.head.appendChild(script);
    }
}

export async function loadErrorPage(code = 404) {
    const htmlText = await fetch(`/${code}.html`).then((response) => {
        if (response.ok) {
            return response.text();
        }
        throw new Error(`Error getting ${code} page`);
    });
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    document.head.innerHTML = doc.head.innerHTML;

    // When moving script tags via innerHTML, they are not executed. They need to be re-created.
    const notImportMap = (c) => c.textContent && c.type !== 'importmap';
    Array.from(document.head.querySelectorAll('script'))
        .filter(notImportMap)
        .forEach((c) => c.remove());
    Array.from(doc.head.querySelectorAll('script'))
        .filter(notImportMap)
        .forEach((oldScript) => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(({
                name,
                value
            }) => {
                newScript.setAttribute(name, value);
            });
            const scriptText = document.createTextNode(oldScript.innerHTML);
            newScript.appendChild(scriptText);
            document.head.appendChild(newScript);
        });
}
export async function getCategoryNameFromUrlKey() {
    const {
        data: possibleProducts
    } = await performMonolithGraphQLQuery(
        productBreadcrumbQuery, {
            urlKey: getUrlKeyFromUrl()
        },
    );
    const product = possibleProducts ? .products ? .items ? .[0];

    if (!product) {
        return null;
    }

    const clearanceFilter = document.referrer.toLowerCase().includes('clearance') ?
        (category) => category.name.toLowerCase().includes('clearance') :
        (category) => !category.name.toLowerCase().includes('clearance');

    // find the category that matches a PLP
    const plpIndex = (await fetchIndex('query-index')).data;

    const possiblePLPs = product.categories ? .filter(
        (category) => plpIndex.find((plp) => plp.path === `/${category.url_key}`),
    ).filter(clearanceFilter);

    return possiblePLPs || product.categories;
}

export function isPDP() {
    return window.location.href.match(/\/products\/[\w|-]+\/[\w|-]+/) !== null;
}

export async function getProductVariants(sku, options) {
    const response = await performCatalogServiceQuery(
        variantsQuery, {
            sku,
            optionIds: options || []
        },
    );
    return response ? .variants;
}

export async function refineProduct(sku, options) {
    const response = await performCatalogServiceQuery(
        refineProductQuery, {
            sku,
            optionIds: options || []
        },
    );
    return response;
}

export async function getRelatedProductsBySeries(seriesName) {
    const accountId = await getConfigValue('bloomreach-account-id');
    const domainKey = await getConfigValue('bloomreach-domain-key');
    const baseUrl = 'https://pathways.dxpapi.com';
    const widgetId = 'ojdxpen9';
    const brUidCookie = getCookie('_br_uid_2');

    const params = new URLSearchParams({
        account_id: accountId,
        _br_uid_2: brUidCookie,
        domain_key: domainKey,
        query: seriesName,
        request_id: `req_${Date.now()}`, // Generate unique request ID
        url: domainKey,
        fields: 'pid,title,designer,url,price,sale_price,thumb_image',
        filter: `series= ("${seriesName}")`,
        rows: '20'
    });

    const apiUrl = `${baseUrl}/api/v2/widgets/keyword/${widgetId}?${params}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();

        // Transform the response to match the expected format
        return {
            data: {
                products: {
                    items: data.response ? .docs ? .map(doc => ({
                        sku: doc.pid,
                        name: doc.title || '',
                        url_key: doc.url,
                        image: {
                            url: doc.thumb_image || ''
                        },
                        price: {
                            regularPrice: {
                                amount: {
                                    value: doc.price || 0,
                                    currency: 'USD'
                                }
                            },
                            finalPrice: {
                                amount: {
                                    value: doc.sale_price || doc.price || 0,
                                    currency: 'USD'
                                }
                            }
                        },
                        attributes: [{
                            name: 'designer',
                            value: doc.designer || ''
                        }]
                    })) || []
                }
            }
        };
    } catch (error) {
        console.error('Error fetching related products from pathways API:', error);
        return {
            data: {
                products: {
                    items: []
                }
            }
        };
    }
}

export async function getAccessoriesBySKUs(items) {
    const itemsPromise = await items;
    if (typeof itemsPromise === 'string') {
        const skus = itemsPromise.split(",");
        return await getAccessoriesByCoreAPI(skus);
    }
}

export async function getAccessoriesByCoreAPI(skus) {
    const baseUrl = await getConfigValue('bloomreach-base-url');
    const accountId = await getConfigValue('bloomreach-account-id');
    const authKey = await getConfigValue('bloomreach-auth-key');
    const domainKey = await getConfigValue('bloomreach-domain-key');
    const brUidCookie = getCookie('_br_uid_2');

    // Create filter query for multiple SKUs: fq=pid:("SKU1" OR "SKU2" OR "SKU3")
    const skuFilter = `pid:(${skus.map(sku => `"${sku}"`).join(' OR ')})`;

    const params = new URLSearchParams({
        account_id: accountId,
        auth_key: authKey,
        domain_key: domainKey,
        _br_uid_2: brUidCookie,
        url: domainKey,
        request_type: 'search',
        search_type: 'keyword',
        q: '*', // Wildcard search since we're filtering by SKUs
        fq: skuFilter,
        fl: 'pid,title,designer,url,price,sale_price,thumb_image',
        rows: '20', // Allow more results for accessories
        'facet.limit': '0' // Disable facets by setting limit to 0
    });

    const apiUrl = `${baseUrl}?${params}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Core API call failed: ${response.status}`);
        }

        const data = await response.json();

        // Transform to match existing GraphQL response structure
        return {
            data: {
                products: {
                    items: data.response ? .docs ? .map(doc => ({
                        sku: doc.pid,
                        name: doc.title || '',
                        url_key: doc.url,
                        image: {
                            url: doc.thumb_image || ''
                        },
                        price: {
                            regularPrice: {
                                amount: {
                                    value: doc.price || 0,
                                    currency: 'USD'
                                }
                            },
                            finalPrice: {
                                amount: {
                                    value: doc.sale_price || doc.price || 0,
                                    currency: 'USD'
                                }
                            }
                        },
                        attributes: [{
                            name: 'designer',
                            value: doc.designer || ''
                        }]
                    })) || []
                }
            }
        };
    } catch (error) {
        console.error('Error fetching accessories from Core API:', error);
        // Return empty response on error
        return {
            data: {
                products: {
                    items: []
                }
            }
        };
    }
}