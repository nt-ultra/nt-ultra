import { 
    renderWallpapers, 
    selectWallpaper, 
    deleteWallpaper, 
    removeCurrentWallpaper,
    openWallpaperModal,
    showWallpaperStep,
    closeWallpaperModal,
    confirmWallpaper,
    setTempWallpaperData
} from './wallpapers.js';

export function initWallpapersUI() {

    document.getElementById('add-wallpaper-btn').addEventListener('click', openWallpaperModal);
    document.getElementById('remove-wallpaper-btn').addEventListener('click', removeCurrentWallpaper);

    document.querySelectorAll('.wallpaper-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = e.currentTarget.dataset.type;
            
            if (type === 'file') {
                document.getElementById('wallpaper-file-input').click();
            } else if (type === 'url') {
                showWallpaperStep('wallpaper-step-url');
            } else if (type === 'color') {
                showWallpaperStep('wallpaper-step-color');
            }
        });
    });
    document.getElementById('wallpaper-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > 200) {
                notify('Wallpaper size is excessive', `This image's file size is ${fileSizeMB.toFixed(1)}MB, under 200MB is the limit.`);
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setTempWallpaperData(event.target.result);
                const preview = document.getElementById('wallpaper-preview');
                preview.style.backgroundImage = `url(${event.target.result})`;
                preview.style.backgroundColor = '';
                showWallpaperStep('wallpaper-step-preview');
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    });
    document.getElementById('wallpaper-url-next').addEventListener('click', (e) => {
        e.preventDefault();
        const url = document.getElementById('wallpaper-url-input').value.trim();
        if (url) {
            setTempWallpaperData(url);
            const preview = document.getElementById('wallpaper-preview');
            preview.style.backgroundImage = `url(${url})`;
            preview.style.backgroundColor = '';
            showWallpaperStep('wallpaper-step-preview');
        }
    });
    document.getElementById('wallpaper-url-back').addEventListener('click', (e) => {
        e.preventDefault();
        showWallpaperStep('wallpaper-step-1');
    });
    document.getElementById('wallpaper-color-input').addEventListener('input', (e) => {
        setTempWallpaperData(e.target.value);
    });
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const color = e.target.dataset.color;
            document.getElementById('wallpaper-color-input').value = color;
            setTempWallpaperData(color);
        });
    });
    document.getElementById('wallpaper-color-next').addEventListener('click', (e) => {
        e.preventDefault();
        const color = document.getElementById('wallpaper-color-input').value;
        if (!color) {
            setTempWallpaperData(color);
        }
        const preview = document.getElementById('wallpaper-preview');
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = color;
        showWallpaperStep('wallpaper-step-preview');
    });
    document.getElementById('wallpaper-color-back').addEventListener('click', (e) => {
        e.preventDefault();
        showWallpaperStep('wallpaper-step-1');
    });
    document.getElementById('wallpaper-confirm').addEventListener('click', (e) => {
        e.preventDefault();
        confirmWallpaper();
    });   
    document.getElementById('wallpaper-preview-back').addEventListener('click', (e) => {
        e.preventDefault();
        closeWallpaperModal();
    });
    document.getElementById('cancel-wallpaper').addEventListener('click', (e) => {
        e.preventDefault();
        closeWallpaperModal();
    });
    document.getElementById('wallpaper-modal').addEventListener('click', (e) => {
        if (e.target.id === 'wallpaper-modal') {
            closeWallpaperModal();
        }
    });
}