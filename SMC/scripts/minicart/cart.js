/* eslint-disable import/no-cycle */
import {
    store
} from './api.js';
import {
    performMonolithGraphQLQuery
} from '../commerce.js';
import {
    getLoggedInFromLocalStorage,
    isCommerceStatePristine,
    updateMagentoCacheSections,
} from '../storage/util.js';
import {
    getCartFromLocalStorage
} from './util.js';
import {
    events
} from '@dropins/tools/event-bus.js';
import {
    addToCartEvent,
    removeCartItemDataLayer,
    updateCartItemDataLayer
} from '../datalayer-vcgtm.js';
import {
    getCustomHeightFilterValue
} from '../utils.js';

/* Queries */

const cartQueryFragment = `fragment cartQuery on Cart {
  id
  items {
      prices {
          price {
              currency
              value
          }
          total_item_discount {
            value
          }
      }
      product {
          basecode
          name
          sku
          relatives
          url_key
          relatives
          thumbnail {
              url
          }
      }
      ... on ConfigurableCartItem {
          configurable_options {
              option_label
              value_label
          }
          configured_variant {
              sku
              name
              relatives
              thumbnail {
                  url
              }
          }
      }
      ... on BundleCartItem {
        bundle_options {
            label
            values {
                label
                quantity                    
            }
        }
      }
      quantity
      uid
  }
  prices {
      subtotal_excluding_tax {
          currency
          value
      }
  }
  total_quantity
}`;

const getCartQuery = `query getCart($cartId: String!) {
  cart(cart_id: $cartId) {
      ...cartQuery
  }
}
${cartQueryFragment}`;

const getLoggedInCartIdQuery = `query {
  customerCart {
      id
  }
}`;

const createCartMutation = `mutation createSessionCart {
  cartId: createSessionCart
}`;

const removeItemFromCartMutation = `mutation removeItemFromCart($cartId: String!, $itemId: Int!) {
  removeItemFromCart(input: { cart_id: $cartId, cart_item_id: $itemId }) {
      cart {
          ...cartQuery
      }
  }
}
${cartQueryFragment}`;

const updateCartItemsMutation = `mutation updateCartItems($cartId: String!, $items: [CartItemUpdateInput!]!) {
  updateCartItems(input: { cart_id: $cartId, cart_items: $items }) {
      cart {
          ...cartQuery
      }
  }
}
${cartQueryFragment}`;

const addProductsToCartMutation = `mutation addProductsToCart($cartId: String!, $cartItems: [CartItemInput!]!) {
  addProductsToCart(cartId: $cartId, cartItems: $cartItems) {
      cart {
          ...cartQuery
      }
      user_errors {
          code
          message
      }
  }
}
${cartQueryFragment}`;

export {
    getCartQuery,
    getLoggedInCartIdQuery,
    createCartMutation,
    removeItemFromCartMutation,
    updateCartItemsMutation,
    addProductsToCartMutation,
};

/* Methods */

const handleCartErrors = (errors) => {
    if (!errors) {
        return;
    }

    // Cart cannot be found
    if (errors.some(({
            extensions
        }) => extensions ? .category === 'graphql-no-such-entity')) {
        console.error('Cart does not exist, resetting cart');
        store.resetCart();
        return;
    }

    // No access to cart
    if (errors.some(({
            extensions
        }) => extensions ? .category === 'graphql-authorization')) {
        console.error('No access to cart, resetting cart');
        store.resetCart();
        return;
    }

    if (errors.some(({
            extensions
        }) => extensions ? .category === 'graphql-input')) {
        console.error('Some items in the cart might not be available anymore');
        return;
    }

    // Throw for everything else
    throw new Error(errors);
};

/**
 * Function called when waiting for the cart to return.
 * TODO: Should be customized with selectors specific to your implementation.
 *
 * @returns void
 */
export function waitForCart() {
    const buttons = document.querySelectorAll('button.nav-cart-button, .minicart-header > .close');
    const wrapper = document.querySelector('.minicart-wrapper');
    wrapper ? .classList.add('loading');
    buttons.forEach((button) => {
        button.disabled = true;
    });
    return () => {
        wrapper ? .classList.remove('loading');
        buttons.forEach((button) => {
            button.disabled = false;
        });
    };
}

/**
 * Get the session cart from commerce system and resolve localStorage / sessionStorage state drift.
 *
 * @param {Object | undefined} options session cart options
 * @param {boolean | undefined} options.waitForCart should the "wait for cart" behavior be triggered
 * @param {boolean | undefined} options.force should the "wait for cart" behavior be triggered
 */
export async function resolveSessionCartDrift(options) {
    const sectionsOfInterest = ['cart', 'customer', 'side-by-side'];

    // We will exit and do nothing if there is no sign of a commerce session ever existing.
    if (isCommerceStatePristine() && !options.force) {
        return;
    }

    let done = () => {};
    if (options.waitForCart) {
        done = waitForCart();
    }

    await updateMagentoCacheSections(sectionsOfInterest);

    const loggedIn = getLoggedInFromLocalStorage();

    // This section is for toggling the logged in/out icon/status in your header (if relevant)
    document.querySelectorAll('.icon-user').forEach((item) => {
        item.classList.add(loggedIn ? 'logged-in' : 'logged-out');
        item.classList.remove(loggedIn ? 'logged-out' : 'logged-in');
    });

    localStorage.setItem('loggedIn', loggedIn);

    store.notifySubscribers();

    done();
}

export function updateCartFromLocalStorage(options) {
    let done = () => {};
    if (options.waitForCart) {
        done = waitForCart();
    }

    // Get cart representation from local storage in mage-cache-storage
    const previousLogin = localStorage.getItem('loggedIn') === 'true';

    // Get loggedin status from local storage 'customer'
    const registeredCustomer = getLoggedInFromLocalStorage();

    const storedCart = getCartFromLocalStorage();
    if (!storedCart) {
        // we just return here since we have no cart data, it will display the default empty cart
        return;
    }

    // If the commerce session tells us we are logged in...
    if (registeredCustomer === true) {
        // Update the account section in the header
        // authApi.updateAuthenticationDisplays();

        localStorage.setItem('loggedIn', true);
    } else {
        // else we are not logged in so we'll be sure the state reflects this
        if (previousLogin || !storedCart) {
            store.resetCart();
        }

        localStorage.setItem('loggedIn', false);
    }
    store.notifySubscribers();
    done();
}

export async function queryLoggedInCart(token) {
    try {
        const variables = {};
        const {
            data,
            errors
        } = await performMonolithGraphQLQuery(
            getLoggedInCartIdQuery,
            variables,
            false,
            token,
        );
        handleCartErrors(errors);

        return data.customerCart.id;
    } catch (err) {
        console.error('Could not query logged in user\'s cart', err);
        return '';
    }
}

function isJson(str) {
    let value = typeof str !== "string" ? JSON.stringify(str) : str;
    try {
        value = JSON.parse(value);
    } catch (e) {
        return false;
    }
    return typeof value === "object" && value !== null;
}

export async function addToCart(sku, options, quantity) {
    await updateMagentoCacheSections(['cart', 'side-by-side']);

    const done = waitForCart();
    let customHeightJson = {};
    const customHeightFilterValue = getCustomHeightFilterValue();
    if (customHeightFilterValue.length > 0) {
        customHeightJson = JSON.parse(atob(customHeightFilterValue));
    }

    try {
        const cartValues = {
            sku,
            quantity,
            selected_options: options,
        }

        if (Object.keys(customHeightJson).length !== 0 && customHeightJson.price !== undefined && customHeightJson.price !== null &&
            customHeightJson.value !== null && customHeightJson.value !== undefined
        ) {
            cartValues.custom_height = customHeightJson;
            if (customHeightJson.price === 0) {
                cartValues.standard_height = {
                    value: customHeightJson.value
                };
            }
        }

        const variables = {
            cartId: await store.getCartId(),
            cartItems: [cartValues],
        };

        // Check if the LED bulb checkbox is selected and prepare additional item
        const sanitizedSku = sku.replace(/\s+/g, '');
        const bulbCheckbox = document.querySelector(`#lightbulb-${sanitizedSku}`);
        const qtyInput = document.querySelector('#pdp-qty-input');
        if (!qtyInput) throw new Error('Quantity input not found');

        const updatedQty = parseInt(qtyInput.value, 10);
        if (Number.isNaN(updatedQty) || updatedQty < 1) {
            return;
        }
        let bulbSku = '';
        let bulbQty = 0;

        if (bulbCheckbox && bulbCheckbox.checked) {
            bulbSku = bulbCheckbox.getAttribute('data-sku');
            bulbQty = parseInt(bulbCheckbox.getAttribute('data-qty'), 10);

            // Add bulb as a separate item in the cart
            variables.cartItems.push({
                sku: bulbSku,
                quantity: bulbQty * updatedQty,
                selected_options: [],
            });
        }

        const {
            data,
            errors
        } = await performMonolithGraphQLQuery(
            addProductsToCartMutation,
            variables,
            false,
            true,
        );
        handleCartErrors(errors);

        const {
            cart,
            user_errors: userErrors
        } = data.addProductsToCart;
        if (userErrors && userErrors.length > 0) {
            console.error('User errors while adding item to cart', userErrors);
        }

        cart.items = cart.items.filter((item) => item);

        // Adding a new line item to the cart incorrectly returns the total
        // quantity so we check that and update if necessary
        if (cart.items.length > 0) {
            const lineItemTotalQuantity = cart.items.flatMap(
                (item) => item.quantity,
            ).reduce((partialSum, a) => partialSum + a, 0);
            if (lineItemTotalQuantity !== cart.total_quantity) {
                console.debug('Incorrect total quantity from AC, updating.');
                cart.total_quantity = lineItemTotalQuantity;
            }
        }
        await store.updateCart();
        console.debug('Added items to cart', variables, cart);
    } catch (err) {
        console.error('Could not add item to cart', err);
    } finally {
        events.on('eds/lcp', async () => {
            await addToCartEvent();
        }, {
            eager: true
        });
        done();
    }
}

export async function removeItemFromCart(itemId) {

    const done = waitForCart();
    const variables = {
        cartId: await store.getCartId(),
        itemId,
    };

    try {
        const {
            errors
        } = await performMonolithGraphQLQuery(
            removeItemFromCartMutation,
            variables,
            false,
            true,
        );
        handleCartErrors(errors);
        await removeCartItemDataLayer(itemId);
        await store.updateCart(); // update localStorage with latest cart data
    } catch (err) {
        console.error('Could not remove item from cart', err);
    } finally {
        done();
    }
}

export async function updateQuantityOfCartItem(cartItemId, quantity) {

    const done = waitForCart();
    const variables = {
        cartId: await store.getCartId(),
        items: [{
            cart_item_id: cartItemId,
            quantity,
        }],
    };
    try {
        const {
            data,
            errors
        } = await performMonolithGraphQLQuery(
            updateCartItemsMutation,
            variables,
            false,
            true,
        );
        handleCartErrors(errors);
        await updateCartItemDataLayer(cartItemId, quantity);
        await store.updateCart(); // update localStorage with latest cart data
        console.debug('Update quantity of item in cart', variables, data.updateCartItems.cart);
    } catch (err) {
        console.error('Could not update quantity of item in cart', err);
    } finally {
        done();
    }
}

export async function getItemFromCart() {
    const done = waitForCart();
    const variables = {
        cartId: await store.getCartId(),
    };
    try {
        const {
            data,
            errors
        } = await performMonolithGraphQLQuery(
            getCartQuery,
            variables,
            false,
            true,
        );
        handleCartErrors(errors);
        return data;
    } catch (err) {
        console.error('no cart items');
    } finally {
        done();
    }
}