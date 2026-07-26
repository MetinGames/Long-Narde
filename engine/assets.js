// engine/assets.js

export class AssetStore {
    constructor(basePath = './assets') {
        this.basePath = basePath.replace(/\/$/, '');
        this.images = new Map();
        this.audio = new Map();
    }

    getPath(relativePath) {
        return `${this.basePath}/${relativePath.replace(/^\//, '')}`;
    }

    loadImage(key, relativePath) {
        if (this.images.has(key)) {
            return Promise.resolve(this.images.get(key));
        }

        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.images.set(key, image);
                resolve(image);
            };
            image.onerror = () => {
                reject(new Error(`Görsel yüklenemedi: ${relativePath}`));
            };
            image.src = this.getPath(relativePath);
        });
    }

    loadAudio(key, relativePath) {
        if (this.audio.has(key)) {
            return Promise.resolve(this.audio.get(key));
        }

        return new Promise((resolve, reject) => {
            const audio = new Audio(this.getPath(relativePath));
            audio.addEventListener('canplaythrough', () => {
                this.audio.set(key, audio);
                resolve(audio);
            }, { once: true });
            audio.addEventListener('error', () => {
                reject(new Error(`Ses yüklenemedi: ${relativePath}`));
            }, { once: true });
            audio.load();
        });
    }

    getImage(key) {
        return this.images.get(key) || null;
    }

    getAudio(key) {
        return this.audio.get(key) || null;
    }
}

export const assets = new AssetStore();
