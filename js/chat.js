(function() {
    'use strict';

    const STORAGE_KEY = 'jStorage';
    const UPDATE_KEY = 'jStorage_update';
    const META_KEY = '__jstorage_meta';
    const CRC32_KEY = 'CRC32';
    const TTL_KEY = 'TTL';
    const PUBSUB_KEY = 'PubSub';
    const VERSION = '0.4.12';

    const STORAGE_TYPES = {
        LOCAL: 'localStorage',
        GLOBAL: 'globalStorage',
        USER_DATA: 'userDataBehavior'
    };

    let storage = {
        [META_KEY]: {
            [CRC32_KEY]: {}
        }
    };

    let storageType = false;
    let storageSize = 0;
    let updateTimeout = false;
    let lastUpdate = 0;
    let pubSubHandlers = {};
    let lastPubSubTime = Date.now();
    let ttlTimeout;

    const validateKey = (key) => {
        if (typeof key !== 'string' && typeof key !== 'number') {
            throw new TypeError('Key name must be string or numeric');
        }
        if (key === META_KEY) {
            throw new TypeError('Reserved key name');
        }
        return true;
    };

    const calculateCRC32 = (str) => {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i);
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const triggerChange = (keys, action) => {
        keys = Array.isArray(keys) ? keys : [keys];

        if (action === 'flushed') {
            keys = Object.keys(pubSubHandlers);
            action = 'deleted';
        }

        keys.forEach(key => {
            if (pubSubHandlers[key]) {
                pubSubHandlers[key].forEach(handler => {
                    try {
                        handler(key, action);
                    } catch (error) {
                        console.error('Error in storage change handler:', error);
                    }
                });
            }
            if (pubSubHandlers['*']) {
                pubSubHandlers['*'].forEach(handler => {
                    try {
                        handler(key, action);
                    } catch (error) {
                        console.error('Error in wildcard storage change handler:', error);
                    }
                });
            }
        });
    };

    const saveStorage = () => {
        try {
            const storageString = JSON.stringify(storage);
            if (storageType === STORAGE_TYPES.LOCAL || storageType === STORAGE_TYPES.GLOBAL) {
                localStorage.setItem(STORAGE_KEY, storageString);
            } else if (storageType === STORAGE_TYPES.USER_DATA) {
                const userData = document.documentElement;
                userData.setAttribute(STORAGE_KEY, storageString);
                userData.save(STORAGE_KEY);
            }
            storageSize = storageString.length;
        } catch (error) {
            console.error('Error saving storage:', error);
        }
    };

    const loadStorage = () => {
        try {
            let storageString = '{}';
            if (storageType === STORAGE_TYPES.LOCAL || storageType === STORAGE_TYPES.GLOBAL) {
                storageString = localStorage.getItem(STORAGE_KEY) || '{}';
            } else if (storageType === STORAGE_TYPES.USER_DATA) {
                const userData = document.documentElement;
                userData.load(STORAGE_KEY);
                storageString = userData.getAttribute(STORAGE_KEY) || '{}';
            }
            storage = JSON.parse(storageString);
            storageSize = storageString.length;
        } catch (error) {
            console.error('Error loading storage:', error);
            storage = { [META_KEY]: { [CRC32_KEY]: {} } };
        }
    };

    const checkTTL = () => {
        clearTimeout(ttlTimeout);
        if (!storage[META_KEY]?.[TTL_KEY]) return;

        const now = Date.now();
        const ttl = storage[META_KEY][TTL_KEY];
        const crc32 = storage[META_KEY][CRC32_KEY];
        const expiredKeys = [];
        let nextExpiry = Infinity;

        Object.entries(ttl).forEach(([key, expiry]) => {
            if (expiry <= now) {
                delete ttl[key];
                delete crc32[key];
                delete storage[key];
                expiredKeys.push(key);
            } else {
                nextExpiry = Math.min(nextExpiry, expiry);
            }
        });

        if (nextExpiry !== Infinity) {
            ttlTimeout = setTimeout(checkTTL, Math.min(nextExpiry - now, 2147483647));
        }

        if (expiredKeys.length > 0) {
            saveStorage();
            triggerChange(expiredKeys, 'deleted');
        }
    };

    const processPubSub = () => {
        if (!storage[META_KEY]?.[PUBSUB_KEY]) return;

        const now = Date.now();
        const pubSub = storage[META_KEY][PUBSUB_KEY];
        const validMessages = [];

        pubSub.forEach(([timestamp, channel, data]) => {
            if (timestamp > now) {
                validMessages.push([timestamp, channel, data]);
            }
        });

        validMessages.forEach(([timestamp, channel, data]) => {
            if (pubSubHandlers[channel]) {
                pubSubHandlers[channel].forEach(handler => {
                    try {
                        handler(channel, JSON.parse(JSON.stringify(data)));
                    } catch (error) {
                        console.error('Error processing pub/sub message:', error);
                    }
                });
            }
        });

        if (validMessages.length !== pubSub.length) {
            storage[META_KEY][PUBSUB_KEY] = validMessages;
            saveStorage();
        }

        lastPubSubTime = Math.max(...validMessages.map(([timestamp]) => timestamp), now);
    };

    try {
        if (window.localStorage) {
            storageType = STORAGE_TYPES.LOCAL;
        } else if (window.globalStorage) {
            storageType = STORAGE_TYPES.GLOBAL;
        } else if (document.documentElement.addBehavior) {
            storageType = STORAGE_TYPES.USER_DATA;
            document.documentElement.addBehavior('#default#userData');
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }

    window.jStorage = {
        version: VERSION,

        set: function(key, value, options = {}) {
            validateKey(key);

            if (value === undefined) {
                return this.deleteKey(key);
            }

            if (value instanceof Node) {
                value = {
                    _is_xml: true,
                    xml: new XMLSerializer().serializeToString(value)
                };
            } else if (typeof value === 'function') {
                return;
            } else if (value && typeof value === 'object') {
                value = JSON.parse(JSON.stringify(value));
            }

            storage[key] = value;
            const valueString = JSON.stringify(value);
            storage[META_KEY][CRC32_KEY][key] = `2.${calculateCRC32(valueString)}`;

            this.setTTL(key, options.TTL || 0);
            saveStorage();
            triggerChange(key, 'updated');

            return value;
        },

        get: function(key, defaultValue) {
            validateKey(key);

            if (!(key in storage)) {
                return defaultValue === undefined ? null : defaultValue;
            }

            const value = storage[key];
            if (value && typeof value === 'object' && value._is_xml) {
                try {
                    return new DOMParser().parseFromString(value.xml, 'text/xml');
                } catch (error) {
                    console.error('Error parsing XML:', error);
                    return null;
                }
            }

            return value;
        },

        deleteKey: function(key) {
            validateKey(key);

            if (!(key in storage)) {
                return false;
            }

            delete storage[key];
            if (storage[META_KEY][TTL_KEY]?.[key]) {
                delete storage[META_KEY][TTL_KEY][key];
            }
            delete storage[META_KEY][CRC32_KEY][key];

            saveStorage();
            triggerChange(key, 'deleted');

            return true;
        },

        setTTL: function(key, ttl) {
            validateKey(key);

            if (!(key in storage)) {
                return false;
            }

            ttl = Number(ttl) || 0;
            if (!storage[META_KEY][TTL_KEY]) {
                storage[META_KEY][TTL_KEY] = {};
            }

            if (ttl > 0) {
                storage[META_KEY][TTL_KEY][key] = Date.now() + ttl;
            } else {
                delete storage[META_KEY][TTL_KEY][key];
            }

            saveStorage();
            checkTTL();

            return true;
        },

        getTTL: function(key) {
            validateKey(key);

            if (!(key in storage) || !storage[META_KEY][TTL_KEY]?.[key]) {
                return 0;
            }

            const ttl = storage[META_KEY][TTL_KEY][key] - Date.now();
            return ttl > 0 ? ttl : 0;
        },

        flush: function() {
            storage = {
                [META_KEY]: {
                    [CRC32_KEY]: {}
                }
            };
            saveStorage();
            triggerChange(null, 'flushed');
        },

        index: function() {
            return Object.keys(storage).filter(key => key !== META_KEY);
        },

        storageSize: function() {
            return storageSize;
        },

        subscribe: function(channel, handler) {
            if (typeof handler !== 'function') {
                throw new TypeError('Handler must be a function');
            }

            if (!pubSubHandlers[channel]) {
                pubSubHandlers[channel] = [];
            }
            pubSubHandlers[channel].push(handler);
        },

        unsubscribe: function(channel, handler) {
            if (!pubSubHandlers[channel]) {
                return;
            }

            if (handler) {
                pubSubHandlers[channel] = pubSubHandlers[channel].filter(h => h !== handler);
            } else {
                delete pubSubHandlers[channel];
            }
        },

        publish: function(channel, data) {
            if (!storage[META_KEY][PUBSUB_KEY]) {
                storage[META_KEY][PUBSUB_KEY] = [];
            }

            storage[META_KEY][PUBSUB_KEY].push([Date.now(), channel, data]);
            saveStorage();
            processPubSub();
        }
    };

    loadStorage();
    checkTTL();
    processPubSub();

    if (window.performance && window.performance.mark) {
        window.addEventListener('load', () => {
            performance.mark('chat-storage-initialized');
            performance.measure('chat-storage-setup', 'chat-storage-initialized');
        });
    }
})();