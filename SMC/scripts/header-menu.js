document.addEventListener('DOMContentLoaded', () => {
    // Main navigation hover handling
    const mainNavItems = document.querySelectorAll('.main-navigation > li');
    let currentPanel = null;
    let hoverTimeout;

    mainNavItems.forEach(item => {
        const megaPanel = item.querySelector('.mega-menu-panel');
        
        if (megaPanel) {
            item.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                
                // Close any open panel
                if (currentPanel && currentPanel !== megaPanel) {
                    currentPanel.style.opacity = '0';
                    currentPanel.style.visibility = 'hidden';
                }
                
                // Open this panel
                megaPanel.style.opacity = '1';
                megaPanel.style.visibility = 'visible';
                currentPanel = megaPanel;
                
                // Position the panel
                const headerRect = document.querySelector('.nav-header-content').getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();
                
                megaPanel.style.left = `${-itemRect.left}px`;
                megaPanel.style.width = '100vw';
            });

            item.addEventListener('mouseleave', (e) => {
                // Check if we're moving to another nav item
                const relatedTarget = e.relatedTarget;
                if (!item.contains(relatedTarget) && !megaPanel.contains(relatedTarget)) {
                    hoverTimeout = setTimeout(() => {
                        megaPanel.style.opacity = '0';
                        megaPanel.style.visibility = 'hidden';
                        currentPanel = null;
                    }, 150);
                }
            });
        }
    });

    // Mobile menu handling
    const navToggle = document.querySelector('.nav-toggle');
    const navContent = document.querySelector('.nav-menu-content');
    const navOverlay = document.querySelector('.nav-overlay');
    const nav = document.querySelector('header nav');
    
    function toggleMenu() {
        const isExpanded = nav.getAttribute('aria-expanded') === 'true';
        nav.setAttribute('aria-expanded', !isExpanded);
        navContent.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = !isExpanded ? 'hidden' : '';
    }
    
    navToggle?.addEventListener('click', toggleMenu);
    navOverlay?.addEventListener('click', toggleMenu);

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
            toggleMenu();
        }
    });

    // Mega menu hover
    const menuItems = document.querySelectorAll('.nav-accordion-link-wrapper');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        const button = item.querySelector('button');
        const contentWrapper = item.closest('li').querySelector('.nav-accordion-content-wrapper');

        if (window.innerWidth >= 1280) {
            // Desktop hover behavior
            item.addEventListener('mouseenter', () => {
                // Close all other menus first
                document.querySelectorAll('.nav-accordion-content-wrapper.active').forEach(menu => {
                    if (menu !== contentWrapper) {
                        menu.classList.remove('active');
                    }
                });
                
                if (contentWrapper) {
                    contentWrapper.classList.add('active');
                }
            });

            item.addEventListener('mouseleave', (e) => {
                // Check if we're not hovering over the content wrapper
                const relatedTarget = e.relatedTarget;
                if (!contentWrapper?.contains(relatedTarget)) {
                    contentWrapper?.classList.remove('active');
                }
            });

            if (contentWrapper) {
                contentWrapper.addEventListener('mouseleave', () => {
                    contentWrapper.classList.remove('active');
                });
            }
        } else {
            // Mobile click behavior
            button?.addEventListener('click', (e) => {
                e.preventDefault();
                button.classList.toggle('active');
                contentWrapper?.classList.toggle('active');
                
                // Adjust height for animation
                if (contentWrapper?.classList.contains('active')) {
                    contentWrapper.style.height = contentWrapper.scrollHeight + 'px';
                } else {
                    contentWrapper.style.height = '0';
                }
            });
        }
    });
});