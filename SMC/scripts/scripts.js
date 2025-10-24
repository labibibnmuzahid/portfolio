/* eslint-disable no-console */
/* eslint-disable import/no-cycle */
import {
    events
} from '@dropins/tools/event-bus.js';
import {
    sampleRUM,
    buildBlock,
    loadHeader,
    loadFooter,
    decorateButtons,
    decorateIcons,
    decorateSections,
    decorateBlocks,
    decorateTemplateAndTheme,
    getMetadata,
    loadBlock,
    decorateBlock,
    loadCSS,
    loadScript,
    toCamelCase,
    toClassName,
    readBlockConfig,
} from './aem.js';
import {
    getProduct,
    getSkuFromUrl
} from './commerce.js';
import initializeDropins from './dropins.js';
import {
    pageContextPush
} from './datalayer.js';
import {
    pageTypePushGtm
} from './datalayer-vcgtm.js';
import {
    addMagentoCacheListener
} from './storage/util.js';
import {
    getCountries
} from './configs.js';
import parseSsrData from './custom/pdp-parser.js';

export function extractFallbackPrice() {
    // Check if real-time prices are already available in window.product
    if (window.product && window.product.priceRange && window.product.priceRange.minimum) {
        const minPrice = window.product.priceRange.minimum.final.amount.value;
        const maxPrice = window.product.priceRange.maximum.final.amount.value;

        // If we have real-time prices (different from meta tags), use them
        const metaPrice = parseFloat(document.querySelector('meta[property="product:price-amount"]') ? .getAttribute('content') || '0');
        if (minPrice !== metaPrice && maxPrice !== metaPrice) {
            return {
                product: {
                    priceRange: window.product.priceRange,
                },
                variants: window.product.variants ? .map((variant) => ({
                    product: {
                        sku: variant.sku,
                        price: variant.price || {
                            regular: {
                                amount: {
                                    currency: 'USD',
                                    value: variant.regularPrice
                                }
                            },
                            final: {
                                amount: {
                                    currency: 'USD',
                                    value: variant.finalPrice
                                }
                            },
                        },
                    },
                })) || [],
            };
        }
    }

    // Fallback to meta tags
    const priceMetaTag = document.querySelector('meta[property="product:price-amount"]');
    const currencyMetaTag = document.querySelector('meta[property="product:price-currency"]');

    if (!priceMetaTag || !currencyMetaTag) {
        console.error('Price or currency meta tag not found');
        return false;
    }

    let priceValue = parseFloat(priceMetaTag.getAttribute('content'));
    let currencyValue = currencyMetaTag.getAttribute('content');

    if (Number.isNaN(priceValue) || !currencyValue) {
        priceValue = null;
        currencyValue = null;
        console.error('Invalid price or currency value');
    }

    const priceData = {
        product: {},
        variants: [],
    };

    // product priceRange
    priceData.product = {
        priceRange: {
            maximum: {
                roles: ['visible'],
                regular: {
                    amount: {
                        currency: currencyValue,
                        value: priceValue,
                    },
                },
                final: {
                    amount: {
                        currency: currencyValue,
                        value: priceValue,
                    },
                },
            },
            minimum: {
                roles: ['visible'],
                regular: {
                    amount: {
                        currency: currencyValue,
                        value: priceValue,
                    },
                },
                final: {
                    amount: {
                        currency: currencyValue,
                        value: priceValue,
                    },
                },
            },
        },
    };

    // Generate variants section using data from window.product.variants
    if (window.product && Array.isArray(window.product.variants) &&
        window.product.variants.length > 0) {
        priceData.variants = window.product.variants.map((variant) => {
            const regularPrice = parseFloat(variant.regularPrice);
            const finalPrice = parseFloat(variant.finalPrice);

            // Check if regularPrice and finalPrice are valid numbers
            if (Number.isNaN(regularPrice) || Number.isNaN(finalPrice)) {
                console.error(`Invalid price values for variant with SKU: ${variant.sku}`);
                return null;
            }

            return {
                product: {
                    sku: variant.sku,
                    price: {
                        roles: ['visible'],
                        regular: {
                            amount: {
                                currency: variant.currency,
                                value: regularPrice,
                            },
                        },
                        final: {
                            amount: {
                                currency: variant.currency,
                                value: finalPrice,
                            },
                        },
                    },
                },
            };
        }).filter((variant) => variant !== null);
    }

    return priceData;
}

// Function to get the value of a query parameter by name
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(param);
    return value !== null ? value : null;
}

// Function to update the selected variant in the window.product object
export function updateSelectedVariant(selectedProduct) {
    if (!window.product || !window.product.variants) {
        console.error('Product or product variants are not defined.');
        return;
    }

    // Find the variant with the same SKU as selectedProduct
    const selectedVariant = window.product.variants
        .find((variant) => variant.sku === selectedProduct);

    if (selectedVariant) {
        window.product.selectedVariant = { ...selectedVariant
        };
        events.emit('variantchange');
    } else {
        console.error(`Product variant with SKU: "${selectedProduct}" was not found.`);
    }
}

export function isVariantSelected() {
    if (!window.product.selectedVariant && !!getQueryParam('selected_product') === false) {
        updateSelectedVariant(window.product.variants.find(
            (variant) => variant.images[0].img.src === window.product.images[0] ? .url,
        ) ? .sku);
    }
    return !!getQueryParam('selected_product');
}

const LCP_BLOCKS = [
    'hero',
    'product-list-page',
    'product-list-page-custom',
    'product-details',
    'commerce-cart',
    'commerce-checkout',
    'commerce-account',
    'commerce-login',
]; // add your LCP blocks to the list

window.adobeDataLayer = window.adobeDataLayer || [];

const AUDIENCES = {
    mobile: () => window.innerWidth < 600,
    desktop: () => window.innerWidth >= 600,
    // define your custom audiences here as needed
};

let pageType = 'CMS';

/**
 * Gets all the metadata elements that are in the given scope.
 * @param {String} scope The scope/prefix for the metadata
 * @returns an array of HTMLElement nodes that match the given scope
 */
export function getAllMetadata(scope) {
    return [...document.head.querySelectorAll(`meta[property^="${scope}:"],meta[name^="${scope}-"]`)]
        .reduce((res, meta) => {
            const id = toClassName(meta.name ?
                meta.name.substring(scope.length + 1) :
                meta.getAttribute('property').split(':')[1]);
            res[id] = meta.getAttribute('content');
            return res;
        }, {});
}

// Define an execution context
const pluginContext = {
    getAllMetadata,
    getMetadata,
    loadCSS,
    loadScript,
    sampleRUM,
    toCamelCase,
    toClassName,
};

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
// eslint-disable-next-line no-unused-vars
function buildHeroBlock(main) {
    // Check if there is a manual hero block.
    // If so, do not try to build an autoblock hero.
    if (main.querySelector(['.block', '.hero'])) {
        return;
    }

    const h1 = main.querySelector('h1');
    const picture = main.querySelector('picture');
    // eslint-disable-next-line no-bitwise
    if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
        const section = document.createElement('div');
        section.append(buildBlock('hero', {
            elems: [picture, h1]
        }));
        main.prepend(section);
    }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
    await loadCSS('https://use.typekit.net/gyy3evs.css');
    await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
    try {
        if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
    } catch (e) {
        // do nothing
    }
}

// Preload images
function preloadImages(images) {
    if (images.length > 0) {
        const image = images[0];
        const baseUrl = image.url.split('?')[0];

        // srcset based on PDP gallery images sizes
        const srcset = [
            `${baseUrl}?width=384&format=webp&optimize=medium&auto=webp&quality=80&crop=false&fit=cover 768w`,
            `${baseUrl}?width=512&format=webp&optimize=medium&auto=webp&quality=80&crop=false&fit=cover 1024w`,
            `${baseUrl}?width=683&format=webp&optimize=medium&auto=webp&quality=80&crop=false&fit=cover 1366w`,
            `${baseUrl}?width=960&format=webp&optimize=medium&auto=webp&quality=80&crop=false&fit=cover 1920w`,
        ].join(', ');

        // Create a single link tag with imagesrcset and imagesizes
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = image.url;
        preloadLink.setAttribute('imagesrcset', srcset);
        preloadLink.setAttribute('imagesizes', '100vw');
        document.head.appendChild(preloadLink);
    }
}

// Preload the first image of each visible variant
function preloadVariantImages(variants) {
    variants.slice(0, 4).forEach((variant) => {
        if (variant.images && variant.images.length > 0) {
            const firstImage = variant.images[0].img.src;
            const baseUrl = firstImage.split('?')[0];
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = `${baseUrl}?width=200&format=webp&optimize=medium`;
            document.head.appendChild(link);
        }
    });
}

let MANUAL_BREADCRUMB;

function buildBreadcrumb(main) {
    if (getMetadata('breadcrumb') === 'none') {
        return;
    }

    if (getMetadata('breadcrumb') === 'auto') {
        main.classList.add('with-breadcrumb');
    } else if (document.querySelector('.breadcrumb')) {
        MANUAL_BREADCRUMB = document.querySelector('.breadcrumb');
        main.classList.add('with-breadcrumb');
    }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
// eslint-disable-next-line no-unused-vars
function buildAutoBlocks(main) {
    try {
        buildBreadcrumb(document.querySelector('header'));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Auto Blocking failed', error);
    }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
    // hopefully forward compatible button decoration
    decorateButtons(main);
    decorateIcons(main);
    buildAutoBlocks(main);
    decorateSections(main);
    decorateBlocks(main);
}

function preloadFile(href, as) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.appendChild(link);
}

async function loadBreadcrumb(main) {
    let wrapper;
    if (MANUAL_BREADCRUMB) {
        wrapper = MANUAL_BREADCRUMB.parentElement;
    } else if (getMetadata('breadcrumb') === 'auto') {
        wrapper = document.createElement('div');
        const block = buildBlock('breadcrumb', {
            elems: [document.createElement('ul')]
        });
        wrapper.append(block);
    } else {
        return;
    }
    main.append(wrapper);

    decorateBlock(wrapper.firstElementChild);
    await loadBlock(wrapper.firstElementChild);
}

/**
 * Load LCP block and/or wait for LCP in default content.
 * @param {Array} lcpBlocks Array of blocks
 */
async function waitForLCP(lcpBlocks) {
    const block = document.querySelector('.block');
    const hasLCPBlock = block && lcpBlocks.includes(block.dataset.blockName);
    if (hasLCPBlock) await loadBlock(block);

    document.body.style.display = null;
    const lcpCandidate = document.querySelector('main img');

    await new Promise((resolve) => {
        if (lcpCandidate && !lcpCandidate.complete) {
            lcpCandidate.setAttribute('loading', 'eager');
            lcpCandidate.addEventListener('load', resolve);
            lcpCandidate.addEventListener('error', resolve);
        } else {
            resolve();
        }
    });
}

/**
 * Gets showroom locations object.
 * @param {string} [prefix] Location of Showroom locations
 * @returns {object} Window locations object
 */
// eslint-disable-next-line import/prefer-default-export
export async function fetchShowroomLocationsData(sheetName = 'default') {
    window.locations = window.locations || {};
    if (!window.locations[sheetName]) {
        window.locations[sheetName] = new Promise((resolve) => {
            fetch('/us/showrooms/showroom-locations.json')
                .then((resp) => {
                    if (resp.ok) {
                        return resp.json();
                    }
                    return {};
                })
                .then((json) => {
                    const locations = json.data || [];
                    // Store all location data instead of filtering by columnKey and columnValue
                    window.locations = locations || []; // Assuming locations.data holds the array of rows
                    resolve(window.locations);
                })
                .catch(() => {
                    // Error loading locations
                    window.locations = [];
                    resolve(window.locations);
                });
        });
    }
    return window.locations[sheetName];
}

/**
 * Loads a block named 'geopopup' into geopopupBlock
 * @param geopopup element
 * @returns {Promise}
 */
async function loadGeopopup(geopopup) {
    const geopopupBlock = buildBlock('geopopup', '');
    geopopup.append(geopopupBlock);
    decorateBlock(geopopupBlock);
    return loadBlock(geopopupBlock);
}

/**
 * Wraps images followed by links within a matching <a> tag.
 * @param {Element} container The container element
 */
export function wrapImgsInLinks(container) {
    const pictures = container.querySelectorAll('picture');
    pictures.forEach((pic) => {
        const br = pic.nextElementSibling;
        const link = br ? .nextElementSibling;
        if (link && link.tagName === 'A' && link.href) {
            link.innerHTML = pic.outerHTML;
            pic.replaceWith(link);
        }
    });
}

async function loadSocialNativeGallery() {
    const socialGalleryParent = document.querySelector('.social-native-gallery-wrapper');
    if (!socialGalleryParent) {
        return;
    }
    socialGalleryParent.style.visibility = 'hidden';

    const socialBlock = buildBlock('social-native-gallery', '');

    let olapicId = window.product.attributes.find((attr) => attr.name === 'olapic_id') ? .value;
    // If id is not found in product attributes, check variants
    if (!olapicId) {
        const {
            variants
        } = window.product;
        if (variants && Object.keys(variants[0]).length > 0) {
            const variantWithOlapicId = variants.find((variant) => variant.attributes.some((attr) => attr.name === 'olapic_id'));
            olapicId = variantWithOlapicId ? variantWithOlapicId.attributes.find((attr) => attr.name === 'olapic_id').value : undefined;
        }
    }

    socialBlock.classList.add('block');
    socialBlock.innerHTML = `
    <div><div>Stream tag</div><div>${olapicId}</div></div>
    <div><div>Gallery Text</div><div>#visualcomfort</div></div>
  `;
    socialBlock.setAttribute('data-block-origin', 'pdp');
    socialGalleryParent.appendChild(socialBlock);
    decorateBlock(socialBlock);
    await loadBlock(socialBlock);
    socialGalleryParent.style.visibility = 'visible';
}

/**
 * Updates all section status in a container element.
 * @param {Element} main The container element
 */
function updateSectionsStatus(main) {
    const sections = [...main.querySelectorAll(':scope > div.section')];
    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const status = section.dataset.sectionStatus;
        if (status !== 'loaded') {
            const loadingBlock = section.querySelector(
                '.block[data-block-status="initialized"], .block[data-block-status="loading"]',
            );
            if (loadingBlock) {
                section.dataset.sectionStatus = 'loading';
                break;
            } else {
                section.dataset.sectionStatus = 'loaded';
                section.style.display = null;
                if (i === 0 && sampleRUM.enhance) {
                    sampleRUM.enhance();
                }
            }
        }
    }
}

/**
 * Loads JS and CSS for all blocks in a container element.
 * @param {Element} main The container element
 */
export async function loadBlocks(main) {
    updateSectionsStatus(main);
    const blocks = [...main.querySelectorAll('div.block')];
    for (let i = 0; i < blocks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await loadBlock(blocks[i]);
        updateSectionsStatus(main);
    }
}

/**
 * Wraps images with size attributes
 * @param {Element} container The container element
 */
export function wrapImgsInSize(container) {
    const images = container.querySelectorAll('img');
    images.forEach((imgElement) => {
        // Get the rendered size
        const renderedWidth = imgElement.width;
        const renderedHeight = imgElement.height;
        imgElement.setAttribute('width', renderedWidth);
        imgElement.setAttribute('height', renderedHeight);
    });
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
    // gtm set up
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
    });

    document.documentElement.lang = 'en';
    await initializeDropins();
    decorateTemplateAndTheme();

    // Instrument experimentation plugin
    if (getMetadata('experiment') ||
        Object.keys(getAllMetadata('campaign')).length ||
        Object.keys(getAllMetadata('audience')).length) {
        // eslint-disable-next-line import/no-relative-packages
        const {
            loadEager: runEager
        } = await
        import ('../plugins/experimentation/src/index.js');
        await runEager(document, {
            audiences: AUDIENCES
        }, pluginContext);
    }
    const main = doc.querySelector('main');
    const metaSku = doc.querySelector('meta[name="sku"]');
    if (main && metaSku) {
        // Preload PDP Dropins assets
        preloadFile('/scripts/__dropins__/storefront-pdp/containers/ProductDetails.js', 'script');
        await parseSsrData();
        pageType = 'Product';

        // Preload images
        if (window.product && window.product.images) {
            preloadImages(window.product.images);
        }
        // Preload variant images for Options
        if (window.product.variants) {
            preloadVariantImages(window.product.variants);
        }

        // Remove pre-rendered product details
        const productOptionsElement = document.querySelector('div.product-options');
        if (productOptionsElement && productOptionsElement.parentElement) {
            productOptionsElement.parentElement.remove();
        }

        const wrapper = document.createElement('div');
        const block = buildBlock('product-details', '');
        wrapper.append(block);
        main.append(wrapper);
    } else if (document.body.querySelector('main .product-details-custom')) {
        pageType = 'Product';
        preloadFile('/scripts/preact.js', 'script');
        preloadFile('/scripts/htm.js', 'script');
        preloadFile('/blocks/product-details-custom/ProductDetailsCarousel.js', 'script');
        preloadFile('/blocks/product-details-custom/ProductDetailsSidebar.js', 'script');
        preloadFile('/blocks/product-details-custom/ProductDetailsShimmer.js', 'script');
        preloadFile('/blocks/product-details-custom/Icon.js', 'script');

        const blockConfig = readBlockConfig(document.body.querySelector('main .product-details-custom'));
        const sku = getSkuFromUrl() || blockConfig.sku;
        window.getProductPromise = getProduct(sku);
    } else if (document.body.querySelector('main .product-list-page')) {
        pageType = 'Category';
        preloadFile('/scripts/widgets/search.js', 'script');
    } else if (document.body.querySelector('main .product-list-page-custom')) {
        // TODO Remove this bracket if not using custom PLP
        pageType = 'Category';
        const plpBlock = document.body.querySelector('main .product-list-page-custom');
        const {
            category
        } = readBlockConfig(plpBlock);

        if (category) {
            // eslint-disable-next-line import/no-unresolved, import/no-absolute-path
            const {
                preloadCategory
            } = await
            import ('/blocks/product-list-page-custom/product-list-page-custom.js');
            preloadCategory({
                id: category
            });
        }
    } else if (document.body.querySelector('main .commerce-cart')) {
        pageType = 'Cart';
    } else if (document.body.querySelector('main .commerce-checkout')) {
        pageType = 'Checkout';
    }
    if (main) {
        decorateMain(main);
        // add skip to main content link
        main.id = 'main';
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.classList.add('skip-link');
        skipLink.textContent = 'Skip to Content';
        document.body.prepend(skipLink);
        document.body.classList.add('appear');
        if (['/', '/us/professional', '/us/custom-video-hero', '/us/lighting-experience-pro', '/us/explore-landscape-collection'].includes(window.location.pathname)) {
            document.body.classList.add('bleed-hero');
        }
        if (main.querySelector('.cms-page')) {
            document.body.classList.add('cms-page-body');
        }
        await waitForLCP(LCP_BLOCKS);
    }

    events.emit('eds/lcp', true);

    try {
        /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
        if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
            loadFonts();
        }
    } catch (e) {
        // do nothing
    }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
    const main = doc.querySelector('main');
    const countries = await getCountries();
    sessionStorage.setItem('countries', JSON.stringify(countries));
    await loadBlocks(main);

    const {
        hash
    } = window.location;
    const element = hash ? doc.getElementById(hash.substring(1)) : false;
    if (hash && element) element.scrollIntoView();

    await Promise.all([
        loadHeader(doc.querySelector('header')),
        loadFooter(doc.querySelector('footer')),
        loadGeopopup(doc.querySelector('footer')),
        loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`),
        loadFonts(),
    ]);

    loadBreadcrumb(doc.querySelector('header'));

    if (sessionStorage.getItem('acdl:debug')) {
        import ('./acdl/validate.js');
    }

    // Implement experimentation preview pill
    if ((getMetadata('experiment') ||
            Object.keys(getAllMetadata('campaign')).length ||
            Object.keys(getAllMetadata('audience')).length)) {
        // eslint-disable-next-line import/no-relative-packages
        const {
            loadLazy: runLazy
        } = await
        import ('../plugins/experimentation/src/index.js');
        await runLazy(document, {
            audiences: AUDIENCES
        }, pluginContext);
    }
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
    window.setTimeout(() =>
        import ('./delayed.js'), 3500);
    // load anything that can be postponed to the latest here

    // Load Social Native Gallery
    const main = document.querySelector('main');
    const metaSku = document.querySelector('meta[name="sku"]');
    if (main && metaSku) {
        loadSocialNativeGallery();
    }
}

export async function fetchIndex(indexFile, pageSize = 500) {
    const handleIndex = async (offset) => {
        const resp = await fetch(`/${indexFile}.json?limit=${pageSize}&offset=${offset}`);
        const json = await resp.json();

        const newIndex = {
            complete: (json.limit + json.offset) === json.total,
            offset: json.offset + pageSize,
            promise: null,
            data: [...window.index[indexFile].data, ...json.data],
        };

        return newIndex;
    };

    window.index = window.index || {};
    window.index[indexFile] = window.index[indexFile] || {
        data: [],
        offset: 0,
        complete: false,
        promise: null,
    };

    // Return index if already loaded
    if (window.index[indexFile].complete) {
        return window.index[indexFile];
    }

    // Return promise if index is currently loading
    if (window.index[indexFile].promise) {
        return window.index[indexFile].promise;
    }

    window.index[indexFile].promise = handleIndex(window.index[indexFile].offset);
    const newIndex = await (window.index[indexFile].promise);
    window.index[indexFile] = newIndex;

    return newIndex;
}

/**
 * Check if consent was given for a specific topic.
 * @param {*} topic Topic identifier
 * @returns {boolean} True if consent was given
 */
// eslint-disable-next-line no-unused-vars
export function getConsent(topic) {
    // eslint-disable-next-line no-console
    console.warn(`getConsent not implemented for ${topic}`);
    return true;
}

async function loadPage() {
    await loadEager(document);
    await loadLazy(document);
    loadDelayed();
    pageContextPush(pageType);
    pageTypePushGtm(pageType);
    wrapImgsInSize(document);
}

// rerender dataLayer on session update
addMagentoCacheListener(() => {
    try {
        pageTypePushGtm(pageType);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in pageTypePushGtm:', error);
    }
});

if (!window.pageLoaded) {
    window.pageLoaded = true;
    loadPage();
}