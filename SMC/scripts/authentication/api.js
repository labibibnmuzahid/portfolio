import {
    addMagentoCacheListener,
    getLoggedInFromLocalStorage,
    isTradeCustomer,
    getCustomerFullname
} from '../storage/util.js';
import {
    getLocale,
    getConfigValue
} from '../configs.js';

const {
    commerceBaseUri,
    isDefaultLocale,
    baseUri
} = getLocale();

// eslint-disable-next-line import/prefer-default-export
export const authApi = {
    /**
     * An authentication helper method to check if the user is
     * logged in based on data in local storage.
     *
     * @returns Whether the current user is logged in
     */
    isLoggedIn: () => getLoggedInFromLocalStorage(),

    /**
     * Login with the existing Magento implementation.
     *
     * @param {*} input required input
     * @param {Object} input.formFields the form fields
     * @returns void
     */
    login: async (input) => {
        const {
            formFields: loginData
        } = input;
        loginData.captcha_form_id = 'user_login';
        loginData.context = 'checkout';

        // We'll use an abort controller to make sure we don't hang for too long blocking the user.
        const loginAbortController = new AbortController();
        setTimeout(() => loginAbortController.abort('Too long.'), 6000);

        const response = await fetch('/customer/ajax/login/', {
            signal: loginAbortController.signal,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Store: await getConfigValue('commerce-store-code'),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            body: JSON.stringify(loginData),
        });
        const result = await response.json();

        return result;
    },

    /**
     * Triggers the display updates the account section.
     * Can be extended to update other areas of the nav (i.e. 'reward points')
     */
    updateAuthenticationDisplays: () => {
        const isLoggedIn = getLoggedInFromLocalStorage();
        const userIcon = document.querySelector('.icon-user');
        const mobileAccountMenu = document.querySelector('#tabpanel-account');

        // dont update anything if user is logged in and the account menu is already present
        if (isLoggedIn && userIcon.querySelector('.account-menu-wrapper')) {
            return;
        }

        // if user is logged in and the account menu has not already been rendered in DOM yet
        if (isLoggedIn && userIcon.querySelector('.account-menu-wrapper') === null) {
            // updating account display
            userIcon.classList.add(isLoggedIn ? 'logged-in' : 'logged-out');
            userIcon.classList.remove(isLoggedIn ? 'logged-out' : 'logged-in');

            // build a <ul> of <li> items
            const accountMenu = document.createElement('ul');
            accountMenu.classList.add('account-menu');

            let tradeCustomerLink = '';
            if (isTradeCustomer()) {
                const tradeCustomerLinkHref = !isDefaultLocale ? `${commerceBaseUri}/requisition_list/requisition/index/` : `${baseUri}/customer/projects`;
                tradeCustomerLink = `<li><a href=${tradeCustomerLinkHref}>Quotes</a></li>`;
            }

            accountMenu.innerHTML = `
        <li><a href="${commerceBaseUri}/customer/account/">Account</a></li>
        <li><a href="${commerceBaseUri}/orderview/orders/history/">Orders</a></li>
        ${tradeCustomerLink}
        <li><a href="${commerceBaseUri}/wishlist/index/list/">Projects</a></li>
        <li><a href="${commerceBaseUri}/customer/account/logout">Logout</a></li>
      `;

            // create a <div> and append the <ul> to it
            // TODO consider appending this element to the mobile menu as well since that is currently missing in mobile.
            const accountMenuWrapper = document.createElement('div');
            accountMenuWrapper.classList.add('account-menu-wrapper');
            accountMenuWrapper.appendChild(accountMenu);

            // create a <div> with the text 'Welcome, ${name}' inside of it, add this div to the accountMenuWrapper
            const welcomeDiv = document.createElement('div');
            welcomeDiv.classList.add('welcome');
            welcomeDiv.textContent = `Welcome, ${getCustomerFullname()}`;
            accountMenuWrapper.prepend(welcomeDiv);

            // mobile account menu
            if (mobileAccountMenu) {
                const loginItems = mobileAccountMenu.querySelectorAll('li');
                if (loginItems) loginItems.forEach((item) => item.remove());
                const logoutItem = document.createElement('li');
                logoutItem.innerHTML = `
          <p>Welcome, ${getCustomerFullname()}</p>
          <a href="${commerceBaseUri}/customer/account/logout/">
            Logout
          </a>
        `;
                // insert account menu items without the ul wrapper
                mobileAccountMenu.insertAdjacentHTML('afterbegin', accountMenu.innerHTML);
                // but remove the logout list item
                mobileAccountMenu.querySelector('li:last-child').remove();
                // and add the mobile logout item
                mobileAccountMenu.prepend(logoutItem);
            }

            // append the <div> to the '.icon-user' element
            userIcon.appendChild(accountMenuWrapper);

            userIcon.tabIndex = 0;
            userIcon.setAttribute('role', 'button');
            userIcon.setAttribute('aria-label', 'Open Account Menu');
            userIcon.setAttribute('aria-haspopup', 'true');
            userIcon.setAttribute('aria-expanded', 'false');

            // add click event listener to '.icon-user' element
            userIcon.addEventListener('click', function(event) {
                if (isLoggedIn && !event.target.closest('.account-menu')) {
                    this.classList.toggle('show-account-menu');
                    this.setAttribute('aria-expanded', this.classList.contains('show-account-menu'));
                }
            });

            // add keydown event listener to '.icon-user' element
            userIcon.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    this.classList.toggle('show-account-menu');
                    this.setAttribute('aria-expanded', this.classList.contains('show-account-menu'));
                }
            });

            // add focusout event listener to '.icon-user' element
            userIcon.addEventListener('focusout', function(event) {
                if (!event.relatedTarget || !event.relatedTarget.closest('.account-menu')) {
                    this.classList.remove('show-account-menu');
                    this.setAttribute('aria-expanded', this.classList.contains('show-account-menu'));
                }
            });

            // add click event listener to the document to close the account menu when clicking outside of it
            document.addEventListener('click', function(event) {
                if (!event.target.closest('.icon-user') && !event.target.closest('.account-menu')) {
                    userIcon.classList.remove('show-account-menu');
                }
            });
        } else {
            // remove ds-customer if user is logged out
            window.localStorage.removeItem('ds-customer');

            // else we assume the user is logged out and thus we link to the login page.
            // remove the .account-menu-wrapper element if it exists
            userIcon.querySelector('.account-menu-wrapper') ? .remove();

            if (document.querySelectorAll(`a[href='${commerceBaseUri}/customer/account/login/']`).length === 1) {
                // wrap the .icon-user element in an <a> tag, linking to the login page
                const loginLink = document.createElement('a');
                loginLink.href = `${commerceBaseUri}/customer/account/login/`;
                loginLink.className = 'account-user';
                loginLink.setAttribute('aria-label', 'Login');

                // clone the userIcon before appending it to loginLink
                const userIconClone = userIcon.cloneNode(true);
                loginLink.appendChild(userIconClone);

                // replace the .icon-user element with the <a> tag
                userIcon.replaceWith(loginLink);
            }
        }
    },

    /**
     * Setting up a listener to update the display for all authentication-specific
     * displays when the local storage cache is updated.
     */
    listenForAuthUpdates: () => {
        addMagentoCacheListener(() => {
            authApi.updateAuthenticationDisplays();
        });
    },
};