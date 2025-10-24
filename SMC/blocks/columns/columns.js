/**
 * Wraps images followed by links within a matching <a> tag.
 * @param {Element} container The container element
 */
function wrapImgsInLinks2(container) {
    const pictures = container.querySelectorAll('picture');
    pictures.forEach((pic) => {
        const link = pic.nextElementSibling;
        if (link && link.tagName === 'A' && link.href) {
            // Save the original link to add back in after the pic
            const noLinkText = container.classList.contains('no-link-text');
            if (!noLinkText) {
                const textLink = document.createElement('a');
                textLink.innerHTML = link.innerHTML;
                textLink.href = link.href;
                textLink.classList.add('button');
                pic.parentElement.append(textLink);
            }

            // append the pic to the original link
            link.innerHTML = pic.outerHTML;
            pic.replaceWith(link);
        }
    });
}

export default function decorate(block) {
    const hasButtonPrimary = block.classList.contains('button-primary');
    const isOurCollection = block.classList.contains('our-collection');
    const cols = [...block.firstElementChild.children];
    block.classList.add(`columns-${cols.length}-cols`);

    // setup image columns
    [...block.children].forEach((row) => {
        [...row.children].forEach((col) => {
            const pic = col.querySelector('picture');
            if (pic) {
                const picWrapper = pic.closest('div');
                if (picWrapper && picWrapper.children.length === 1) {
                    // picture is only content in column
                    picWrapper.classList.add('columns-img-col');
                }
            }
        });
    });

    if (hasButtonPrimary) {
        const a = block.querySelector('a');
        a.classList.add('button-primary');
    }

    // our-collection images are links
    if (isOurCollection) {
        // remove the parent <p> tag if <p> is parent of <a> for each block
        const links = block.querySelectorAll('a');
        links.forEach((link) => {
            const p = link.parentElement;
            if (p.tagName === 'P') {
                p.replaceWith(...p.childNodes);
            }
        });

        wrapImgsInLinks2(block);
    }
}