import {
    generateLanguageDropdown,
} from '../footer/footer-utils.js';
import {
    getLocale,
    getCountries
} from '../../scripts/configs.js';

/**
 * loads and decorates the Geo Popup
 * @param {Element} block The footer block element
 */

const {
    countryName,
    countryFlag,
    countryCode
} = getLocale();
const countries = JSON.parse(sessionStorage.getItem('countries')) || await getCountries();

export default async function decorate(block) {
    const {
        toggleSpan,
        locationsDropdown
    } = generateLanguageDropdown();

    // Create modal container
    const modal = document.createElement('div');
    modal.classList.add('popup-modal');

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');

    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Change Location';

    const closeButton = document.createElement('span');
    closeButton.classList.add('close');
    closeButton.textContent = '×';

    modalHeader.appendChild(headerTitle);
    modalHeader.appendChild(closeButton);

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');

    const bodyText = document.createElement('p');
    bodyText.textContent = 'We remind you that the assortment, services, and prices may change according to the selected country. Any products in the cart will be removed.';

    modalBody.appendChild(bodyText);
    modalBody.appendChild(locationsDropdown);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);

    modal.appendChild(modalContent);

    function getCountryCodeFromIP() {
        const ukCodes = ['GB'];
        const euCodes = ['BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'GR', 'ES', 'FR', 'IT', 'CY', 'LV', 'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE', 'HR', 'LI', 'NO', 'IS'];
        const locationData = window.otStubData || {};
        let currentCountry = locationData.userLocation ? .country || 'US';

        // parse currentCountry
        if (ukCodes.indexOf(currentCountry) !== -1) currentCountry = 'UK';
        if (euCodes.indexOf(currentCountry) !== -1) currentCountry = 'EU';

        return currentCountry.toLowerCase();
    }

    function setSessionCookie(name, value) {
        document.cookie = `${name}=${value};path=/`;
    }

    function getSessionCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return '';
    }

    function updateDropdownSelection() {
        // Update the dropdown
        const actionElement = locationsDropdown.querySelector('.action.toggle');
        if (actionElement) {
            actionElement.classList.add(countryFlag);
            actionElement.textContent = countryName;
        }
        // // Clear existing dropdown items
        const dropdownUl = locationsDropdown.querySelector('.popup-modal .locations-dropdown .dropdown');
        if (dropdownUl) {
            dropdownUl.innerHTML = '';
        }
        // Add new dropdown items
        countries.forEach((country) => {
            const li = document.createElement('li');
            if (country.param !== countryCode) {
                // Create the anchor tag for non-selected countries
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
                // Create list item for the selected country
                const flagDiv = document.createElement('div');
                flagDiv.classList.add('flag', countryFlag);
                const span = document.createElement('span');
                span.textContent = countryName;
                li.append(flagDiv, span);
                li.classList.add('selected');
            }
            dropdownUl.append(li);
        });
    }

    function showGeoLocationModal() {
        const countryCodeFromIP = getCountryCodeFromIP();
        if (countryCodeFromIP !== countryCode) {
            block.appendChild(modal);
            updateDropdownSelection(countryCode);
            setSessionCookie('geoModalShown', 'true');
        }
    }

    function checkForGeoData() {
        const checkInterval = 1000; // Interval in milliseconds
        const maxAttempts = 10; // Maximum number of checks
        let attempts = 0;
        const intervalId = setInterval(() => {
            if (window.otStubData) {
                clearInterval(intervalId); // Stop checking once data is available
                if (!getSessionCookie('geoModalShown')) {
                    showGeoLocationModal(); // Show the modal only if not shown before
                }
            } else {
                attempts += 1; // Increment attempts in an explicit way
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId); // Stop checking after max attempts
                }
            }
        }, checkInterval);
    }

    checkForGeoData();

    // Event listeners
    const closeModalBtn = modal.querySelector('.close');
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

    const hideModal = () => {
        const popupModal = document.querySelector('.popup-modal');
        if (popupModal) {
            popupModal.style.display = 'none';
        }
    };

    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) hideModal();
    });
}