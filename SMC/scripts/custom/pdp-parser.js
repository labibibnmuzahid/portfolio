import {
    getMetadata
} from '../aem.js';
// eslint-disable-next-line import/no-cycle
import {
    fetchAndSetProductPrice
} from './pricing.js';
import {
    getMagentoCache,
    updateMagentoCacheSections
} from '../storage/util.js';

/**
 * Extract the product name from the page
 * @returns {string}
 */
function extractProductName() {
    const h1Element = document.querySelector('h1');
    return h1Element ? .innerText || null;
}

/**
 * Extract product stock status from the page
 * @returns {boolean}
 */
function extractProductStock() {
    const stockMetaTag = document.querySelector('meta[name="instock"]');
    if (stockMetaTag) {
        const stockValue = stockMetaTag.getAttribute('content');
        return stockValue === 'true';
    }
    return false;
}

/**
 * Extract product options from the page
 * @returns { Option[] }
 */
function extractProductOptions() {
    const options = [];
    document.querySelectorAll('.product-options > div').forEach((row) => {
        const cells = [...row.querySelectorAll(':scope > div')].map((cell) => cell.textContent);
        if (cells[0] !== 'option') {
            const [id, title, typename, type, multiple, required] = cells;
            options.push({
                id,
                title,
                typename,
                type: type || 'dropdown',
                multiple: multiple === 'true',
                required: required === 'true',
                values: [],
            });
        } else {
            // eslint-disable-next-line no-unused-vars
            const [_, id, title, value, selected, inStock] = cells;
            options[options.length - 1].values.push({
                id,
                title,
                value: id,
                selected,
                inStock: inStock === 'true',
            });
        }
    });

    return options;
}

/**
 * Extract product attributes from the page
 * @returns { Attribute[] }
 */
function extractProductAttributes() {
    const attributes = [];
    document.querySelectorAll('.product-attributes > div').forEach((row) => {
        const [name, label, value] = [...row.querySelectorAll(':scope > div')].map((cell) => cell.textContent);
        attributes.push({
            name,
            label,
            value
        });
    });
    return attributes;
}

// Parse Variants data from the page.
function extractProductVariants() {
    const variants = [];
    document.querySelectorAll('.product-variants > div').forEach((row) => {
        const columns = [...row.querySelectorAll(':scope > div')];

        const variant = {
            sku: columns[0] ? .textContent.trim() || '',
            name: columns[1] ? .textContent.trim() || '',
            description: columns[2] ? .textContent.trim() || '',
            inStock: columns[3] ? .textContent.trim() === 'inStock',
            price: {
                roles: ['visible'],
                regular: {
                    amount: {
                        currency: columns[5] ? .textContent.match(/[A-Za-z]{3}$/) ? .[0] || 'USD',
                        value: parseFloat(columns[4] ? .textContent.match(/[\d.]+/)) || 0,
                    },
                },
                final: {
                    amount: {
                        currency: columns[5] ? .textContent.match(/[A-Za-z]{3}$/) ? .[0] || 'USD',
                        value: parseFloat(columns[5] ? .textContent.match(/[\d.]+/)) || 0,
                    },
                },
            },
            images: [],
            selections: columns[7] ? .textContent.trim().split(',').map((selection) => selection.trim()) || [],
        };

        const pictures = columns[6] ? .querySelectorAll('picture');
        if (pictures) {
            pictures.forEach((picture) => {
                const sources = [...picture.querySelectorAll('source')].map((source) => ({
                    type: source.getAttribute('type'),
                    srcset: source.getAttribute('srcset'),
                    media: source.getAttribute('media') || '',
                }));
                const img = picture.querySelector('img');
                if (img) {
                    variant.images.push({
                        sources,
                        img: {
                            src: img.getAttribute('src'),
                            alt: img.getAttribute('alt'),
                            width: img.getAttribute('width'),
                            height: img.getAttribute('height'),
                            loading: img.getAttribute('loading'),
                        },
                    });
                }
            });
        }

        if (variant.inStock) {
            variants.push(variant);
        }
    });
    return variants;
}

// Parse Images data from the page. Uses same structure as in PDP object
function extractProductImages() {
    const images = [];

    document.querySelectorAll('.product-images > div').forEach((row) => {
        const columns = [...row.querySelectorAll(':scope > div')];
        columns.forEach((column) => {
            const picture = column.querySelector('picture');
            if (picture) {
                const sources = [...picture.querySelectorAll('source')].map((source) => ({
                    type: source.getAttribute('type'),
                    srcset: source.getAttribute('srcset'),
                    media: source.getAttribute('media') || '',
                }));
                const img = picture.querySelector('img');
                if (img) {
                    images.push({
                        sources,
                        img: {
                            src: img.getAttribute('src') || '',
                            alt: img.getAttribute('alt') || '',
                            width: img.getAttribute('width') || '',
                            height: img.getAttribute('height') || '',
                            loading: img.getAttribute('loading') || '',
                        },
                    });
                }
            }
        });
    });
    return images;
}

function extractImageDataInPdpFormat(images) {
    return images.map((image) => ({
        url: image.img.src,
        label: image.img.alt,
        width: image.img.width,
        height: image.img.height,
    }));
}

function getSelectedProductFromURL() {
    const selectedProduct = new URLSearchParams(window.location.search).get('selected_product');
    if (!selectedProduct) {
        return null;
    }
    return selectedProduct;
}

function extractProductCategories() {
    const categories = [];
    document.querySelectorAll('.product-categories > div').forEach((row) => {
        const [level, urlkey, urlpath] = [...row.querySelectorAll(':scope > div')].map((cell) => cell.textContent);
        categories.push({
            level,
            urlkey,
            urlpath
        });
    });
    return categories;
}

// Parse variant attributes data from the page.
function extractProductVariantAttributes() {
    if (!window.product || !window.product.variants) {
        return;
    }

    const productVariants = window.product.variants;
    let currentVariant = null;

    document.querySelectorAll('.variant-attributes > div').forEach((row) => {
        const cells = row.querySelectorAll('div');
        const firstCellText = cells[0] ? .textContent.trim();

        if (firstCellText === 'sku') {
            // Find the existing variant
            const sku = cells[1] ? .textContent.trim();
            currentVariant = productVariants.find((variant) => variant.sku === sku);
        } else if (firstCellText === 'attribute' && currentVariant) {
            // Add attribute to the current variant
            const attribute = {
                name: cells[1] ? .textContent.trim(),
                label: cells[2] ? .textContent.trim(),
                value: cells[3] ? .textContent.trim(),
            };
            if (!currentVariant.attributes) {
                currentVariant.attributes = [];
            }
            currentVariant.attributes.push(attribute);
        }
    });
}

function parseHeightData(heightData) {
    let height = heightData.split(':')[1];
    height = height.replace(/"/g, '');
    return parseFloat(height);
}

function addHeight(options, height = 0, price = 0, optionTitle = 'Height') {
    const option = [btoa(`{"value":${height},"price":${price}}`), `${optionTitle} ${height}" +$${price}`, `${price}`, false, 'inStock'];
    const [id, title, value, selected, inStock] = option;
    options[options.length - 1].values.push({
        id,
        title,
        value,
        selected,
        inStock,
    });
}

function addHeightOption(options) {
    const mounting = window ? .product ? .variants[0] ? .attributes ? .find((attr) => attr.label === 'mounting');
    if (mounting ? .value === 'Rod') {
        const rodQty = window ? .product ? .variants[0] ? .attributes ? .find((attr) => attr.label === 'rodqty') ? .value;
        let minHeight = window ? .product ? .variants[0] ? .attributes ? .find((attr) => attr.label === 'Criteria 3') ? .value;
        let oaHeight = window ? .product ? .variants[0] ? .attributes ? .find((attr) => attr.label === 'Details') ? .value;

        if (!rodQty || !minHeight || !oaHeight) {
            return;
        }

        minHeight = parseHeightData(minHeight);
        oaHeight = parseHeightData(oaHeight);
        const maxHeight = parseFloat(oaHeight) + 36;

        const heightFilter = ['ProductiveViewOptionValueConfiguration', 'dropdown', '', ''];
        const id = 'height_filter';
        const title = 'Height';
        const [typename, type, multiple, required] = heightFilter;
        options.push({
            id,
            title,
            typename,
            type,
            multiple,
            required,
            values: [],
        });

        const ascOptions = [];
        ascOptions.push({
            options,
            height: oaHeight,
            price: 0,
            title: 'Standard',
        });

        for (let x = minHeight; x <= maxHeight; x += 1) {
            let price = 200 * rodQty;
            if (x - oaHeight >= 24) {
                price = 300 * rodQty;
            }

            if (Math.floor(x) !== Math.floor(oaHeight)) {
                ascOptions.push({
                    options,
                    height: Math.floor(x) === maxHeight ? maxHeight : x,
                    price
                });
            }
        }

        ascOptions.sort((a, b) => b.height - a.height)
            .map((op) => addHeight(options, op.height, op.price, op.title));
    }
}

/**
 * Extract product data from the page
 */
async function buildProductDetails() {
    const sku = getMetadata('sku').toUpperCase();
    if (!sku || !!window.product) {
        return;
    }
    window.product = {
        sku,
        name: '',
        inStock: false,
        options: [],
        attributes: [],
        categories: [],
        images: [],
        variants: [],
        selectedVariant: null,
        externalId: null,
        customOptions: [],
        isSignature: false,
    };

    window.product.name = extractProductName();
    window.product.inStock = extractProductStock();
    window.product.options = extractProductOptions();
    window.product.attributes = extractProductAttributes();
    window.product.variants = extractProductVariants();

    // Check cache and update if needed
    const currentCache = getMagentoCache();
    if (!currentCache ? .customer) {
        await updateMagentoCacheSections(['customer', 'side-by-side']);
    }

    const images = extractProductImages();
    if (images) {
        window.product.images = extractImageDataInPdpFormat(images);
    } else {
        extractImageDataInPdpFormat(window.product.selectedVariant.images);
    }

    if (!window.product.selectedVariant) {
        const productFromURL = getSelectedProductFromURL();
        if (productFromURL && productFromURL !== '') {
            window.product.selectedVariant = window.product.variants.find(
                (variant) => variant.sku === productFromURL,
            );
        } else {
            window.product.selectedVariant = window.product.variants.find(
                (variant) => variant.images[0] ? .img.src === window.product.images[0] ? .url,
            ) || window.product.variants[0];
        }
    }

    window.product.externalId = getMetadata('externalid');
    window.product.categories = extractProductCategories();
    extractProductVariantAttributes();
    addHeightOption(window.product.customOptions);

    await fetchAndSetProductPrice();
}

/**
 * Parses SSR data from the page and puts it into the window object.
 */
export default async function parseSsrData() {
    try {
        await buildProductDetails();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('SSR Data parsing failed', error);
    }
}