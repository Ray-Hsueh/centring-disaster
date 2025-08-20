import en from './locales/en.js';

class I18n {
    constructor() {
        this.currentLocale = 'en';
        this.messages = { en };
    }

    t(key, params = {}) {
        let message = this.messages[this.currentLocale][key] || key;
        
        Object.keys(params).forEach(param => {
            message = message.replace(`{${param}}`, params[param]);
        });
        
        return message;
    }

    setLocale(locale) {
        if (this.messages[locale]) {
            this.currentLocale = locale;
        }
    }

    getCurrentLocale() {
        return this.currentLocale;
    }
}

export default new I18n(); 