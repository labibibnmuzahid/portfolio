import {
    cartApi
} from '../../scripts/minicart/api.js';
import {
    getMetadata
} from '../../scripts/aem.js';
import {
    wrapImgsInLinks
} from '../../scripts/scripts.js';
import {
    loadFragment
} from '../fragment/fragment.js';
import {
    authApi
} from '../../scripts/authentication/api.js';
import {
    createTabsList,
    createTabPanels,
    attachTabEventHandlers,
    createMenuAccordion,
    createSearchBar,
    generateLanguageDropdown,
} from './header-utils.js';
import {
    getLocale
} from '../../scripts/configs.js';

/**
 * loads the nav content fragment
 * @returns {HTMLElement}
 */

const {
    baseUri,
    commerceBaseUri,
    language,
    isDefaultLocale,
} = getLocale();

async function loadNavFragment() {
    const navMeta = getMetadata('nav');
    const navPath = navMeta ? new URL(navMeta).pathname : `${baseUri}/nav`;
    const fragment = await loadFragment(navPath);
    return fragment;
}

/**
 * returns a nav element with the fragment as contents
 * @param {HTMLElement} fragment
 * @returns {HTMLElement}
 */

function buildNavElement(fragment) {
    const navElement = document.createElement('nav');
    navElement.id = 'nav';
    navElement.setAttribute('aria-expanded', false);
    while (fragment.firstElementChild) {
        navElement.append(fragment.firstElementChild);
    }
    return navElement;
}

/**
 * returns the nav wrapped in a div with .nav-wrapper class
 * @param {HTMLElement} nav
 * @returns {HTMLElement}
 */

function wrapNav(nav) {
    const navWrapper = document.createElement('div');
    navWrapper.className = 'nav-wrapper';
    navWrapper.append(nav);
    return navWrapper;
}

/**
 * deal with the section of the nav that is
 * visible when page is loaded
 * @param {Element} navHeaderContent
 */

function createNavHeader(navHeaderContent) {
    const navToggle = document.createElement('button');
    navToggle.id = 'nav-toggle';
    navToggle.classList.add('nav-toggle');
    navToggle.innerHTML = '<span class="nav-hamburger-icon"></span>';
    navToggle.title = 'Toggle nav menu';
    navHeaderContent.prepend(navToggle);

    navToggle.addEventListener('click', () => {
        const nav = document.querySelector('#nav');
        nav.setAttribute('aria-expanded', true);
        const navOverlay = document.querySelector('#nav-overlay');
        navOverlay.classList.add('active');
        document.querySelector('body').classList.add('no-scroll');
        document.querySelector('#close-menu-button').focus();
    });

    // close on overlay click
    const navOverlay = document.querySelector('#nav-overlay');
    navOverlay.addEventListener('click', (e) => {
        // eslint-disable-next-line no-use-before-define
        if (e.target === navOverlay) closeMenu();
    });
}

/**
 * Render the mini cart in the header using the .icon-shopping-bag as a mount point
 * @param {Element} nav
 */
function createMiniCart(nav) {
    const cartIcon = nav.querySelector('.icon-shopping-bag');
    cartIcon.tabIndex = 0;
    cartIcon.setAttribute('role', 'button');
    cartIcon.setAttribute('aria-label', 'Go to cart');

    // Minicart
    const minicartButton = document.createRange()
        .createContextualFragment(`<div class="minicart-wrapper" data-count="">
    <span class="nav-cart-button counter-number">0</span>
    <div></div>
  </div>`);
    cartIcon.append(minicartButton);

    // toggle minicart on img hover
    let timeout;
    cartIcon.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        cartApi.showCart();
    });

    // hide minicart on img mouseleave
    cartIcon.addEventListener('mouseleave', (event) => {
        clearTimeout(timeout);
        // prevent hiding if the mouse is over the remove modal
        if (event.relatedTarget ? .closest('.overlay-background')) return;
        timeout = setTimeout(() => {
            cartApi.hideCart();
        }, 250);
    });

    // add click event listener to minicart icon to navigate user to cart page.
    cartIcon.addEventListener('click', (event) => {
        if (!event.target.closest('a')) event.preventDefault();
        if (!event.target.closest('.minicart-panel')) {
            window.location.href = `${commerceBaseUri}/checkout/cart/`;
        }
    });

    // add enter/return and space key event listener to minicart icon to navigate user to cart page
    cartIcon.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.href = `${commerceBaseUri}/checkout/cart/`;
        }
    });

    // listen for updates to cart item count and update UI accordingly
    cartApi.cartItemsQuantity.watch((quantity) => {
        const navCartButton = cartIcon.querySelector('.nav-cart-button');
        navCartButton.textContent = quantity;
        navCartButton.dataset.count = quantity;

        cartIcon.querySelector('.minicart-wrapper').dataset.count = quantity;
    });

    cartApi.updateCartDisplay(false);

    // This will get the cart, customer, and side-by-side sections from Magento to
    // set us up to display the correct cart, logged-in status, etc
    if (!new URLSearchParams(window.location.search).get('skip-delayed')) {
        cartApi.resolveDrift(3000, true);
    }
}

/**
 * Render the account dropdown in the header using the .icon-user as a mount point
 */
function createAccount() {
    authApi.listenForAuthUpdates();
    authApi.updateAuthenticationDisplays();
}

/**
 * close the nav menu
 */

function closeMenu() {
    document.querySelector('#nav').setAttribute('aria-expanded', false);
    document.querySelector('body').classList.remove('no-scroll');
    document.querySelector('#nav-overlay').classList.remove('active');
    document.querySelector('#nav-toggle').focus();
}

/**
 * create a mobile-only header that contains
 * the logo and the close menu button
 * @param {Element} navHeaderContent
 * @param {Element} menuContent
 */

function createMobileHeader(navHeaderContent, menuContent) {
    const mobileMenuHeader = document.createElement('div');
    mobileMenuHeader.classList.add('nav-mobile-menu-header');
    const closeMenuButton = document.createElement('button');
    closeMenuButton.id = 'close-menu-button';

    const navImage = navHeaderContent.querySelector(':scope > p > a > picture');
    const mobileNavHeaderLogoImage = document.createElement('div');
    mobileNavHeaderLogoImage.classList.add('mobile-nav-header-logo-image');
    mobileNavHeaderLogoImage.innerHTML = navImage.outerHTML;
    mobileMenuHeader.append(mobileNavHeaderLogoImage);

    closeMenuButton.innerHTML = '<span class="close-menu-button visually-hidden">Close Menu</span>';
    mobileMenuHeader.append(closeMenuButton);
    menuContent.prepend(mobileMenuHeader);

    // close menu event handler
    closeMenuButton.addEventListener('click', () => {
        closeMenu();
    });
}

/**
 * build welcome header
 */
function buildWelcomeHeader() {
    document.querySelector('#main').insertAdjacentHTML('afterbegin', `<div id='welcome-header'><h3>Welcome to our ${language.toUpperCase()} Site</h3></div>`);
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
    // load nav contents and create initial element
    const nav = buildNavElement(await loadNavFragment());

    // the first section in the block is the nav header content
    const navHeaderContent = nav.querySelector(':scope > div:nth-child(1) > div');
    navHeaderContent.classList.add('nav-header-content');

    // create the overlay that display behind the menu and over page content
    const navOverlay = document.createElement('div');
    navOverlay.id = 'nav-overlay';
    navOverlay.classList.add('nav-overlay');
    document.querySelector('body').prepend(navOverlay);

    // the first section in the block is the nav header section
    const headerSection = nav.querySelector(':scope > div:nth-child(1)');
    headerSection.classList.add('nav-header-section');

    // the second section in the block is the nav menu content
    const menuContent = nav.querySelector(':scope > div:nth-child(2)');
    menuContent.classList.add('nav-menu-content');

    // find the <p> tags in the nav, which will be used
    // to designate the "tabs" for the mobile view
    const paragraphs = [...menuContent.querySelectorAll(':scope > div > p')];

    // handle image links
    wrapImgsInLinks(navHeaderContent);

    // create the nav header with hamburger expand/collapse
    createNavHeader(navHeaderContent);

    // create the minicart with item count badge and dropdown
    createMiniCart(nav);

    // create tabs list
    createTabsList(nav, paragraphs);

    // create tabs panels
    createTabPanels(nav, paragraphs);

    // attach tab handlers
    attachTabEventHandlers(nav);

    // create accordions for menu
    await createMenuAccordion(nav);

    // create the mobile header
    createMobileHeader(navHeaderContent, menuContent);

    // create searchbar
    createSearchBar(nav);

    // create welcome header
    if (!isDefaultLocale) {
        buildWelcomeHeader();
    }

    const iconList = nav.querySelector('.nav-header-content > ul');
    // create a new li element to hold the country icon
    const countryItem = document.createElement('li');
    iconList.append(countryItem);

    const {
        toggleSpan,
        locationsDropdown
    } = generateLanguageDropdown();

    // Append the outer div to defaultContentWrapper as the first child
    countryItem.prepend(locationsDropdown);

    // click event for dropdown
    if (locationsDropdown) {
        locationsDropdown.addEventListener('click', (event) => {
            const {
                target
            } = event;
            if (target.tagName === 'SPAN') {
                locationsDropdown.classList.toggle('active');
                toggleSpan.classList.toggle('active');
            }
        });

        // close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            const {
                target
            } = event;
            if (!locationsDropdown.contains(target)) {
                locationsDropdown.classList.remove('active');
                toggleSpan.classList.remove('active');
            }
        });
    }
    // wrap nav and append to header
    const navWrapper = wrapNav(nav);
    block.append(navWrapper);

    // create the account dropdown
    createAccount();
}