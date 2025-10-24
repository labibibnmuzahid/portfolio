const parsedUrl = new URL(window.location.href);

/**
 * sets multiple attributes on an element
 * @param {HTMLElement} el
 * @param {object} attrs
 */

/* eslint-disable import/prefer-default-export */
export function setAttributes(el, attrs) {
    Object.keys(attrs).forEach((key) => {
        el.setAttribute(key, attrs[key]);
    });
}

/**
 * determine form factor
 * @returns {Boolean}
 */

// media query match that indicates mobile/tablet width
export function isDesktop() {
    return window.matchMedia('(min-width: 1280px)').matches;
}

// get the language selected from the URL
export function getSelectedLanguage(url) {
    // Create a new URL object if url is provided, otherwise use window.location
    const targetUrl = url ? new URL(url) : window.location;
    const path = targetUrl.pathname;
    const pathParts = path.split('/');
    const validLanguages = ['uk', 'eu'];
    const languageFromPath = pathParts[1];

    // If the language from the path is a valid language, return it
    if (languageFromPath && validLanguages.includes(languageFromPath)) {
        return languageFromPath;
    }

    return 'us';
}

export function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function createHTMLElement(tag, attributes = {}, content = '') {
    // Create the element
    const element = document.createElement(tag);

    // Set the text content
    if (content) {
        element.textContent = content;
    }

    // Set the attributes
    // eslint-disable-next-line no-restricted-syntax
    for (const key in attributes) {
        // eslint-disable-next-line no-prototype-builtins
        if (attributes.hasOwnProperty(key)) {
            element.setAttribute(key, attributes[key]);
        }
    }

    return element;
}

export const cE = createHTMLElement;

// eslint-disable-next-line consistent-return
export function formatHours(hours) {
    // Split the hours string into start and end times
    if (hours.includes('-') || hours.includes('Appointment')) {
        if (hours === 'By Appointment') {
            return 'By Appointment';
        }
        const [start, end] = hours.split('-');

        // Convert the start and end times to 12-hour format
        const formatTime = (time, isStart, isAfternoon) => {
            const [hour, minute] = time.trim().split(':').map(Number);
            const suffix = (isStart && isAfternoon) || (!isStart && hour < 12) ? 'pm' : 'am';
            const formattedHour = hour % 12 || 12; // Convert 0 to 12
            // Only show minutes if they are not 00
            if (minute === 0) {
                return `${formattedHour} ${suffix}`;
            }
            return `${formattedHour}:${minute < 10 ? `0${minute}` : minute} ${suffix}`;
        };

        // Determine if the end time is in the afternoon
        const endHour = parseInt(end.trim().split(':')[0], 10);
        const isAfternoon = !(endHour < 12);

        // Handle cases for start and end times
        const startTime = start.includes(':') ? start : `${start.trim()}:00`;
        const endTime = end.includes(':') ? end : `${end.trim()}:00`;

        const formattedStart = formatTime(startTime, true, isAfternoon);
        const formattedEnd = formatTime(endTime, false, isAfternoon);

        return `${formattedStart} to ${formattedEnd}`;
    }
    return '';
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in miles

    return distance.toFixed(2); // Return distance rounded to two decimal places
}

export function findClosestLocations(lat, lng, locations) {
    const stores = locations;
    const radius = parsedUrl.searchParams.get('radius');
    const selectedRadius = parseFloat(radius);
    const distances = stores.map((store) => {
        const distance = getDistance(lat, lng, store.maps_latitude, store.maps_longitude);
        store.distance = distance;
        return store;
    });

    const nearbyStores = distances.filter((store) => store.distance <= selectedRadius && store.controller === 'onsite');

    // Sort by distance
    return nearbyStores.sort((a, b) => a.distance - b.distance);
}

export function getSearchParams() {
    const q = parsedUrl.searchParams.get('q');
    const radius = parsedUrl.searchParams.get('radius');
    const lat = parsedUrl.searchParams.get('lat');
    const lng = parsedUrl.searchParams.get('lng');

    if (lat && lng) {
        return {
            address: q,
            radius,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
        };
    }
    return null; // Handle the case where lat/lng are not present
}

export function generateSlug(str) {
    return str
        .toLowerCase() // Convert to lowercase
        .trim() // Remove leading and trailing whitespace
        .replace(/[\s,]+/g, '-') // Replace spaces and commas with hyphens
        // eslint-disable-next-line no-useless-escape
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters except hyphens
        // eslint-disable-next-line no-useless-escape
        .replace(/\-\-+/g, '-') // Replace multiple hyphens with a single hyphen
        .replace(/^-+|-+$/g, ''); // Remove hyphens from the start and end
}

export function transformTel(str) {
    // eslint-disable-next-line no-param-reassign
    return str.replace(/\./g, '');
}

export function getCookie(key) {
    return document.cookie
        .split(';')
        .map((c) => c.trim())
        .filter((cookie) => cookie.startsWith(`${key}=`))
        .map((cookie) => decodeURIComponent(cookie.split('=')[1]))[0] || null;
}

export function setCookie(key, value) {
    const minutesToTimeout = 25;
    document.cookie = `${key} = ${value || ' '}; expires=${new Date(
    new Date().getTime() + minutesToTimeout * 60000,
  ).toUTCString()}; path=/`;
}

export function getCustomHeightFilterValue() {
    const productHeightOption = window ? .product ? .customOptions ? .find((option) => option.id === 'height_filter');
    if (productHeightOption) {
        const height = productHeightOption.selectedValue;
        return height ? [height] : [];
    }
    return [];
}

export function criteriaSort(a, b) {
    if (a.includes('criteria') && b.includes('criteria')) {
        let firstCriteria = a.split('_')[1];
        let secondCriteria = b.split('_')[1];
        firstCriteria = parseInt(firstCriteria, 10);
        secondCriteria = parseInt(secondCriteria, 10);
        return firstCriteria - secondCriteria;
    }
    return a.localeCompare(b);
}

export function gallerySourceCheck() {
    const images = document.querySelectorAll('.pdp-carousel img');
    images.forEach((image) => {
        if (image.src.includes('images.visualcomfort.com')) {
            image.srcset = `${image.src}?$product_variation_item$ 768w,
        ${image.src}?$mini_cart_product_thumbnail$ 1024w,
        ${image.src}?$product_page_image_medium$ 1366w,
        ${image.src}?$product_page_image_medium$ 1920w`;
        }
    });
}