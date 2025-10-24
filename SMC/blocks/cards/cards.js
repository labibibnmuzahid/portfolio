import {
    createOptimizedPicture
} from '../../scripts/aem.js';

export default function decorate(block) {
    const hasNonLinkElements = block.querySelector('p');
    /* change to ul, li */
    const ul = document.createElement('ul');
    [...block.children].forEach((row) => {
        const link = row.querySelector('a') ? .href;
        const title = row.querySelector('a') ? .title;
        const li = document.createElement('li');
        while (row.firstElementChild) li.append(row.firstElementChild);
        [...li.children].forEach((div) => {
            if (div.children.length === 1 && div.querySelector('picture')) {
                if (link) {
                    const a = document.createElement('a');
                    a.href = link;
                    a.setAttribute('aria-label', title);
                    a.append(div.cloneNode(true));
                    div.replaceWith(a);
                    a.className = 'cards-card-image';
                } else {
                    div.className = 'cards-card-image';
                }
            } else {
                div.className = 'cards-card-body';
                if (!hasNonLinkElements) {
                    const a = div.querySelector('a');
                    a.classList.add('single');
                }
            }
        });
        ul.append(li);
    });
    ul.querySelectorAll('img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{
        width: '750'
    }])));
    block.textContent = '';
    block.append(ul);
}