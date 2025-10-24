import {
    setAttributes,
    isDesktop,
    getCookie,
} from '../../scripts/utils.js';
import {
    loadFragment
} from '../fragment/fragment.js';
import {
    getLocale,
    getConfigValue,
    getHref,
    getCountries,
} from '../../scripts/configs.js';
import loadFromBloomreach from '../../scripts/br.js';

/**
 * creates the tab buttons from <p> elements in the nav
 * and adds them to a new tabsList element
 * @param {HTMLElement} nav
 * @param {[]} paragraphs
 */

const {
    baseUri,
    language,
    countryFlag,
    isDefaultLocale,
} = getLocale();

const countries = JSON.parse(sessionStorage.getItem('countries')) || await getCountries();

export function createTabsList(nav, paragraphs) {
    // create tabList element and place in DOM
    const tabsList = document.createElement('div');
    tabsList.classList.add('nav-tabs-list');
    tabsList.setAttribute('role', 'tablist');
    nav.querySelector(':scope > div:nth-child(2) > div').prepend(tabsList);

    // loop through the found <p> tags and convert them to <button> tags
    // and append each button to the tabsList
    paragraphs.forEach((paragraph, index) => {
        const tabName = paragraph.textContent.toLocaleLowerCase();
        const button = document.createElement('button');
        button.innerHTML = paragraph.textContent;
        button.classList.add('nav-tabs-tab');
        setAttributes(button, {
            id: `tab-${tabName}`,
            'aria-controls': `tabpanel-${tabName}`,
            'aria-selected': `${index === 0}`, // set to "true" if first tab
            role: 'tab',
        });
        tabsList.append(button);

        // remove the unneeded paragraph tag
        paragraph.remove();
    });
}

function renderMobileCountrySelector(panel) {
    // using map get the countries array and create the list items
    const listItems = countries.map((country) => {
        const listItem = document.createElement('li');
        // insert flag
        const flag = document.createElement('div');
        flag.classList.add('flag', country.flag);
        listItem.append(flag);
        // insert link
        const link = document.createElement('a');
        link.href = country.href;
        link.textContent = country.name;
        // improve accesibility
        link.setAttribute('aria-label', country.name);
        // add the param value to the a element
        link.dataset.param = country.param;
        listItem.append(link);
        return listItem;
    });

    listItems.forEach((element) => {
        const link = element.querySelector('a');
        const isSameLanguage = link.getAttribute('data-param') === `${language}`;
        if (isSameLanguage) {
            const span = document.createElement('span');
            span.textContent = link.textContent;
            // Get the parent of the link node
            const linkParent = link.parentNode;
            linkParent.replaceChild(span, link);
        }
    });
    // append the list items to the country tab
    panel.append(...listItems);
}

/**
 * identifies the tab panels from <p> elements in the nav
 * and adds attributes to the <ul> elements
 * @param {HTMLElement} nav
 * @param {[]} paragraphs
 */

export function createTabPanels(nav, paragraphs) {
    const panels = [...nav.querySelectorAll(':scope > div:nth-child(2) > div > ul')];

    // the first panel needs a special class to identify it
    // as the main navigation site menu
    panels[0].classList.add('site-menu');

    panels.forEach((panel, index) => {
        const panelName = paragraphs[index] ? .textContent ? .toLocaleLowerCase();
        panel.classList.add('nav-tabs-panel');
        setAttributes(panel, {
            id: `tabpanel-${panelName}`,
            'aria-labelledby': `tab-${panelName}`,
            role: 'tabpanel',
            'aria-hidden': `${index !== 0}`, // set to "true" if not first tab
        });

        if (index === 2) {
            renderMobileCountrySelector(panel);
        }
    });
}

/**
 * attaches all event handlers needed for the tabs
 * @param {HTMLElement} nav
 */

export function attachTabEventHandlers(nav) {
    const tabButtons = nav.querySelectorAll('.nav-tabs-list button');
    const panels = nav.querySelectorAll('.nav-tabs-panel');

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            panels.forEach((panel) => {
                panel.setAttribute('aria-hidden', true);
            });
            tabButtons.forEach((btn) => {
                btn.setAttribute('aria-selected', false);
            });
            button.setAttribute('aria-selected', true);
            nav.querySelector(`#${button.getAttribute('aria-controls')}`).setAttribute('aria-hidden', false);
        });
    });
}

/**
 * render the menu contents as accordions
 * @param {HTMLElement} nav
 */

export async function createMenuAccordion(nav) {
    const siteMenu = nav.querySelector('.site-menu');

    function showMenuContentOnDesktop(accordionContent) {
        if (isDesktop()) {
            accordionContent.setAttribute('aria-hidden', false);
            accordionContent.classList.add('active');
        }
    }

    function hideMenuContentOnDesktop(accordionContent) {
        if (isDesktop()) {
            accordionContent.setAttribute('aria-hidden', true);
            accordionContent.classList.remove('active');
        }
    }

    async function loadCollections(menu) {
        const collectionsFragment = document.createElement('div');
        const accordionContent = menu.querySelector('.nav-accordion-content-with-fragment');
        const fragmentPath = accordionContent.querySelector(':scope > li > a').getAttribute('href');
        collectionsFragment.append(await loadFragment(fragmentPath));
        accordionContent.append(collectionsFragment.querySelector(':scope main > div'));
        accordionContent.querySelector(':scope > li').remove();
    }

    siteMenu.querySelectorAll(':scope > li').forEach((item, index) => {
        item.classList.add('nav-accordion');

        // wrap the first link in a wrapper span
        const link = item.querySelector(':scope > a');
        const navAccordionLinkWrapper = document.createElement('span');
        navAccordionLinkWrapper.classList.add('nav-accordion-link-wrapper');
        navAccordionLinkWrapper.append(link);
        item.prepend(navAccordionLinkWrapper);
        const navAccordionContentWrapper = document.createElement('div');
        navAccordionContentWrapper.classList.add('nav-accordion-content-wrapper');
        const navAccordionContentInnerWrapper = document.createElement('div');
        navAccordionContentInnerWrapper.classList.add('nav-accordion-content-inner-wrapper');
        navAccordionContentWrapper.append(navAccordionContentInnerWrapper);

        // if there is accordion content, create a button to exand/collapse
        const accordionContent = item.querySelector(':scope > ul');
        if (accordionContent) {
            accordionContent.classList.add('nav-accordion-content');

            // add class to Collections content
            if (accordionContent.querySelector(':scope > li > a') ? .textContent === '%fragment') {
                accordionContent.classList.add('nav-accordion-content-with-fragment');
            }

            const accordionButton = document.createElement('button');
            accordionButton.classList.add('nav-accordion-button');
            accordionButton.innerHTML = '<span class="visually-hidden">Toggle It</span>';
            navAccordionLinkWrapper.append(accordionButton);

            // attach the event handler for the new button
            accordionButton.addEventListener('click', () => {
                if (navAccordionContentWrapper.style.height) {
                    navAccordionContentWrapper.style.height = null;
                    navAccordionContentWrapper.setAttribute('aria-hidden', true);
                    navAccordionContentWrapper.classList.remove('active');
                    accordionButton.classList.remove('active');
                } else {
                    navAccordionContentWrapper.setAttribute('aria-hidden', false);
                    navAccordionContentWrapper.classList.add('active');
                    navAccordionContentWrapper.style.height = `${accordionContent.offsetHeight + 40}px`;
                    accordionButton.classList.add('active');
                }
            });

            // 'hover' behaviors on desktop
            let hoverDelayPassed = false;

            setTimeout(() => {
                hoverDelayPassed = true;
            }, 1000);

            item.addEventListener('mouseenter', () => {
                if (hoverDelayPassed) {
                    showMenuContentOnDesktop(navAccordionContentWrapper);
                }
            });

            item.addEventListener('mouseleave', () => {
                hideMenuContentOnDesktop(navAccordionContentWrapper);
            });

            // wrap the accordion content in navAccordionContentWrapper
            item.insertBefore(navAccordionContentWrapper, accordionContent);
            navAccordionContentInnerWrapper.append(accordionContent);

            const picture = accordionContent.querySelector(':scope > li > picture');

            // add the navFeature element to the navAccordionContentWrapper
            // if needed
            const navFeature = document.createElement('div');
            navFeature.classList.add('nav-feature');
            if (picture && !accordionContent.classList.contains('nav-accordion-content-with-fragment')) {
                navAccordionContentInnerWrapper.append(navFeature);
                navFeature.append(picture);
                accordionContent.classList.add('nav-accordion-content-with-feature');
            }

            // last accordion content is Sale
            if (index === siteMenu.querySelectorAll(':scope > li').length - 1 && isDefaultLocale) {
                accordionContent.classList.add('nav-accordion-content-sale');
            }
        }
    });

    // place copies of the showroom and contacts links below mobile menu
    const menuLinks = nav.querySelectorAll('.nav-header-content > ul > li');
    const mobileMenuBottomLinks = document.createElement('ul');
    mobileMenuBottomLinks.id = 'mobile-menu-botom-links';
    mobileMenuBottomLinks.append(menuLinks[1].cloneNode(true));
    mobileMenuBottomLinks.append(menuLinks[2].cloneNode(true));
    siteMenu.append(mobileMenuBottomLinks);

    await loadCollections(siteMenu);
}

/**
 * Function to display search results.
 */
function displaySearchResults(results) {
    const searchResultsElement = document.getElementById('list_results');
    searchResultsElement.innerHTML = '';
    if (results.length > 0) {
        results.forEach((result) => {
            const resultElement = document.createElement('li');
            resultElement.innerHTML = `
      <a href="${baseUri}/search?q=${result.query}" class="blm-autosuggest__suggestion-term-link" data-suggestion-text="lamp" data-uw-rm-brl="PR" data-uw-original-href="${baseUri}/search?q=${result.query}">
        <span class="blm-autosuggest__suggestion-term-link--typed-query">
          ${result.displayText}
        </span>
      </a>
    `;
            searchResultsElement.appendChild(resultElement);
        });
        searchResultsElement.classList.add('active');
    } else {
        searchResultsElement.classList.remove('active');
    }
}

/**
 * Fetch search results based on the input in the search bar.
 */
async function fetchSearchData(query) {
    const refUrl = await getHref();
    const bloomreachUserCookie = await getCookie('_br_uid_2');
    const domainKey = await getConfigValue('bloomreach-domain-key');
    const accountId = await getConfigValue('bloomreach-account-id');
    const requestType = 'suggest';
    const catalogViews = 'circalighting';
    const searchType = 'keyword';
    const baseUrl = `https://suggest.dxpapi.com/api/v2/suggest/?account_id=${accountId}&domain_key=${domainKey}&_br_uid_2=${bloomreachUserCookie}&ref_url=${refUrl}&url=${refUrl}&request_type=${requestType}&catalog_views=${catalogViews}&search_type=${searchType}`;
    const url = new URL(baseUrl);
    url.searchParams.append('q', query);
    const data = await fetch(url)
        .then((res) => {
            if (!res.ok) {
                throw new Error('Failed to fetch data');
            }
            return res.json();
        })
        .catch((err) => {
            if (err instanceof Error) {
                throw err;
            }
        });
    const results = data.suggestionGroups[0] ? .querySuggestions;
    if (results) {
        // get the first 5 results
        const resultsSlice = results.slice(0, 5);
        displaySearchResults(resultsSlice);
    }
    return [];
}

/**
 * handle search bar events
 * @param {HTMLElement} searchButton
 * @param {HTMLElement} searchBar
 */

function handleSearchBarEvents(searchButton, searchBar) {
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            if (!isDesktop()) {
                searchBar.classList.toggle('active');
                // if the search bar is active, focus on the input
                if (searchBar.classList.contains('active')) {
                    searchBar.querySelector('input').focus();
                }
            }
        });
    }

    // close the search bar when click outside of it
    document.addEventListener('click', (event) => {
        if (!searchBar.contains(event.target) && event.target !== searchButton && searchBar.classList.contains('active')) {
            searchBar.classList.remove('active');
            const searchResultsElement = document.getElementById('list_results');
            searchResultsElement.innerHTML = '';
            searchResultsElement.classList.remove('active');
        }
    });

    // check if the focus is on main element
    document.addEventListener('focusin', (event) => {
        if (!searchBar.contains(event.target) && event.target !== searchButton) {
            searchBar.classList.remove('active');
            const searchResultsElement = document.getElementById('list_results');
            searchResultsElement.innerHTML = '';
            searchResultsElement.classList.remove('active');
        }
    });

    // close the search bar when the close button is clicked
    const closeSearchButton = searchBar.querySelector('.nav-search-close');
    const searchInput = searchBar.querySelector('#searchbar');
    closeSearchButton.addEventListener('click', () => {
        searchBar.classList.remove('active');
        // clear the search input
        if (searchInput) {
            searchInput.value = '';
        }
        // clear the search results
        const searchResultsElement = document.getElementById('list_results');
        searchResultsElement.innerHTML = '';
        searchResultsElement.classList.remove('active');
    });

    searchInput.addEventListener('keyup', (event) => {
        const query = event.target.value.trim();
        const searchResultsElement = document.getElementById('list_results');
        // Check if the input has more than one character
        if (query.length > 1) {
            fetchSearchData(query);
        } else {
            // Clear search results if input is empty or has only one character
            searchResultsElement.innerHTML = '';
            searchResultsElement.classList.remove('active');
        }
    });

    // submit event for the search form
    const formSelector = searchBar.querySelector('form');
    formSelector.addEventListener('submit', async (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query.length > 1) {
            const apiPayload = {
                loading: true,
                pages: 1,
                currentPage: 1,
                basePageSize: 48,
                currentPageSize: 48,
                type: 'search',
                category: {
                    name: 'Search Results',
                    id: null,
                    urlPath: null,
                },
                sort: 'relevance desc',
                products: {
                    items: [],
                    total: 0,
                },
                filters: {},
                facets: [],
                searchTerm: query,
            };
            const res = await loadFromBloomreach(apiPayload);

            if (!res.isRedirect) {
                window.location.href = `${baseUri}/search?q=${query}`;
            }
        }
    });
}

/**
 * create the searchbar and attach event handlers
 * @param {HTMLElement} nav
 */

export function createSearchBar(nav) {
    // wrap the image in a button
    let searchButton;
    const searchImage = nav.querySelector('.nav-header-content > ul > li > span.icon-search > img');
    // create clone of search image and add to the span.icon-search
    const searchImageClone = searchImage.cloneNode(true);
    // add the searchImage to the span icon search
    nav.querySelector('.nav-header-content > ul > li > span.icon-search').appendChild(searchImageClone);
    const searchButtonWrapper = document.createElement('button');
    searchButtonWrapper.classList.add('search-button');
    searchButtonWrapper.setAttribute('aria-label', 'Open search bar');
    searchButtonWrapper.setAttribute('id', 'search_button');
    searchImage.parentNode.insertBefore(searchButtonWrapper, searchButton);
    searchButtonWrapper.appendChild(searchImage);
    searchButton = searchButtonWrapper;
    // move the button to .nav-header-content > ul > li when has the span icon search
    const iconSearch = nav.querySelector('.nav-header-content > ul > li > span.icon-search');
    if (iconSearch) {
        const parent = iconSearch.parentNode;
        parent.insertBefore(searchButton, iconSearch);
    }

    const searchBar = document.createElement('div');
    searchBar.classList.add('nav-search-bar');

    // create a form element and append it to the nav
    const form = document.createElement('form');
    form.setAttribute('action', '/search');
    form.setAttribute('method', 'get');
    form.setAttribute('role', 'search');
    form.innerHTML = `
    <input type="text" placeholder="Search" id="searchbar" value="">
    <button type="button" class="nav-search-close">
      <span class="visually-hidden">Close search bar</span>
    </button>
  `;
    searchBar.append(form);

    // create a div to hold the search results
    const searchResults = document.createElement('div');
    searchResults.id = 'search_results';
    searchResults.classList.add('search-results');
    searchResults.innerHTML = `
    <div id="search_autocomplete" class="search-autocomplete">
      <ul role="listbox" id="list_results" class="search-list-results">
      </ul>
    </div>`;
    searchBar.append(searchResults);
    nav.querySelector('.nav-header-content > ul > li > span.icon-search').append(searchBar);
    const searchBarWrapper = nav.querySelector('.nav-header-content > ul > li > span.icon-search');
    // attach event handlers
    handleSearchBarEvents(searchButton, searchBarWrapper);
}

export function generateLanguageDropdown() {
    // Create the outer div
    const locationsDropdown = document.createElement('div');
    locationsDropdown.classList.add('locations-dropdown', 'footer', 'header');

    // Create the span
    const toggleSpan = document.createElement('span');
    toggleSpan.dataset.toggle = 'dropdown';
    toggleSpan.setAttribute('aria-haspopup', 'true');
    toggleSpan.setAttribute('aria-expanded', 'false');
    toggleSpan.setAttribute('id', 'dropdownMenuButton');
    toggleSpan.setAttribute('role', 'button');
    toggleSpan.setAttribute('tabindex', '0');
    toggleSpan.classList.add('action', 'toggle', 'flag', countryFlag);
    toggleSpan.setAttribute('aria-label', 'Select a country');

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