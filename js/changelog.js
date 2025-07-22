class Changelog {
    constructor() {
        this.panel = document.getElementById('changelogPanel');
        this.tab = document.querySelector('.changelog-tab');
        this.items = document.querySelector('.changelog-items');
        this.entries = typeof CHANGELOG_ENTRIES !== 'undefined' ? CHANGELOG_ENTRIES : [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderEntries();
    }

    setupEventListeners() {
        // Toggle panel on tab click
        this.tab.addEventListener('click', () => this.togglePanel());
    }

    togglePanel() {
        const isOpen = this.panel.classList.contains('open');
        
        if (isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        this.panel.classList.add('open');
        this.panel.setAttribute('aria-hidden', 'false');
        this.tab.setAttribute('aria-expanded', 'true');
        this.tab.setAttribute('aria-label', 'Close changelog');
        
        const firstItem = this.panel.querySelector('.changelog-item');
        if (firstItem) firstItem.focus();
    }

    closePanel() {
        this.panel.classList.remove('open');
        this.panel.setAttribute('aria-hidden', 'true');
        this.tab.setAttribute('aria-expanded', 'false');
        this.tab.setAttribute('aria-label', 'Open changelog');
    }

    renderEntries() {
        this.items.innerHTML = this.entries
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(entry => this.createEntryElement(entry))
            .join('');
    }

    createEntryElement(entry) {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Handle both old format (changes array) and new format (categories)
        if (entry.categories) {
            // New categorized format
            const title = entry.title ? `<h4 class="changelog-title">${entry.title}</h4>` : '';
            const categoriesHtml = Object.entries(entry.categories)
                .map(([categoryName, changes]) => `
                    <div class="changelog-category">
                        <h5 class="category-name">${categoryName}</h5>
                        <ul>
                            ${changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');

            return `
                <div class="changelog-item">
                    <div class="changelog-date">${formattedDate}</div>
                    <div class="changelog-content">
                        ${title}
                        ${categoriesHtml}
                    </div>
                </div>
            `;
        } else {
            // Old format (backward compatibility)
            return `
                <div class="changelog-item">
                    <div class="changelog-date">${formattedDate}</div>
                    <div class="changelog-content">
                        <ul>
                            ${entry.changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    addEntry(date, changes) {
        this.entries.push({ date, changes });
        this.renderEntries();
    }
}

// Initialize changelog when document is ready and data is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for CHANGELOG_ENTRIES to be available
    if (typeof CHANGELOG_ENTRIES !== 'undefined') {
        window.changelog = new Changelog();
    } else {
        // Fallback: initialize with empty entries
        window.changelog = new Changelog();
    }
}); 