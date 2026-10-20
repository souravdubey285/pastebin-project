// pastebinService.js
// Core service handling short links and paste storage

import crypto from 'crypto';

class PastebinService {
  constructor() {
    // In-memory store (replace with database like PostgreSQL, Redis, or SQLite)
    this.pastes = new Map();
    this.links = new Map();
  }

  /**
   * Generates a random alphanumeric slug (e.g., "xK9z2A")
   */
  generateSlug(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let slug = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      slug += chars[bytes[i] % chars.length];
    }
    return slug;
  }

  /**
   * Simple hash function for password protection
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Calculate expiration date in milliseconds
   */
  getExpirationDate(expirationOption) {
    const now = Date.now();
    const durations = {
      '10m': 10 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    return durations[expirationOption] ? now + durations[expirationOption] : null;
  }

  // ==================== PASTEBIN METHODS ====================

  /**
   * Create a new text/code paste
   */
  createPaste({ title, content, language = 'plaintext', customSlug = null, expiration = 'never', password = null }) {
    const slug = customSlug || this.generateSlug();

    if (this.pastes.has(slug)) {
      throw new Error('Slug already exists. Please choose another.');
    }

    const paste = {
      slug,
      title: title || 'Untitled Paste',
      content,
      language,
      views: 0,
      createdAt: new Date().toISOString(),
      expiresAt: this.getExpirationDate(expiration),
      passwordHash: password ? this.hashPassword(password) : null,
      isProtected: Boolean(password),
    };

    this.pastes.set(slug, paste);
    return paste;
  }

  /**
   * Fetch a paste by slug (verifies expiration and password if required)
   */
  getPaste(slug, password = null) {
    const paste = this.pastes.get(slug);

    if (!paste) throw new Error('Paste not found');

    // Check Expiration
    if (paste.expiresAt && Date.now() > paste.expiresAt) {
      this.pastes.delete(slug); // Clean up expired item
      throw new Error('This paste has expired.');
    }

    // Check Password Protection
    if (paste.isProtected) {
      if (!password || this.hashPassword(password) !== paste.passwordHash) {
        throw new Error('Password required or invalid.');
      }
    }

    // Increment View Count
    paste.views += 1;

    // Return paste without exposing password hash
    const { passwordHash, ...safePaste } = paste;
    return safePaste;
  }

  // ==================== BIT.LY METHODS ====================

  /**
   * Create a shortened URL
   */
  shortenUrl({ longUrl, customSlug = null }) {
    // Basic URL validation
    try {
      new URL(longUrl);
    } catch {
      throw new Error('Invalid URL provided.');
    }

    const slug = customSlug || this.generateSlug(5);

    if (this.links.has(slug)) {
      throw new Error('Custom short link is already taken.');
    }

    const link = {
      slug,
      longUrl,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };

    this.links.set(slug, link);
    return link;
  }

  /**
   * Get long URL for redirection and increment click count
   */
  resolveLink(slug) {
    const link = this.links.get(slug);
    if (!link) throw new Error('Short link not found.');

    link.clicks += 1;
    return link.longUrl;
  }
}

export default new PastebinService();