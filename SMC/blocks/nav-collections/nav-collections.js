/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */

export default function decorate(block) {
    const linksWrapper = document.createElement('div');
    linksWrapper.classList.add('nav-collection-links-wrapper');
    const links = block.querySelectorAll('.button-container');
    links.forEach((link) => {
        const html = link.innerHTML.trim();

        if (html.startsWith('<p>') && html.endsWith('</p>')) {
            const innerText = html.slice(3, -4).trim();
            link.innerHTML = innerText;
        }

        linksWrapper.append(link);
    });
    const contentGridWrapper = document.createElement('div');
    contentGridWrapper.classList.add('nav-collection-content-grid-wrapper');

    const contentSections = block.querySelectorAll(':scope > div');
    contentSections.forEach((section) => {
        contentGridWrapper.append(section);
    });

    const gridItems = contentGridWrapper.querySelectorAll(':scope > div');
    gridItems.forEach((item, index) => {
        item.classList.add('nav-collection-content-grid');
        if (index === 0) {
            item.classList.add('active');
        }
        item.querySelector(':scope > div:first-child').classList.add('nav-collection-item-text');
        item.querySelector(':scope > div:last-child').classList.add('nav-collection-item-image');
    });

    // event handlers
    links.forEach((link, index) => {
        link.addEventListener('mouseenter', () => {
            gridItems.forEach((item) => {
                item.classList.remove('active');
            });
            gridItems[index].classList.add('active');
        });
    });

    block.append(linksWrapper);
    block.append(contentGridWrapper);
}