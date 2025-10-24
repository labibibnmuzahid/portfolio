import {
    createOptimizedPicture
} from '../../scripts/aem.js';

export default function decorate(block) {
    const divs = block.querySelectorAll('.new-introductions > div');

    divs.forEach((div, index) => {
        if (index === 0) div.classList.add('description');
        if (index === 1) {
            div.classList.add('cards');
            [...div.children].forEach((item) => {
                const link = item.querySelector('a').href;
                const anchorTag = document.createElement('a');
                anchorTag.href = link;
                anchorTag.classList.add('item-link');
                anchorTag.appendChild(item.cloneNode(true));
                item.replaceWith(anchorTag);
            });
        }
    });

    const buttonLink = block.querySelector('.button-container a');
    buttonLink ? .classList.add('button-primary');

    block.querySelectorAll('img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{
        width: '400'
    }])));
    block.querySelectorAll('img').forEach((img) => {
        img.width = '400';
        img.height = 'auto';
    });
}