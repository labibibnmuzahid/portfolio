import {
    getMetadata
} from './aem.js';
import {
    getLocale,
    getConfigValue
} from './configs.js';

export function isPlp() {
    return getMetadata('template') === 'plp';
}

// this logic may change later
export function isPdp() {
    return getMetadata('template') === 'pdp';
}

// this logic may change later
function isTradeUser() {
    return false;
}

// this logic may change later
function userIsLoggedIn() {
    return false;
}

// this logic may change later
function getUserHashedEmail() {
    return undefined;
}

export function getPageTypeFromUrl() {
    const url = new URL(window.location);
    const paths = url.pathname.split('/');
    const pageType = paths[paths.length - 1];
    if (pageType === '') {
        return 'homepage';
    }
    return pageType;
}

// this logic may change later
export function isSrp() {
    const pageType = getPageTypeFromUrl();
    return getMetadata('template') === 'plp' && pageType === 'search';
}

export async function pageContextPush(pageType) {
    window.adobeDataLayer = window.adobeDataLayer || [];
    let realPageType = pageType;
    if (pageType === undefined || pageType === 'CMS') {
        realPageType = getPageTypeFromUrl();
    }

    const {
        countryCode
    } = getLocale();
    const currency = await getConfigValue('commerce-base-currency-code');
    const vcPageType = isPlp() ? 'product_listing_page' : realPageType;
    try {
        window.adobeDataLayer.push({
            pageContext: {
                pageName: `${document.title}}`,
                pageType: isSrp() ? 'search_result_page' : vcPageType,
                country: countryCode,
                currencyCode: currency,
                loggedinStatus: userIsLoggedIn() ? 1 : 0,
                hashedEmail: userIsLoggedIn() ? getUserHashedEmail() : '',
                tradeCustomer: isTradeUser() ? 1 : 0,
            },
        });

        if (pageType !== 'Product') {
            window.adobeDataLayer.push((dl) => {
                dl.push({
                    event: 'page-view',
                    eventInfo: { ...dl.getState()
                    },
                });
            });
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
    }
}

function findCategories() {
    let category;
    let category2;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('Category')) {
        const allCategory2 = searchParams.get('Category');
        const values = allCategory2.split('_-_');
        if (values.length > 1) {
            // eslint-disable-next-line prefer-destructuring
            category = values[0];
        }
        category2 = allCategory2.replaceAll(`${category}_-_`, '');
    }
    return [category, category2];
}

function findVariantName(index) {
    const product = document.querySelector(`li[index="${index}"].product-card`);
    return product.querySelector('.description > p') ? .textContent ? ? '';
}

function findVariantId(index) {
    const product = document.querySelector(`li.product-card[index="${index}"]`);
    const allVariants = product.querySelectorAll('.variants > ul > li');
    if (allVariants.length > 0) {
        for (let i = 0; i < allVariants.length; i += 1) {
            const variant = allVariants[i];
            if (variant.hasAttribute('aria-selected')) {
                return variant.querySelector('img')
                    .getAttribute('alt');
            }
        }
        return allVariants[0].querySelect('img')
            .getAttribute('alt');
    }
    return 'undefined';
}

export async function variantChangedPush(index, product, hoveredVariant) {
    if (hoveredVariant) {
        let productListContext = {
            items: []
        };

        if (window.adobeDataLayer && typeof window.adobeDataLayer.getState === 'function') {
            productListContext = window.adobeDataLayer.getState('productListContext') ? ? {
                items: []
            };
        }

        const item = productListContext.items[index] || {};
        item.item_variant_name = hoveredVariant.name.toString();
        item.item_variant = hoveredVariant.sku;

        window.adobeDataLayer.push({
            productListContext,
        });
    }
}

// function findUrlKeyAndPath() {
//   const searchParams = new URLSearchParams(window.location.search);
//   const urlPath = getPageTypeFromUrl();
//   let urlKey = 'Category';
//   if (!searchParams.has('Category')) {
//     urlKey = urlPath;
//   }
//   return [urlKey, urlPath];
// }

function findSalePrice(product) {
    return product.priceRange ? .minimum ? .final ? .amount ? .value ? ? product.price ? .final ? .amount ? .value;
}

function findFinalPrice(product) {
    return product.price ? .final ? .amount ? .value ? ? product.priceRange ? .minimum ? .final ? .amount ? .value;
}

export async function viewItemListPush(state) {
    const [category, category2] = findCategories();
    // const [urlKey, urlPath] = findUrlKeyAndPath();
    window.adobeDataLayer.push((dl) => {
        dl.getState();

        const productListContext = {
            event: 'view_item_list',
            item_list_name: category,
            currentPage: state.currentPage,
            pageSize: state.currentPageSize,
            items: state.products.items.map((p, index) => ({
                item_name: p.name,
                item_id: p.sku,
                item_brand: p.brand,
                item_series: p.series,
                item_designer: p.designer,
                item_category: category ? ? state.category ? .name,
                item_category2: category2,
                item_variant_name: p.detail_description ? ? findVariantName(index),
                item_variant: findVariantId(index),
                url: new URL(`/products/${category?.toLowerCase()}/${p.sku.toLowerCase()}`, window.location).toString(),
                imageUrl: p.images ? .length ? p.images[0].url : '',
                sku_sale_price: p.sale_price,
                price: findSalePrice(p),
                full_price: findFinalPrice(p),
                discount: ((findFinalPrice(p) - findSalePrice(p)) ? ? 0),
                rank: index,
            })),
        };
        dl.push({
            productListContext,
        });
    });
}