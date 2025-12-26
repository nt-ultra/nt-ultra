const ContextMenuManager = {
    currentHandlers: {},

    show(e, item, actions) {
        const menu = document.getElementById('context-menu');
        menu.innerHTML = '';
        this.currentHandlers = {};
        actions.forEach(actionDef => {
            const button = document.createElement('button');
            button.className = 'context-menu-item';
            if (actionDef.danger) button.classList.add('danger');
            button.dataset.action = actionDef.action;
            button.textContent = actionDef.label;
            menu.appendChild(button);
            this.currentHandlers[actionDef.action] = actionDef.handler;
        });
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let finalX = e.clientX;
        let finalY = e.clientY;
        if (finalX + menuRect.width > viewportWidth) { finalX = viewportWidth - menuRect.width - 5; }
        if (finalY + menuRect.height > viewportHeight) { finalY = viewportHeight - menuRect.height - 5; }
        if (finalX < 0) { finalX = 5; }
        if (finalY < 0) { finalY = 5; }
        menu.style.left = `${finalX}px`;
        menu.style.top = `${finalY}px`;
    },

    hide() {
        const menu = document.getElementById('context-menu');
        menu.style.display = 'none';
        menu.innerHTML = '';
        this.currentHandlers = {};
    },

    performAction(action) {
        const handler = this.currentHandlers[action];
        if (handler) {
            handler();
        }
        this.hide();
    }
};

document.getElementById('context-menu')?.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action) {
        ContextMenuManager.performAction(action);
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) {
        ContextMenuManager.hide();
    }
});

export default ContextMenuManager;