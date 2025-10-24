import {
    getLocale,
    getCountries
} from '../../scripts/configs.js';
import {
    isDesktop,
    setAttributes
} from '../../scripts/utils.js';

const countries = JSON.parse(sessionStorage.getItem('countries')) || await getCountries();
const {
    language,
    countryFlag,
    countryName
} = getLocale();

export function insertFormAfterDescription(index, columnDiv) {
    if (index !== 1) return;
    const formWrapper = document.createElement('div');
    formWrapper.innerHTML = `
    <div class="signup-form">
      <form class="form subscribe" novalidate="novalidate" method="post">
        <div class="field newsletter">
          <div class="control">
            <label for="newsletter">
            <span>Email </span>
              <input name="email" type="email" id="newsletter" placeholder="email@domain.com" required="required" />
            </label>
          </div>
        </div>
        <div class="actions">
          <button class="action subscribe primary" title="Sign Up" type="submit" aria-label="Sign Up">SUBMIT</button>
        </div>
      </form>
    </div>
    <div class="subscribe-msg" style="display: none;">
      <div class="message">
        <div></div>
      </div>
    </div>
  `;
    columnDiv.appendChild(formWrapper);
}

export function generateLanguageDropdown() {
    // Create the outer div
    const locationsDropdown = document.createElement('div');
    locationsDropdown.classList.add('locations-dropdown', 'footer');

    // Create the span
    const toggleSpan = document.createElement('span');
    toggleSpan.dataset.toggle = 'dropdown';
    toggleSpan.setAttribute('aria-haspopup', 'true');
    toggleSpan.setAttribute('aria-expanded', 'false');
    toggleSpan.setAttribute('id', 'dropdownMenuButton');
    toggleSpan.setAttribute('role', 'button');
    toggleSpan.setAttribute('tabindex', '0');
    toggleSpan.classList.add('action', 'toggle', 'flag', countryFlag);
    toggleSpan.textContent = countryName;

    // Create the ul
    const dropdownUl = document.createElement('ul');
    dropdownUl.classList.add('dropdown');
    dropdownUl.dataset.target = 'dropdown';
    dropdownUl.setAttribute('aria-hidden', 'true');

    countries.forEach((country) => {
        const li = document.createElement('li');

        if (country.href && country.param !== language) {
            // create the a if is not the country selected
            const a = document.createElement('a');
            a.href = country.href;
            a.dataset.uwRmBrl = 'PR';
            a.dataset.uwOriginalHref = country.href;

            const flagDiv = document.createElement('div');
            flagDiv.classList.add('flag', country.flag);

            const span = document.createElement('span');
            span.textContent = country.name;

            a.append(flagDiv, span);
            li.append(a);
        } else {
            const flagDiv = document.createElement('div');
            flagDiv.classList.add('flag', country.flag);

            const span = document.createElement('span');
            span.textContent = country.name;

            li.append(flagDiv, span);
        }

        dropdownUl.append(li);
    });

    // Append the span and ul to the outer div
    locationsDropdown.append(toggleSpan, dropdownUl);

    // return toggleSpan and locationsDropdown
    return {
        toggleSpan,
        locationsDropdown
    };
}

export function updateFormMessage(text, status) {
    const message = document.querySelector('.subscribe-msg');
    if (!message) return;

    message.style.display = 'flex';
    message.classList.remove('success', 'error');
    message.classList.add(status);
    const messageDiv = message.querySelector('.message > div');
    messageDiv.textContent = text;
}

export function resetFormMessage() {
    const message = document.querySelector('.subscribe-msg');
    if (!message) return;

    message.style.display = 'none';
    message.classList.remove('success', 'error');
    const messageDiv = message.querySelector('.message > div');
    messageDiv.textContent = '';
}

export function validateForm(element) {
    const form = element.querySelector('form');
    if (!form) return;

    const messages = {
        successMessage: 'Thank you for your subscription.',
        errorMessageIdentify: 'There was an error identifying the user.',
        errorMessageTrack: 'There was an error tracking the user.',
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        resetFormMessage();
        const email = form.querySelector('input[name="email"]');
        const emailValue = email.value;
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        const errorMessage = form.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();

        if (emailValue && email.checkValidity() && pattern.test(emailValue)) {
            form.reset();

            window.exponea.identify({
                    email_id: emailValue
                }, {
                    email: emailValue
                },
                () => {
                    window.exponea.track(
                        'consent', {
                            category: 'email',
                            action: 'accept',
                            valid_until: 'unlimited',
                            email: emailValue,
                            import_source: `Footer - ${language.toUpperCase()} Site`,
                        },
                        () => {
                            updateFormMessage(messages.successMessage, 'success');
                        },
                        () => {
                            updateFormMessage(messages.errorMessageTrack, 'error');
                        },
                    );
                },
                () => {
                    updateFormMessage(messages.errorMessageIdentify, 'error');
                },
                false,
            );
        } else {
            const newErrorMessage = document.createElement('div');
            newErrorMessage.classList.add('error-message');
            newErrorMessage.textContent = !emailValue ? 'This Is A Required Field.' : 'Please Enter A Valid Email Address (Ex: johndoe@domain.com).';
            email.insertAdjacentElement('afterend', newErrorMessage);
        }
    });
}

export function appendCookieSettingsButton(element, buttonText) {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    listItem.append(button);
    const targetList = element.querySelector('div.list > ul.site-menu-footer > li:last-of-type ul');
    setAttributes(button, {
        id: 'ot-sdk-btn',
        class: 'ot-sdk-show-settings',
    });
    button.textContent = buttonText;
    targetList.append(listItem);
}

// Accessibility Menu Button
export function appendAccessibilityMenuButton(element) {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    listItem.append(button);
    const targetList = element.querySelector('div.list > ul.site-menu-footer > li:last-of-type ul');
    setAttributes(button, {
        id: 'accessibilityWidget',
    });
    button.textContent = 'Open Accessibility Menu';
    targetList.append(listItem);
}

// Accessbility Menu Button Trigger
export function triggerAccessibilityMenu() {
    document.getElementById('accessibilityWidget').addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior

        if (typeof window.UserWay !== 'undefined' && window.UserWay) {
            window.UserWay.widgetOpen();
        }
    });
}

export function createMenuAccordion(footer) {
    const siteMenus = footer.querySelectorAll('.site-menu-footer');
    siteMenus.forEach((menu) => {
        const menuListItems = menu.querySelectorAll(':scope > li');
        // iterate the nodelist of li elements
        menuListItems.forEach((item) => {
            item.classList.add('footer-accordion');
            // wrap the first link in a wrapper span
            const itemTitle = item.childNodes[0].textContent.trim();
            const footerAccordionLinkWrapper = document.createElement('span');
            footerAccordionLinkWrapper.classList.add('footer-accordion-link-wrapper', 'footer-accordion-link-wrapper-footer');
            footerAccordionLinkWrapper.append(itemTitle);
            // remove the first text inside the li
            if (item.childNodes[0].tagName !== 'A') {
                item.childNodes[0].remove();
                item.prepend(footerAccordionLinkWrapper);
            } else {
                item.classList.add('hide-desktop');
            }
            const footerAccordionContentWrapper = document.createElement('div');
            footerAccordionContentWrapper.classList.add('footer-accordion-content-wrapper', 'footer-accordion-content-wrapper-footer');
            const footerAccordionContentInnerWrapper = document.createElement('div');
            footerAccordionContentInnerWrapper.classList.add('footer-accordion-content-inner-wrapper');
            footerAccordionContentWrapper.append(footerAccordionContentInnerWrapper);

            // if there is accordion content, create a button to exand/collapse
            const accordionContent = item.querySelector(':scope > ul');
            if (accordionContent) {
                accordionContent.classList.add('footer-accordion-content');
                const accordionButton = document.createElement('button');
                accordionButton.classList.add('footer-accordion-button');
                accordionButton.innerHTML = '<span class="footer-accordion-button-icon">+</span>';
                footerAccordionLinkWrapper.append(accordionButton);

                // attach the event handler for the new button
                footerAccordionLinkWrapper.addEventListener('click', () => {
                    if (!isDesktop()) {
                        if (footerAccordionContentWrapper.style.height) {
                            footerAccordionContentWrapper.style.height = null;
                            footerAccordionContentWrapper.setAttribute('aria-hidden', true);
                            footerAccordionContentWrapper.classList.remove('active');
                            footerAccordionLinkWrapper.classList.remove('active');
                            footerAccordionLinkWrapper.querySelector('.footer-accordion-button-icon').textContent = '+';
                        } else {
                            footerAccordionContentWrapper.setAttribute('aria-hidden', false);
                            footerAccordionContentWrapper.classList.add('active');
                            footerAccordionLinkWrapper.classList.add('active');
                            footerAccordionContentWrapper.style.height = `${accordionContent.scrollHeight + 40}px`;
                            footerAccordionLinkWrapper.querySelector('.footer-accordion-button-icon').textContent = '-';
                        }
                    }
                });

                // wrap the accordion content in footerAccordionContentWrapper
                item.insertBefore(footerAccordionContentWrapper, accordionContent);
                footerAccordionContentInnerWrapper.append(accordionContent);
            }
        });
    });
}