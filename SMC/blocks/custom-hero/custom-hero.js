export default function decorate(block) {
    const customHeroElements = document.querySelectorAll('.custom-hero');
    const hero = document.querySelector('.hero');
    if (hero) {
        const heroContent = document.querySelector('.hero p');
        const h1 = hero.querySelector('h1');
        const h2 = block.querySelector('h2');
        const pTags = block.querySelectorAll('p');
        let nonEmptyPTag = null;

        // eslint-disable-next-line no-restricted-syntax
        for (const p of pTags) {
            if (p.textContent.trim() !== '') {
                nonEmptyPTag = p;
                break; // Stop at the first non-empty <p>
            }
        }

        const a = block.querySelector('a');
        customHeroElements.forEach((element) => {
            // Convert the class list to an array
            const classList = Array.from(element.classList);

            // Get the middle classes (excluding first and last)
            const blockStyleClasses = classList.slice(1, -1);

            // If middle classes exist, add them to heroContent
            if (blockStyleClasses.length > 0) {
                // Join the middle classes into a string and add them as a class to heroContent
                hero.classList.add(...blockStyleClasses);
            }
        });

        // Move the h2 after the h1

        h1.insertAdjacentHTML('afterend', h2.outerHTML);

        // Append the <a> element to the heroContent
        heroContent.insertAdjacentHTML('beforeend', nonEmptyPTag.outerHTML);
        heroContent.insertAdjacentHTML('beforeend', a.outerHTML);

        // Remove any custom hero container if it exists
        const customHeroContainer = document.querySelector('.custom-hero-container');
        if (customHeroContainer) {
            customHeroContainer.remove();
        }
    }
}