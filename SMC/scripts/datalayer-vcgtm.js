import {
    getMetadata
} from './aem.js';
import {
    getLoggedInFromLocalStorage,
    isTradeCustomer,
    getCustomerHashedEmail,
    getCustomerType,
    getMagentoCache,
} from './storage/util.js';
import {
    getConfigValue
} from './configs.js';
// eslint-disable-next-line import/no-cycle
import {
    getItemFromCart
} from './minicart/cart.js';

export function isPlp() {
    return getMetadata('template') === 'plp';
}

// this logic may change later
export function isPdp() {
    return getMetadata('template') === 'pdp';
}

// this logic may change later
function isTradeUser() {
    return isTradeCustomer() ? 1 : 0;
}

// this logic may change later
function userIsLoggedIn() {
    return getLoggedInFromLocalStorage() ? 1 : 0;
}

// this logic for Customer type
function getCustomerClass() {
    const customerClass = getCustomerType();
    if (customerClass === 'retail') {
        return 'consumer';
    }
    return customerClass;
}

export function getPageTypeFromUrl() {
    const url = new URL(window.location);
    const paths = url.pathname.split('/');
    const pageType = paths[paths.length - 1];
    if (pageType === '') {
        return 'homepage';
    }
    if (paths[2] === 'c') {
        return 'product_listing_page';
    }
    return pageType;
}

// this logic may change later
export function isSrp() {
    const pageType = getPageTypeFromUrl();
    return getMetadata('template') === 'plp' && pageType === 'search';
}

export async function pageTypePushGtm(pageType) {
    let realPageType = pageType;
    if (pageType === undefined || pageType === 'CMS') {
        realPageType = getPageTypeFromUrl();
    }

    if (pageType === 'Category' && isPlp()) {
        realPageType = 'product_listing_page';
    }

    if (pageType === 'Product') {
        realPageType = 'product_detail_page';
    }

    if (pageType === 'Category' && isSrp()) {
        realPageType = 'search_result_page';
    }

    const currency = await getConfigValue('commerce-base-currency-code');
    window.dataLayer = window.dataLayer || [];

    // Remove any object that has both `currencyCode` and `Customer_Class` keys
    for (let i = window.dataLayer.length - 1; i >= 0; i -= 1) {
        const entry = window.dataLayer[i];
        const hasCurrencyCode = Object.prototype.hasOwnProperty.call(entry, 'currencyCode');
        const hasCustomerClass = Object.prototype.hasOwnProperty.call(entry, 'Customer_Class');
        if (hasCurrencyCode && hasCustomerClass) {
            window.dataLayer.splice(i, 1);
        }
    }

    try {
        window.dataLayer.unshift({
            currency,
            hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
            loggedinStatus: userIsLoggedIn() ? 1 : 0,
            tradeCustomer: isTradeUser() ? 1 : 0,
            pageType: realPageType,
            Customer_Class: getCustomerClass(),
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
    }
}

function findCatName(product) {
    let cat = '';
    let cat2 = '';
    if (product.category && product.category !== 'undefined') {
        const categoryString = String(product.category);
        const categories = categoryString.split(' - ');
        cat = categories[0] || '';
        cat2 = categories[1] || '';
        return [cat, cat2];
    }

    const categoryFilter = product ? .attributes ? .find((attr) => attr.name === 'category_filter');
    const catFilterAttr = categoryFilter ? .value || '';
    if (catFilterAttr) {
        const categoryString = String(catFilterAttr);
        const categories = categoryString.split(' - ');
        cat = categories[0] || '';
        cat2 = categories[1] || '';
        return [cat, cat2];
    }
    return [cat, cat2];
}

function findItemListName() {
    if (isSrp()) {
        return 'search';
    }

    return document.title;
}

function renderPriceAll(product) {
    if (product.price) {
        const {
            regular,
            final
        } = product.price;
        if (product.tradeprice) {
            return {
                regularPrice: final.amount.value,
                finalPrice: product.tradeprice.final.amount.value,
            };
        }
        if (regular.amount.value === final.amount.value) {
            return {
                regularPrice: final.amount.value,
                finalPrice: final.amount.value,
            };
        }
        return {
            regularPrice: regular.amount.value,
            finalPrice: final.amount.value,
        };
    }
    return null;
}

export async function viewItemListDatalayer(state) {
    window.dataLayer = window.dataLayer || [];

    // format numbers as decimal with 2 decimal places
    const toDecimal = (value) => {
        if (Number.isNaN(value)) return '0.00';
        return Number(value).toFixed(2);
    };

    if (state.products.total > 0) {
        const productListContext = {
            event: 'view_item_list',
            loggedinStatus: userIsLoggedIn(),
            hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
            tradeCustomer: isTradeUser(),
            ecommerce: {
                item_list_name: findItemListName(),
                items: state.products.items.map((p) => {
                    const [category, category2] = findCatName(p);
                    const renderPrice = renderPriceAll(p) || '';
                    return {
                        item_name: p.name,
                        item_id: p.sku,
                        item_brand: p.brand || '',
                        item_series: p.series || '',
                        item_designer: p.designer || '',
                        item_category: category,
                        item_category2: category2,
                        item_variant_name: '',
                        item_variant: '',
                        price: toDecimal((renderPrice.finalPrice) ? ? 0),
                        full_price: toDecimal((renderPrice.regularPrice) ? ? 0),
                        discount: toDecimal(((renderPrice.regularPrice - renderPrice.finalPrice) ? ? 0)),
                        quantity: 1,
                    };
                }),
            },
        };
        window.dataLayer.push({
            ...productListContext,
        });
    }
}

export async function searchDataLayer(searchQuery, state) {
    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
        event: 'search',
        search_result: state.products.total > 0 ? 'valid' : 'empty',
        search_term: searchQuery,
    });
}

// for PDP getting product data for all events
let globalViewItemData = null;

function viewItemClick(viewItemData, product) {
    globalViewItemData = product;
    // format numbers as decimal with 2 decimal places
    const toDecimal = (value) => {
        if (Number.isNaN(value)) return '0.00';
        return Number(value).toFixed(2);
    };
    const regularPriceItem = product ? .selectedVariant ? .price ? .regular ? .amount.value ? ? 0;
    const finalPriceItem = product ? .selectedVariant ? .price ? .final ? .amount.value ? ? 0;
    const updatedViewItemData = {
        ...viewItemData,
        ecommerce: {
            currency: viewItemData.ecommerce.currency,
            value: toDecimal(product ? .selectedVariant ? .price ? .final ? .amount.value ? ? 0),
            items: viewItemData.ecommerce.items.map((item) => ({
                ...item,
                price: toDecimal(product ? .selectedVariant ? .price ? .final ? .amount.value ? ? 0),
                full_price: toDecimal(product ? .selectedVariant ? .price ? .regular ? .amount.value ? ? 0),
                discount: toDecimal((regularPriceItem - finalPriceItem) || 0),
                item_variant_name: product.selectedVariant ? product.selectedVariant.name : '', // Update variant name
                item_variant: product.selectedVariant.sku, // Set variant ID
            })),
        },
    };
    // Push to dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        ...updatedViewItemData,
    });
}

export async function viewItem(product) {
    const currency = await getConfigValue('commerce-base-currency-code');
    const [category, category2] = findCatName(product);
    const designerAttr = product ? .attributes ? .find((attr) => attr.name === 'designer');
    const brandAttr = product ? .attributes ? .find((attr) => attr.name === 'brand');
    const seriesAttr = product ? .attributes ? .find((attr) => attr.name === 'relatives');

    // format numbers as decimal with 2 decimal places
    const toDecimal = (value) => {
        if (Number.isNaN(value)) return '0.00';
        return Number(value).toFixed(2);
    };

    const finalPrice = toDecimal(product.priceRange ? .minimum ? .final.amount.value ? ? 0);
    const regularPrice = toDecimal(product.priceRange ? .minimum ? .regular.amount.value ? ? 0);
    const viewItemData = {
        event: 'view_item',
        loggedinStatus: userIsLoggedIn(),
        hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
        tradeCustomer: isTradeUser(),
        ecommerce: {
            currency,
            value: finalPrice ? ? 0,
            items: [{
                item_name: product.name || '',
                item_id: product.sku,
                item_brand: brandAttr ? .value || '',
                item_series: seriesAttr ? .value || '',
                item_designer: designerAttr ? .value || '',
                item_category: category,
                item_category2: category2,
                item_variant_name: '',
                item_variant: '',
                price: finalPrice,
                full_price: regularPrice,
                discount: toDecimal((regularPrice - finalPrice) ? ? 0),
                quantity: 1,
            }],
        },
    };

    if (product.selectedVariant === null || product.selectedVariant === undefined) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            ...viewItemData,
        });
    }

    // Check if product.selectedVariant is not null or undefined
    if (product.selectedVariant !== null && product.selectedVariant !== undefined) {
        viewItemClick(viewItemData, product);
    }

    const variantElements = document.querySelectorAll('.variants-container .variant-item button');
    const dropdownElemnt = document.querySelectorAll('.pdp-swatches__options select.dropin-picker__select');

    variantElements.forEach((element) => {
        element.addEventListener('click', () => {
            viewItemClick(viewItemData, product);
        });
    });

    dropdownElemnt.forEach((element) => {
        element.addEventListener('change', () => {
            setTimeout(() => {
                viewItemClick(viewItemData, product);
            }, 1000);
        });
    });
}

export async function addToCartEvent() {
    const product = globalViewItemData;
    const currency = await getConfigValue('commerce-base-currency-code');
    const [category, category2] = findCatName(product);
    const designerAttr = product ? .attributes ? .find((attr) => attr.name === 'designer');
    const brandAttr = product ? .attributes ? .find((attr) => attr.name === 'brand');
    const seriesAttr = product ? .attributes ? .find((attr) => attr.name === 'relatives');
    // format numbers as decimal with 2 decimal places
    const toDecimal = (value) => {
        if (Number.isNaN(value)) return '0.00';
        return Number(value).toFixed(2);
    };
    const updatedQty = document.getElementById('pdp-qty-input').value;
    const regularPriceProd = product ? .selectedVariant ? .price ? .regular ? .amount.value ? ? 0;
    const finalPriceProd = product ? .selectedVariant ? .price ? .final ? .amount.value ? ? 0;

    const addCartItemData = {
        event: 'add_to_cart',
        loggedinStatus: userIsLoggedIn(),
        hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
        tradeCustomer: isTradeUser(),
        ecommerce: {
            currency,
            value: toDecimal((finalPriceProd * updatedQty) ? ? 0),
            items: [{
                item_name: product.name || '',
                item_id: product.sku,
                item_brand: brandAttr ? .value || '',
                item_series: seriesAttr ? .value || '',
                item_designer: designerAttr ? .value || '',
                item_category: category,
                item_category2: category2,
                item_variant_name: product.selectedVariant ? product.selectedVariant.name : '', // Update variant name
                item_variant: product.selectedVariant.sku, // Set variant ID
                price: toDecimal(product ? .selectedVariant ? .price ? .final ? .amount.value ? ? 0),
                full_price: toDecimal(product ? .selectedVariant ? .price ? .regular ? .amount.value ? ? 0),
                discount: toDecimal((regularPriceProd - finalPriceProd) ? ? 0),
                quantity: updatedQty,
            }],
        },
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        ...addCartItemData,
    });
}

// Fetch cart item data from Magento cache
async function cartItemData() {
    const cartData = getMagentoCache();
    return cartData.cart;
}

export async function cartItemDataLayer() {
    try {
        const [cartsData, currency] = await Promise.all([
            cartItemData(),
            getConfigValue('commerce-base-currency-code'),
        ]);

        if (!cartsData || !cartsData.items || cartsData.items.length === 0) {
            return;
        }

        const toDecimal = (value) => {
            const cleanedValue = value ? .toString().replace(/,/g, '');
            const numberValue = parseFloat(cleanedValue);
            // eslint-disable-next-line no-restricted-globals
            return isNaN(numberValue) ? '0.00' : numberValue.toFixed(2);
        };
        window.dataLayer = window.dataLayer || [];
        const cartItemsData = await getItemFromCart();
        const viewCartData = {
            loggedinStatus: userIsLoggedIn(),
            hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
            tradeCustomer: isTradeUser(),
            ecommerce: {
                currency,
                value: toDecimal(cartsData.subtotalAmount),
                items: cartsData.items.map((p) => {
                    const cat = p.category.split('/').filter((part) => part !== '');
                    const cartItem = cartItemsData.cart ? .items.find(
                        (q) => (q.configured_variant ? .sku || q.product.sku) === p.product_sku,
                    );
                    let itemParentId = '';
                    if (cartItem) {
                        itemParentId = cartItem.configured_variant ? cartItem.product.sku :
                            cartItem.product.basecode;
                    }

                    return {
                        item_name: p.product_name ? p.product_name.replace(/&quot;/g, '"') : '',
                        item_variant: p.product_sku || '',
                        full_price: toDecimal(p.full_price ? ? 0),
                        item_category: cat[0] || '',
                        item_category2: cat[1] || '',
                        item_brand: p.brand || '',
                        quantity: p.qty,
                        price: toDecimal(p.product_price_value ? ? 0),
                        discount: toDecimal((p.full_price - p.product_price_value) ? ? 0),
                        item_variant_name: p.product_image ? .alt || '',
                        item_id: itemParentId,
                        item_series: cartItem ? .product ? .relatives || '',
                    };
                }),
            },
        };
        const viewCartEventData = {
            event: 'view_cart',
            ...viewCartData,
        };
        window.dataLayer.push(viewCartEventData);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
    }
}

export async function removeCartItemDataLayer(itemId) {
    try {
        // currency and cart data
        const currency = await getConfigValue('commerce-base-currency-code');
        const cartData = await cartItemData();
        const cartItemsData = await getItemFromCart();

        const removeItemId = String(itemId).trim();
        const item = cartData.items.find(
            (cartItem) => String(cartItem.item_id).trim() === removeItemId,
        );
        if (!item) {
            return;
        }

        const cartItem = cartItemsData ? .cart ? .items.find(
            (q) => (q.configured_variant ? .sku || q.product.sku) === item.product_sku,
        );

        let itemParentId = '';
        if (cartItem) {
            itemParentId = cartItem.configured_variant ? cartItem.product.sku : cartItem.product.basecode;
        }

        // to decimal
        const toDecimal = (value) => {
            const cleanedValue = value ? .toString().replace(/,/g, '');
            const numberValue = parseFloat(cleanedValue);
            // eslint-disable-next-line no-restricted-globals
            return isNaN(numberValue) ? '0.00' : numberValue.toFixed(2);
        };

        // Split categories and product total
        const cat = item.category.split('/').filter((part) => part !== '');
        const sumofRemovedProduct = item.product_price_value * item.qty;

        // discount
        const discItem = toDecimal(toDecimal(item.full_price) - toDecimal(item.product_price_value));

        const removeCartData = {
            loggedinStatus: userIsLoggedIn(),
            hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
            tradeCustomer: isTradeUser(),
            ecommerce: {
                currency,
                value: toDecimal(sumofRemovedProduct),
                items: [{
                    item_name: item.product_name ? item.product_name.replace(/&quot;/g, '"') : '',
                    item_variant: item.product_sku || '',
                    full_price: toDecimal(item.full_price ? ? 0),
                    item_category: cat[0] || '',
                    item_category2: cat[1] || '',
                    item_brand: item.brand || '',
                    quantity: item.qty,
                    price: toDecimal(item.product_price_value ? ? 0),
                    discount: discItem ? ? '0.00', // Ensure discount is a string for consistency
                    item_variant_name: item.product_image ? .alt || '',
                    item_id: itemParentId,
                    item_series: cartItem ? .product ? .relatives || '',
                }],
            },
        };
        // Push data to the dataLayer
        window.dataLayer = window.dataLayer || [];
        const removeFromCartData = {
            event: 'remove_from_cart',
            ...removeCartData,
        };

        window.dataLayer.push(removeFromCartData);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
    }
}

export async function updateCartItemDataLayer(cartItemId, quantity) {
    const currency = await getConfigValue('commerce-base-currency-code');
    let dataLayerEvent;
    let updatedQuantity;
    const itemId = String(cartItemId).trim();
    window.dataLayer = window.dataLayer || [];
    const cartData = await cartItemData();
    const cartItemsDataUpdate = await getItemFromCart();
    const item = cartData.items.find((cartItem) => String(cartItem.item_id).trim() === itemId);
    if (!item) {
        return;
    }
    const cartItem = cartItemsDataUpdate ? .cart ? .items.find(
        (q) => (q.configured_variant ? .sku || q.product.sku) === item.product_sku,
    );
    let itemParentId;
    if (!cartItem || !cartItem.configured_variant) {
        itemParentId = cartItem ? cartItem.product.basecode : '';
    } else {
        itemParentId = cartItem.product.sku || '';
    }
    const toDecimal = (value) => {
        const cleanedValue = value.toString().replace(/,/g, '');
        if (Number.isNaN(cleanedValue)) return '0.00';
        return Number(cleanedValue).toFixed(2);
    };

    if (quantity < item.qty) {
        dataLayerEvent = 'remove_from_cart';
        updatedQuantity = item.qty - quantity;
    } else {
        dataLayerEvent = 'add_to_cart';
        updatedQuantity = quantity - item.qty;
    }

    const cat = item.category.split('/').filter((part) => part !== '');
    const sumofUpdatedProduct = item.product_price_value * updatedQuantity;
    const discountItem = toDecimal(toDecimal(item.full_price) - toDecimal(item.product_price_value));
    const updatecartData = {
        loggedinStatus: userIsLoggedIn(),
        hashedEmail: userIsLoggedIn() ? getCustomerHashedEmail() : '',
        tradeCustomer: isTradeUser(),
        ecommerce: {
            currency,
            value: toDecimal(sumofUpdatedProduct),
            items: [{
                item_name: item.product_name ? item.product_name.replace(/&quot;/g, '"') : '',
                item_variant: item.product_sku || '',
                full_price: toDecimal(item.full_price ? ? 0),
                item_category: cat[0] || '',
                item_category2: cat[1] || '',
                item_brand: item.brand || '',
                item_variant_name: item.product_image.alt || '',
                quantity: updatedQuantity,
                price: toDecimal(item.product_price_value ? ? 0),
                discount: discountItem ? ? 0,
                item_id: itemParentId,
                item_series: cartItem && cartItem.product.relatives ? cartItem.product.relatives : '',
            }],
        },
    };

    const dataLayerPush = {
        event: dataLayerEvent,
        ...updatecartData,
    };

    window.dataLayer.push(dataLayerPush);
}

function initMinicartTracking() {
    const wrapper = document.querySelector('.minicart-wrapper');
    if (!wrapper) {
        return;
    }
    const setupObserver = () => {
        const observer = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'class'
                ) {
                    const isOpen = wrapper.classList.contains('active');

                    if (isOpen) {
                        cartItemDataLayer();
                        observer.disconnect();
                        const rearmObserver = new MutationObserver(() => {
                            const isNowClosed = !wrapper.classList.contains('active');
                            if (isNowClosed) {
                                rearmObserver.disconnect();
                                setupObserver();
                            }
                        });

                        rearmObserver.observe(wrapper, {
                            attributes: true,
                            attributeFilter: ['class'],
                        });
                    }
                }
            });
        });

        observer.observe(wrapper, {
            attributes: true,
            attributeFilter: ['class'],
        });
    };
    setupObserver();
}

const wrapperWaiter = new MutationObserver(() => {
    const wrapper = document.querySelector('.minicart-wrapper');
    if (wrapper) {
        wrapperWaiter.disconnect();
        initMinicartTracking();
    }
});

wrapperWaiter.observe(document.body, {
    childList: true,
    subtree: true,
});