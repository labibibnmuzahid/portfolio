import {
    getMetadata,
    fetchPlaceholders
} from '../../scripts/aem.js';
import {
    wrapImgsInLinks
} from '../../scripts/scripts.js';
import {
    getLocale
} from '../../scripts/configs.js';
import {
    loadFragment
} from '../fragment/fragment.js';
import {
    appendCookieSettingsButton,
    createMenuAccordion,
    generateLanguageDropdown,
    insertFormAfterDescription,
    validateForm,
    appendAccessibilityMenuButton,
    triggerAccessibilityMenu,
} from './footer-utils.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */

export default async function decorate(block) {
    const footerMeta = getMetadata('footer');
    block.textContent = '';

    // load footer fragment
    const {
        baseUri
    } = getLocale();
    const footerPath = footerMeta ? new URL(footerMeta).pathname : `${baseUri}/footer`;
    const fragment = await loadFragment(footerPath);
    // decorate footer DOM
    const footer = document.createElement('div');
    // insert dropdown before logo
    if (fragment.lastElementChild) {
        // insert dropdown before logo
        const frag = fragment.lastElementChild;
        const defaultContentWrapper = frag.querySelector(
            '.default-content-wrapper',
        );

        const {
            toggleSpan,
            locationsDropdown
        } = generateLanguageDropdown();

        // Append the outer div to defaultContentWrapper as the first child
        defaultContentWrapper.prepend(locationsDropdown);

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
    }
    while (fragment.firstElementChild) {
        const frag = fragment.firstElementChild;
        const defaultContentWrapper = frag.querySelector(
            '.default-content-wrapper',
        );
        const immediateUlElements = defaultContentWrapper.querySelectorAll(
            '.default-content-wrapper > ul',
        );

        if (immediateUlElements.length > 0) {
            // Create div with class of "list"
            const newListDiv = document.createElement('div');
            newListDiv.classList.add('list');

            immediateUlElements.forEach((ul) => {
                const clonedUl = ul.cloneNode(true);
                // add site-menu-footer class to the cloned ul
                clonedUl.classList.add('site-menu-footer');
                newListDiv.appendChild(clonedUl);
                ul.parentNode.removeChild(ul);
            });

            // Create div with class of "column"
            const newColumnDiv = document.createElement('div');
            newColumnDiv.classList.add('column');

            const immediatePElements = defaultContentWrapper.querySelectorAll(
                '.default-content-wrapper > p',
            );
            immediatePElements.forEach((p, index) => {
                const clonedP = p.cloneNode(true);
                newColumnDiv.appendChild(clonedP);
                insertFormAfterDescription(index, newColumnDiv);
                p.parentNode.removeChild(p);
            });
            wrapImgsInLinks(newColumnDiv);
            validateForm(newColumnDiv);
            createMenuAccordion(newListDiv);
            defaultContentWrapper.appendChild(newColumnDiv);
            defaultContentWrapper.appendChild(newListDiv);
        }
        frag.classList.add('footer-section');
        footer.append(frag);
    }
    appendAccessibilityMenuButton(footer);

    const placeholders = await fetchPlaceholders();
    const {
        cookieSettingsButtonText
    } = placeholders;
    appendCookieSettingsButton(footer, cookieSettingsButtonText);
    block.append(footer);
    triggerAccessibilityMenu();
}