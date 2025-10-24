import {
    getConfigValue
} from '../../scripts/configs.js';
import {
    readBlockConfig
} from '../../scripts/aem.js';

const ICONS = {
    instagram: `
    <svg  xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" fill="currentColor"/></svg>
  `,
    prev: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="m16.67 0 2.83 2.829-9.339 9.175 9.339 9.167L16.67 24 4.5 12.004z" fill="currentColor"/></svg>
  `,
    next: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M7.33 24 4.5 21.171l9.339-9.175L4.5 2.829 7.33 0 19.5 11.996z" fill="currentColor"/></svg>
  `,
    close: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="m23.954 21.03-9.184-9.095 9.092-9.174L21.03-.046l-9.09 9.179L2.764.045l-2.81 2.81L9.14 11.96.045 21.144l2.81 2.81 9.112-9.192 9.18 9.1z" fill="currentColor"/></svg>
  `,
    check: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z" fill="currentColor"/></svg>
  `,
    error: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M16.971 0h-9.942l-7.029 7.029v9.941l7.029 7.03h9.941l7.03-7.029v-9.942l-7.029-7.029zm-1.402 16.945l-3.554-3.521-3.518 3.568-1.418-1.418 3.507-3.566-3.586-3.472 1.418-1.417 3.581 3.458 3.539-3.583 1.431 1.431-3.535 3.568 3.566 3.522-1.431 1.43z" fill="currentColor"/></svg>
  `,
    exclamation: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.351 6.493c-.08-.801.55-1.493 1.351-1.493s1.431.692 1.351 1.493l-.801 8.01c-.029.282-.266.497-.55.497s-.521-.215-.55-.498l-.801-8.009zm1.351 12.757c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" fill="currentColor"/></svg>
  `,
};

const BASE_URL = 'https://photorankapi-a.akamaihd.net';
const VERSION = 'v2.2';
let COUNT = 6;
let MEDIA_ORDER = 'shuffled';

// eslint-disable-next-line consistent-return
export default async function decorate(block) {
    const socialNativeApiKeyConfig = await getConfigValue('olapic-api-key');
    const blockOrigin = block.getAttribute('data-block-origin');
    const config = readBlockConfig(block);
    let socialNativeStreamId = '';
    let socialNativeTemplateDir = '';
    if (!config || !config['stream-tag']) {
        // eslint-disable-next-line no-console
        console.warn('Invalid config for stream tag');
        return null;
    }
    async function fetchData() {
        if (document.querySelector('.social-native-gallery-grid')) {
            return null;
        }
        if (blockOrigin === 'pdp') {
            COUNT = 25;
            MEDIA_ORDER = 'recent';
        }

        const socialNativeUrl = new URL(BASE_URL);
        block.dataset.streamTag = config['stream-tag'];
        socialNativeUrl.pathname = `/streams/bytag/${block.dataset.streamTag}`;
        socialNativeUrl.searchParams.append('version', VERSION);
        socialNativeUrl.searchParams.append('auth_token', socialNativeApiKeyConfig);
        try {
            const socialNativeResponse = await fetch(socialNativeUrl);
            if (!socialNativeResponse.ok) {
                return null;
            }
            const {
                data: socialNativeData
            } = await socialNativeResponse.json();
            if (!socialNativeData || !socialNativeData.id) {
                return null;
            }
            socialNativeStreamId = socialNativeData.id;
            socialNativeTemplateDir = socialNativeData._embedded.customer.template_dir;
            const mediaUrl = new URL(BASE_URL);
            mediaUrl.pathname = `/streams/${socialNativeData.id}/media/${MEDIA_ORDER}`;
            mediaUrl.searchParams.append('version', VERSION);
            mediaUrl.searchParams.append('auth_token', socialNativeApiKeyConfig);
            mediaUrl.searchParams.append('count', COUNT);

            try {
                const mediaResponse = await fetch(mediaUrl);
                if (!mediaResponse.ok) {
                    return null;
                }
                const {
                    data: mediaData
                } = await mediaResponse.json();
                return mediaData; // Return the fetched media data
            } catch (error) {
                return null; // Return null if there's an issue fetching media data
            }
        } catch (error) {
            return null; // Return null if there's an issue fetching socialNative data
        }
    }
    const data = await fetchData();
    // Check if data is null or invalid
    if ((blockOrigin !== 'pdp') && (!data || !data._embedded || !data._embedded.media || !data._embedded.media.length)) {
        const galleryBlock = document.querySelector('.social-native-gallery-container');
        galleryBlock.remove();
        // eslint-disable-next-line consistent-return
        return;
    }

    const media = data ? ._embedded.media;

    // eslint-disable-next-line consistent-return
    if ((blockOrigin !== 'pdp') && (!data || !media || !media.length)) return;

    let selectedIndex = 0;
    const addImageUploader = media ? .length < 4 ||
        (!data || !data ? ._embedded || !data ? ._embedded.media || !data ? ._embedded.media.length);
    block.innerHTML = `
    <div class="social-native-gallery-grid">
      ${media ? media.map((item, index) => `<div class="social-native-gallery-grid-item">
          <button data-index="${index}" aria-label="Open ${item.caption} details">
            <picture>
              <source srcset="${item.images.normal}" type="image/jpeg" media="(min-width: 600px)" />
              <img src="${item.images.mobile}" alt="${item.caption}" loading="lazy" onerror="this.style.display='none';"/>
            </picture>
          </button>
          ${blockOrigin === 'pdp' ? `
            <div data-index="${index}" class="social-native-user-info">
              <span>@${item._embedded.uploader.username}</span>
            </div>` : ''}
        </div>`).join('') : ''}
        ${addImageUploader ? `
          <div class="social-native-gallery-grid-item social-native-image-upload" style="width: ${!media || media?.length === 0 ? '99%' : '360px'}">
              <div class="image-upload-content">
                <p class="image-upload-text"> Add your photo for a chance to be featured! </p>
                <div class="image-upload-btn">
                  <a aria-label="launch uploader frame"> + </a>
                </div>
              </div>
          </div>` : ''}
    </div>
  `;

    if (addImageUploader) {
        const imageUploadUrl = new URL('https://photorankstatics-a.akamaihd.net');
        imageUploadUrl.pathname = `/assets/${socialNativeTemplateDir}/uploader1v2.html`;
        const socialNativeResponse = await fetch(imageUploadUrl);
        const imageUploadHtml = await socialNativeResponse.text();

        // Create a container for the fetched HTML
        const container = document.createElement('div');
        container.innerHTML = imageUploadHtml;

        // Move scripts to correct location
        const scripts = container.querySelectorAll('script');
        scripts.forEach((script) => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            // eslint-disable-next-line max-len
            Array.from(script.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
            document.body.appendChild(newScript);
            script.remove();
        });

        // On click, load the iframe
        document.querySelector('.image-upload-btn a').addEventListener('click', (event) => {
            event.preventDefault();
            let olapic = document.querySelector('.olapic');
            if (olapic) {
                const olapicIframe = olapic.querySelector('iframe');
                const {
                    src
                } = olapicIframe;
                olapicIframe.src = '';
                olapicIframe.src = src;
                olapic.querySelector('.modal.fade').classList.add('olapic-chrome', 'in');
                olapic.querySelector('.modal-content').classList.add('active');
            } else {
                // Create the overlay container
                const modalContent = document.querySelector('[data-template-name="modal"]');
                olapic = document.createElement('div');
                olapic.classList.add('olapic');
                olapic.innerHTML = modalContent.innerHTML;
                olapic.querySelector('iframe').src = `https://photorank.me/uploader/${socialNativeTemplateDir}?lang=en_US&gallery=${socialNativeStreamId}`;
                olapic.querySelector('.olapic .modal').removeAttribute('id');
                olapic.querySelector('.olapic .modal').removeAttribute('aria-hidden');
                olapic.querySelector('.modal.fade').classList.add('olapic-chrome', 'in');
                olapic.querySelector('.modal-content').classList.add('active');

                // Listeners to close modal
                const closeButton = olapic.querySelector('.modal-header .close');
                closeButton.addEventListener('click', () => {
                    olapic.querySelector('.modal.fade').classList.remove('in');
                    olapic.querySelector('.modal-content').classList.remove('active');
                });
                const modalBackground = olapic.querySelector('.modal');
                modalBackground.addEventListener('click', () => {
                    olapic.querySelector('.modal.fade').classList.remove('in');
                    olapic.querySelector('.modal-content').classList.remove('active');
                });
                document.body.appendChild(olapic);
            }
        });
    }

    function triggerReRender(wrapper) {
        const grid = wrapper.querySelector('.social-native-gallery');
        wrapper.removeChild(grid);
        // eslint-disable-next-line no-void
        void wrapper.offsetWidth;
        wrapper.firstChild.insertAdjacentElement('afterend', grid);
    }

    function handleGalleryCarousel(event) {
        const direction = Array.from(event.target.classList).find((cls) => cls.includes('gallery-btn-')).replace('gallery-btn-', '');
        const galleryWrapper = event.target.closest('.social-native-gallery-wrapper');
        const gallery = galleryWrapper.querySelector('.social-native-gallery-grid');
        switch (direction) {
            case 'next':
                {
                    const firstChild = gallery.firstElementChild;
                    gallery.appendChild(firstChild);
                    break;
                }
            case 'prev':
                {
                    const lastChild = gallery.lastElementChild;
                    gallery.prepend(lastChild);
                    break;
                }
            default:
                break;
        }
        triggerReRender(galleryWrapper);
    }

    function handleResize() {
        const slotElement = document.querySelector('.pdp-product__gallery-content');
        const isDesktop = window.matchMedia('(min-width: 769px)').matches;
        if (isDesktop) {
            const desktopSlotParent = document.querySelector('.pdp-product__column-container.pdp-product__gallery-column');
            desktopSlotParent.appendChild(slotElement);
        } else {
            const mobileSlotNeighbor = document.querySelector('.pdp-product__column-container.pdp-product__content-column');
            mobileSlotNeighbor.insertAdjacentElement('afterend', slotElement);
        }
    }

    // Add social gallery buttons for PDP
    const galleryWrapper = block.closest('.social-native-gallery-wrapper');
    if (blockOrigin === 'pdp') {
        const prevButton = document.createElement('div');
        const nextButton = document.createElement('div');
        prevButton.classList.add('gallery-btn-prev', 'hidden-mobile');
        nextButton.classList.add('gallery-btn-next', 'hidden-mobile');
        if (media && media ? .length) {
            galleryWrapper.insertBefore(prevButton, galleryWrapper.firstChild);
            galleryWrapper.appendChild(nextButton);
        }

        galleryWrapper.querySelectorAll('[class^="gallery-btn-"]').forEach((button) => {
            button.addEventListener('click', handleGalleryCarousel);
        });

        handleResize();
        window.addEventListener('resize', handleResize);
    }

    // Add gallery text from block config
    if (config['gallery-text']) {
        const galleryTextContainer = document.createElement('div');
        galleryTextContainer.classList.add('default-content-wrapper');

        const galleryText = document.createElement('h3');
        galleryText.id = config['gallery-text'].replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-');
        galleryText.innerText = config['gallery-text'];

        galleryTextContainer.appendChild(galleryText);
        galleryWrapper.parentElement.insertBefore(galleryTextContainer, galleryWrapper);
    }

    function handleProductSlider() {
        const slides = document.querySelectorAll('.related-products');
        const sliderWrapper = document.querySelector('.related-products-container');
        const prevButton = document.querySelector('.product-nav-button.prev');
        const nextButton = document.querySelector('.product-nav-button.next');

        let currentIndex = 0;

        function updateSlide() {
            const offset = -currentIndex * 100;
            sliderWrapper.style.transform = `translateX(${offset}%)`;
        }

        function showNextSlide() {
            currentIndex = (currentIndex + 1) % slides.length;
            updateSlide();
        }

        function showPrevSlide() {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateSlide();
        }

        if (slides.length > 1) {
            nextButton.addEventListener('click', showNextSlide);
            prevButton.addEventListener('click', showPrevSlide);
        }

        if (slides.length === 1) {
            nextButton.style.display = 'none';
            prevButton.style.display = 'none';
        }
    }

    function renderModal() {
        const prevModal = document.querySelector('.social-native-gallery-modal');
        if (prevModal) prevModal.remove();

        const modal = document.createElement('div');
        modal.classList.add('social-native-gallery-modal');
        const instagramPost = media[selectedIndex];
        const product = media[selectedIndex]._embedded['streams:all']._embedded.stream;
        const reportForm = media[selectedIndex]._forms.report;

        const html = `
      <div class="social-native-gallery-modal-nav">
        <div class="social-native-gallery-modal-nav-panel">
          <button class="social-native-gallery-modal-nav-button prev" aria-label="Previous product">
          ${ICONS.prev}
          </button>
        </div>
        <div class="social-native-gallery-modal-nav-panel">
          <button class="social-native-gallery-modal-nav-button next" aria-label="Next product">
            ${ICONS.next}
          </button>
        </div>
      </div>
      <div class="social-native-gallery-modal-content" role="dialog" aria-modal="true" id="social-native-gallery-modal" aria-label="Product Gallery">
        <button class="social-native-gallery-modal-close" aria-label="Close gallery">
          ${ICONS.close}
        </button>
        <div class="social-native-gallery-modal-body">
          <picture class="social-native-gallery-modal-image">
            <source srcset="${instagramPost.images.normal}" type="image/jpeg" media="(min-width: 600px)" />
            <img src="${instagramPost.images.mobile}" alt="${instagramPost.caption}" />
            <form action="${reportForm.action.href}" method="${reportForm.method}" class="social-native-gallery-modal-report-form">
              <p>
                <strong>Are you sure you want to report this photo?</strong>
                <br />
                <span class="description">This means it is inappropriate, has violated some law or infringes someone's rights. Reporting this photo will automatically remove it from the gallery for further review, so please be sure before reporting. Please allow 20 minutes for cache to clear and photo to be removed.</span>
              </p>
              <input type="email" required name="${reportForm.fields[0].name}" placeholder="${reportForm.fields[0].placeholder}" aria-label="${reportForm.fields[0].name}" />
              <input type="text" name="${reportForm.fields[1].name}" placeholder="${reportForm.fields[1].placeholder}" aria-label="${reportForm.fields[1].name}" />
              <div class="social-native-gallery-modal-report-actions">
                <button type="button" class="social-native-gallery-modal-report-cancel" aria-label="Cancel report">
                  Cancel
                </button>
                <input type="submit" class="social-native-gallery-modal-report-submit" name="${reportForm.fields[2].name}" value="${reportForm.fields[2].value}" aria-label="Submit report" />
              </div>
            </form>
            <button class="social-native-gallery-modal-report-open" aria-label="Report this photo">
              ${ICONS.exclamation}
            </button>
          </picture>
          <div class="social-native-gallery-modal-info">
            <a href="${instagramPost.original_source}" class="social-native-gallery-modal-post-link" target="_blank" rel="noopener noreferrer">
              ${ICONS.instagram}
              <span>${instagramPost._embedded.uploader.username}</span>
            </a>
              ${(() => {
    // Filter products with base_image and check if there are any left
    const filteredProducts = product
      .filter(({ _embedded }) => _embedded?.base_image);
    // Only render related-products-container if there are filtered products
    if (filteredProducts.length > 0) {
      return ` <
            div class = "social-native-gallery-modal-details" >
            <
            h2 class = "social-native-gallery-modal-modal-title" > Shop this look < /h2> <
            div class = "related-products-wrapper" >
            <
            div class = "related-products-container" >
            $ {
                filteredProducts
                    .map(({
                        _embedded,
                        product_url: productUrl
                    }, index) => {
                        const {
                            base_image: baseImage
                        } = _embedded;
                        const {
                            images: {
                                normal: normalImage,
                                mobile: mobileImage
                            },
                            caption
                        } = baseImage;
                        return `
                            <div class="related-products">
                              <a data-index="${index}" href="${productUrl}" class="social-native-gallery-modal-link">
                                <picture class="social-native-gallery-modal-product">
                                  <source srcset="${normalImage}" type="image/jpeg" media="(min-width: 600px)" />
                                  <img src="${mobileImage || 'default-image-mobile.jpg'}" alt="${caption || 'Default caption'}" />
                                </picture>
                              </a>
                              <p class="social-native-gallery-modal-caption">${caption || 'Default caption'}</p>
                            </div>
                          `;
                    }).join('')
            } <
            /div> <
            div class = "prod-nav" >
            <
            div class = "product-nav-panel" >
            <
            button class = "product-nav-button prev"
        aria - label = "Previous product" >
            $ {
                ICONS.prev
            } <
            /button> <
            /div> <
            div class = "prod-nav-panel" >
            <
            button class = "product-nav-button next"
        aria - label = "Next product" >
            <
            div class = "chevron-left" > < /div> <
            /button> <
            /div> <
            /div> <
            /div> <
            /div>
        `;
    }
    return ''; // Return an empty string if there are no filtered products
  })()}
  </div>
        </div>
      </div>
    `;

        modal.innerHTML = html;
        document.body.appendChild(modal);

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        firstElement.focus();
        if (product.length > 0) {
            handleProductSlider();
        }
    }

    const products = blockOrigin === 'pdp' ? block.querySelectorAll('.social-native-user-info') : block.querySelectorAll('.social-native-gallery-grid-item button');

    function handleProductClick(event) {
        selectedIndex = parseInt(event.currentTarget.dataset.index, 10);
        renderModal();
    }

    if (products) {
        products.forEach((product) => {
            product.addEventListener('click', handleProductClick);
        });
    }

    const reportedIndexes = [];

    function handleFormSubmit(event) {
        event.preventDefault();

        if (!event.target.classList.contains('social-native-gallery-modal-report-form')) return;

        const form = event.target;
        const formData = new FormData(form);

        if (reportedIndexes.includes(selectedIndex)) {
            form.innerHTML = `
        <div class="social-native-gallery-modal-report-message">
          ${ICONS.exclamation}
          <p>The photo was already reported</p>
        </div>
      `;
            return;
        }

        const url = new URL(form.action);
        url.searchParams.append('auth_token', socialNativeApiKeyConfig);
        url.searchParams.append('wrap_responses', '1');
        url.searchParams.append('version', VERSION);
        fetch(url, {
                method: form.method,
                body: formData,
            })
            .then((blob) => {
                if (!blob.ok) {
                    throw new Error('Failed to submit form');
                }
                return blob.json();
            })
            .then(() => {
                reportedIndexes.push(selectedIndex);
                form.innerHTML = `
          <div class="social-native-gallery-modal-report-message">
            ${ICONS.check}
            <p>The photo was successfully reported</p>
          </div>
        `;
            })
            .catch(() => {
                form.innerHTML = `
          <div class="social-native-gallery-modal-report-message">
            ${ICONS.error}
            <p>There was an error submitting the form, please try again later</p>
          </div>
        `;
            });
    }

    document.documentElement.addEventListener('submit', handleFormSubmit);

    function handleModalClick(event) {
        if (event.target.closest('.social-native-gallery-modal-nav-button')) {
            if (event.target.classList.contains('prev')) {
                selectedIndex = (selectedIndex + media.length - 1) % media.length;
            } else {
                selectedIndex = (selectedIndex + 1) % media.length;
            }

            renderModal();
            return;
        }

        if (event.target.closest('.social-native-gallery-modal-report-open')) {
            const form = document.querySelector('.social-native-gallery-modal-report-form');
            if (form) form.classList.add('show');
            return;
        }

        if (event.target.closest('.social-native-gallery-modal-report-cancel')) {
            const form = document.querySelector('.social-native-gallery-modal-report-form');
            if (form) form.classList.remove('show');
            return;
        }

        if (event.target.closest('.social-native-gallery-modal-close') || event.target.classList.contains('gallery-modal-nav')) {
            const modalDiv = document.querySelector('.social-native-gallery-modal');
            if (modalDiv) modalDiv.remove();
        }
    }

    document.documentElement.addEventListener('click', handleModalClick);

    function handleKeyDown(event) {
        const modalDiv = document.querySelector('.social-native-gallery-modal');
        if (!modalDiv) return;

        if (event.key === 'Escape') {
            if (modalDiv) modalDiv.remove();
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            selectedIndex = (selectedIndex + media.length - 1) % media.length;
            renderModal();
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % media.length;
            renderModal();
        }
    }

    document.documentElement.addEventListener('keydown', handleKeyDown);

    let xDown = null;
    let yDown = null;

    function handleTouchStart(event) {
        const modalDiv = document.querySelector('.social-native-gallery-modal');
        if (!modalDiv) return;

        xDown = event.touches[0].clientX;
        yDown = event.touches[0].clientY;
    }

    const TOUCH_THRESHOLD = 50;

    function handleTouchMove(event) {
        const modalDiv = document.querySelector('.social-native-gallery-modal');
        if (!modalDiv || !xDown || !yDown) return;

        const xUp = event.touches[0].clientX;
        const yUp = event.touches[0].clientY;

        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > TOUCH_THRESHOLD) {
                selectedIndex = (selectedIndex + 1) % media.length;
            } else if (xDiff < -TOUCH_THRESHOLD) {
                selectedIndex = (selectedIndex + media.length - 1) % media.length;
            }
            renderModal();
        }

        xDown = null;
        yDown = null;
    }

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);

    function handleFocusTrap(event) {
        const modalDiv = document.querySelector('.social-native-gallery-modal');
        if (!modalDiv) return;

        const focusableElements = modalDiv.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.key === 'Tab') {
            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }
    document.addEventListener('keydown', handleFocusTrap);
}