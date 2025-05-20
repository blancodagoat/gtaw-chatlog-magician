(function() {
    'use strict';

    const META = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"': '\\"',
        '\\': '\\\\'
    };

    const RX_ONE = /^[\],:{}\s]*$/;
    const RX_TWO = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    const RX_THREE = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    const RX_FOUR = /(?:^|:|,)(?:\s*\[)+/g;
    const RX_ESCAPABLE = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    const RX_DANGEROUS = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    const padZero = (num) => num < 10 ? `0${num}` : `${num}`;

    const thisValue = function() {
        return this.valueOf();
    };

    const quote = (str) => {
        RX_ESCAPABLE.lastIndex = 0;
        return RX_ESCAPABLE.test(str) 
            ? `"${str.replace(RX_ESCAPABLE, (char) => {
                const meta = META[char];
                return typeof meta === 'string' 
                    ? meta 
                    : `\\u${('0000' + char.charCodeAt(0).toString(16)).slice(-4)}`;
            })}"`
            : `"${str}"`;
    };

    const stringify = (value, replacer, space) => {
        let gap = '';
        let indent = '';
        let rep = replacer;

        if (typeof space === 'number') {
            indent = ' '.repeat(space);
        } else if (typeof space === 'string') {
            indent = space;
        }

        if (rep && typeof rep !== 'function' && (typeof rep !== 'object' || typeof rep.length !== 'number')) {
            throw new Error('JSON.stringify: replacer must be a function or an array');
        }

        const str = (key, holder) => {
            let value = holder[key];
            let result;
            const originalGap = gap;

            if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            switch (typeof value) {
                case 'string':
                    return quote(value);
                case 'number':
                    return isFinite(value) ? String(value) : 'null';
                case 'boolean':
                case 'null':
                    return String(value);
                case 'object':
                    if (!value) return 'null';

                    gap += indent;
                    const partial = [];

                    if (Array.isArray(value)) {
                        for (let i = 0; i < value.length; i++) {
                            partial[i] = str(i, value) || 'null';
                        }
                        result = partial.length === 0 
                            ? '[]' 
                            : gap 
                                ? `[\n${gap}${partial.join(`,\n${gap}`)}\n${originalGap}]`
                                : `[${partial.join(',')}]`;
                    } else {
                        const keys = rep && typeof rep === 'object' 
                            ? rep 
                            : Object.keys(value);

                        for (const k of keys) {
                            if (typeof k === 'string') {
                                const v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                        result = partial.length === 0 
                            ? '{}' 
                            : gap 
                                ? `{\n${gap}${partial.join(`,\n${gap}`)}\n${originalGap}}`
                                : `{${partial.join(',')}}`;
                    }
                    gap = originalGap;
                    return result;
            }
        };

        return str('', { '': value });
    };

    const parse = (text, reviver) => {

        if (typeof text !== 'string') {
            throw new Error('JSON.parse: input must be a string');
        }

        text = String(text);
        RX_DANGEROUS.lastIndex = 0;
        if (RX_DANGEROUS.test(text)) {
            text = text.replace(RX_DANGEROUS, (char) => 
                `\\u${('0000' + char.charCodeAt(0).toString(16)).slice(-4)}`
            );
        }

        if (!RX_ONE.test(text.replace(RX_TWO, '@')
                              .replace(RX_THREE, ']')
                              .replace(RX_FOUR, ''))) {
            throw new SyntaxError('JSON.parse: invalid JSON');
        }

        try {
            const result = eval(`(${text})`);

            if (typeof reviver === 'function') {
                const walk = (holder, key) => {
                    let value = holder[key];
                    if (value && typeof value === 'object') {
                        for (const k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                const v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                };
                return walk({ '': result }, '');
            }
            return result;
        } catch (e) {
            throw new SyntaxError(`JSON.parse: ${e.message}`);
        }
    };

    if (typeof Date.prototype.toJSON !== 'function') {
        Date.prototype.toJSON = function() {
            return isFinite(this.valueOf())
                ? `${this.getUTCFullYear()}-${padZero(this.getUTCMonth() + 1)}-${padZero(this.getUTCDate())}T${padZero(this.getUTCHours())}:${padZero(this.getUTCMinutes())}:${padZero(this.getUTCSeconds())}Z`
                : null;
        };
    }

    if (typeof Boolean.prototype.toJSON !== 'function') {
        Boolean.prototype.toJSON = thisValue;
    }

    if (typeof Number.prototype.toJSON !== 'function') {
        Number.prototype.toJSON = thisValue;
    }

    if (typeof String.prototype.toJSON !== 'function') {
        String.prototype.toJSON = thisValue;
    }

    if (typeof JSON === 'undefined') {
        window.JSON = {};
    }

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = stringify;
    }

    if (typeof JSON.parse !== 'function') {
        JSON.parse = parse;
    }

    if (window.performance && window.performance.mark) {
        window.addEventListener('load', () => {
            performance.mark('json-parser-initialized');
            performance.measure('json-parser-setup', 'json-parser-initialized');
        });
    }
})();