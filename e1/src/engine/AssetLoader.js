// @ts-check

export class AssetLoader {
  constructor(manifestUrl = './assets/manifest.json?v=5') {
    this.manifestUrl = manifestUrl;
    this.entries = new Map();
    this.images = new Map();
    this.failures = new Set();
    this.loading = new Map();
    this.loadedGroups = new Set();
  }

  async preload(groups = ['global']) {
    const response = await fetch(this.manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Asset manifest failed: ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.assets)) throw new Error('Asset manifest requires an assets array');
    for (const entry of manifest.assets) {
      this.validate(entry);
      this.entries.set(entry.id, Object.freeze({ ...entry }));
    }
    await this.loadGroups(groups);
    return this;
  }

  validate(entry) {
    if (!entry?.id || !['image', 'audio'].includes(entry.type)) throw new Error('Asset entries require id and supported type');
    if (entry.url !== null && typeof entry.url !== 'string') throw new Error(`Asset ${entry.id} has an invalid url`);
    if (!entry.fallback) throw new Error(`Asset ${entry.id} requires a fallback id`);
    if (entry.group !== undefined && typeof entry.group !== 'string') throw new Error(`Asset ${entry.id} has an invalid group`);
  }

  async loadImage(entry) {
    if (this.images.has(entry.id) || !entry.url) return;
    if (this.loading.has(entry.id)) return this.loading.get(entry.id);
    const image = new Image();
    const task = (async () => { try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Image load failed: ${entry.id}`));
        image.src = entry.url;
      });
      this.images.set(entry.id, image);
    } catch {
      this.failures.add(entry.id);
    } finally { this.loading.delete(entry.id); } })();
    this.loading.set(entry.id, task);
    return task;
  }

  async loadGroup(group) {
    if (this.loadedGroups.has(group)) return;
    const entries = [...this.entries.values()].filter(entry => (entry.group ?? 'global') === group && entry.type === 'image' && entry.url);
    await Promise.all(entries.map(entry => this.loadImage(entry)));
    this.loadedGroups.add(group);
  }

  async loadGroups(groups) { await Promise.all([...new Set(groups)].map(group => this.loadGroup(group))); }
  prefetchGroup(group) { void this.loadGroup(group); }

  getImage(id) { return this.images.get(id) ?? null; }
  getEntry(id) { return this.entries.get(id) ?? null; }
}
