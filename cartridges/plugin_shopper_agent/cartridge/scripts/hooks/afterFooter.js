'use strict';

/* eslint-env node */
/* global request */

/**
 * SFCC Hook: afterFooter
 *
 * Global variables available in SFCC runtime:
 * @global {dw.system.Request} request - HTTP request object
 */

// Consolidated imports at the top of the file
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var Velocity = require('dw/template/Velocity');
var Locale = require('dw/util/Locale');

// Scoped logger for the plugin
var log = Logger.getLogger('plugin_shopper_agent', 'plugin_shopper_agent.afterFooter');

/**
 * Sanitize string for safe use in JavaScript templates
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForJS(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/**
 * Map SFCC locale format to Salesforce-supported language code
 * @param {string} sfccLocale - SFCC locale in format 'en-US'
 * @returns {string} Salesforce language code in format 'en_US'
 */
function mapLocaleToSalesforce(sfccLocale) {
    const SALESFORCE_LANG_MAP = {
        'en-US': 'en_US',
        'en-GB': 'en_GB',
        'en-CA': 'en',
        'fr-FR': 'fr',
        'es-MX': 'es',
        'pt-BR': 'pt_BR',
        'de-DE': 'de',
        'it-IT': 'it',
        'ja-JP': 'ja',
        'ko-KR': 'ko',
        'nl-NL': 'nl',
        'no-NO': 'no',
        'pl-PL': 'pl',
        'sv-SE': 'sv',
        'da-DK': 'da',
        'fi-FI': 'fi',
        'zh-CN': 'zh_CN',
        'zh-TW': 'zh_TW'
    };

    var result = SALESFORCE_LANG_MAP[sfccLocale] || 'en_US';
    return result;
}

/**
 * Validate and sanitize configuration values
 * @param {Object} config - Configuration object
 * @returns {Object} Sanitized configuration
 */
function validateConfig(config) {
    return {
        siteId: sanitizeForJS(config.siteId || ''),
        locale: sanitizeForJS(config.locale || ''),
        sfLanguage: sanitizeForJS(config.sfLanguage || ''),
        usId: sanitizeForJS(config.usId || ''),
        refreshToken: sanitizeForJS(config.refreshToken || ''),
        commerceOrgId: sanitizeForJS(config.commerceOrgId || ''),
        isCartMgmtSupported: config.isCartMgmtSupported === true ? 'true' : 'false',
        currency: sanitizeForJS(config.currency || ''),
        enableConversationContext: config.enabledConversationContext === true ? 'true' : 'false',
        conversationContext: sanitizeForJS(config.conversationContext || ''),
        domainUrl: sanitizeForJS(config.domainUrl || ''),
        enabledFabEntry: config.enabledFabEntry === true ? 'true' : 'false'
    };
}

/**
 * Get current domain URL from request or site configuration
 * @returns {string} Full domain URL with path if available, otherwise just domain (e.g., 'https://example.com/path' or 'https://example.com')
 */
function getCurrentDomainUrl() {
    try {
        var protocol = 'https';
        var host = '';
        var path = '';

        // Get protocol and host from request
        if (request && request.httpHost && typeof request.httpHost === 'string') {
            protocol = request.httpProtocol || 'https';
            host = request.httpHost.trim();
        }

        // Fallback to Site configuration for host
        if (!host) {
            var currentSite = Site.current;
            if (currentSite) {
                var domainUrl = currentSite.getHttpsHostName() || currentSite.getHttpHostName() || '';
                if (domainUrl && typeof domainUrl === 'string') {
                    domainUrl = domainUrl.trim();
                    if (domainUrl.length > 0) {
                        if (domainUrl.startsWith('http')) {
                            // Extract host from full URL
                            var urlParts = domainUrl.split('://');
                            if (urlParts.length > 1) {
                                protocol = urlParts[0];
                                host = urlParts[1];
                            }
                        } else {
                            host = domainUrl;
                        }
                    }
                }
            }
        }

        if (!host || host.length === 0) {
            log.debug('Shopper Agent: No domain URL available, using empty string');
            return '';
        }

        // Get the path from request
        if (request && request.httpPath && typeof request.httpPath === 'string') {
            path = request.httpPath.split('/').slice(0, -1).join('/');
        }

        // Return only if we have both host and path
        if (path && path.length > 0) {
            return protocol + '://' + host + path;
        }

        // Return just host
        return protocol + '://' + host;
    } catch (e) {
        log.warn('Shopper Agent: Error getting domain URL: {0}', e.message);
        return '';
    }
}

/**
 * Get current Salesforce language using the same logic as ShopperAgent controller
 * @returns {string} Salesforce language code (e.g., 'en_US', 'fr', 'de')
 */
function getCurrentSfLanguage() {
    try {
        var localeId = null;

        // Use the working approach
        if (request.getLocale) {
            var requestLocale = request.getLocale();
            if (requestLocale) {
                // Check if it's a string or an object
                if (typeof requestLocale === 'string') {
                    localeId = requestLocale;
                } else if (requestLocale.getID) {
                    localeId = requestLocale.getID();
                }
            }
        }

        if (localeId) {
            var locale = Locale.getLocale(localeId);
            var language = locale.getLanguage();
            var country = locale.getCountry();
            var localeCode = (language || 'en') + '-' + (country || 'US');

            if (localeCode) {
                var sfLanguage = mapLocaleToSalesforce(localeCode);
                return sfLanguage;
            }
        }

        log.debug('Shopper Agent: Locale detection failed, using fallback');
        return 'en_US'; // Fallback to default
    } catch (e) {
        log.warn('Shopper Agent: Error getting current locale: {0}', e.message);
        return 'en_US'; // Fallback to default
    }
}

/**
 * Process deployment snippet to overwrite language setting with dynamic sfLanguage
 * This is an OPTIONAL enhancement that only runs when both snippet and sfLanguage are available
 * @param {string} snippet - The deployment snippet with existing language setting
 * @param {string} sfLanguage - The Salesforce language code to inject
 * @returns {string} Processed deployment snippet with updated language, or original if processing fails
 */
function processDeploymentSnippet(snippet, sfLanguage) {
    // Conservative approach: Only process if both inputs are valid
    if (!snippet || !sfLanguage || typeof snippet !== 'string' || typeof sfLanguage !== 'string') {
        log.debug('Shopper Agent: Skipping snippet processing - invalid inputs');
        return snippet;
    }

    try {
        // Pattern to match: embeddedservice_bootstrap.settings.language = 'any_value' or "any_value";
        var languagePattern = /embeddedservice_bootstrap\.settings\.language\s*=\s*['"]([^'"]*)['"]/g;
        log.debug('Shopper Agent: Debug - testing pattern on snippet: {0}', snippet.substring(0, 100) + '...');

        // Check if the pattern exists in the snippet before attempting replacement
        if (!languagePattern.test(snippet)) {
            log.debug('Shopper Agent: No language setting found in snippet, skipping processing');
            return snippet;
        }

        // Reset regex lastIndex for global pattern
        languagePattern.lastIndex = 0;

        // Replace the language value with the dynamic sfLanguage
        // Group 1: [^'"]* - the current language value (we want to replace this)
        var result = snippet.replace(languagePattern, function (match, currentLanguage) {
            log.debug('Shopper Agent: Debug - replacing language from "{0}" to "{1}"', currentLanguage, sfLanguage);
            return "embeddedservice_bootstrap.settings.language = '" + sfLanguage + "'";
        });

        // Verify the replacement was successful
        if (result === snippet) {
            log.debug('Shopper Agent: No language replacement occurred, using original snippet');
            return snippet;
        }

        log.debug('Shopper Agent: Language replacement successful');
        return result;
    } catch (e) {
        log.warn('Shopper Agent: Error processing deployment snippet: {0}', e.message);
        return snippet;
    }
}

/**
 * Get shopper agent configuration from site preferences
 * @param {dw.system.Site} site - Current site
 * @returns {Object} Configuration object
 */
function getShopperAgentConfig(site) {
    if (!site) {
        return {
            enabled: false,
            deploymentSnippet: null,
            commerceOrgId: null,
            enabledConversationContext: false,
            conversationContext: null,
            enabledFabEntry: false
        };
    }

    try {
        var enabled = site.getCustomPreferenceValue('enabledShopperAgentExperience') || false;
        var deploymentSnippet = site.getCustomPreferenceValue('embeddedMIAWDeploymentCodeSnippet') || null;
        var commerceOrgId = site.getCustomPreferenceValue('commerceOrgId') || null;
        var enabledConversationContext = site.getCustomPreferenceValue('enabledConversationContext') || false;
        var conversationContext = site.getCustomPreferenceValue('conversationContext') || null;
        var enabledFabEntry = site.getCustomPreferenceValue('enabledShopperAgentFabEntry') || false;

        return {
            enabled: enabled,
            deploymentSnippet: deploymentSnippet,
            commerceOrgId: commerceOrgId,
            enabledConversationContext: enabledConversationContext,
            conversationContext: conversationContext,
            enabledFabEntry: enabledFabEntry
        };
    } catch (e) {
        return {
            enabled: false,
            deploymentSnippet: null,
            commerceOrgId: null,
            enabledConversationContext: false,
            conversationContext: null,
            enabledFabEntry: false
        };
    }
}

/**
 * Retrieves a cookie by name from the current HTTP request
 * @param {string} name - The name of the cookie to retrieve
 * @returns {dw.web.Cookie|null} The cookie object if found, null otherwise
 * @throws {Error} Logs error if cookie retrieval fails
 */
function getCookie(name) {
    try {
        var cookie = null;
        var cookies = request.getHttpCookies();

        if (!cookies) {
            return null;
        }

        var cookieCount = cookies.getCookieCount();
        for (var i = 0; i < cookieCount; i++) {
            var currentCookie = cookies[i];
            if (currentCookie && name === currentCookie.getName()) {
                cookie = currentCookie;
                break;
            }
        }
        return cookie;
    } catch (e) {
        log.error('Error getting cookie {0}: {1}', name, e.message);
        return null;
    }
}

/**
 * Render the embedded service deployment code snippet
 */
function afterFooter() {
    try {
        var currentSite = Site.current;

        if (!currentSite) {
            log.warn('No current site available for shopper agent');
            return;
        }

        var config = getShopperAgentConfig(currentSite);

        if (!config.enabled || !config.deploymentSnippet) {
            log.debug('Shopper agent not enabled or deployment snippet not configured');
            return;
        }

        // Optional Enhancement: Only process snippet if both snippet and sfLanguage are available
        var processedSnippet = config.deploymentSnippet;

        try {
            // Get sfLanguage using the same logic as ShopperAgent controller
            var sfLanguage = getCurrentSfLanguage();

            // Convert MarkupText to string if needed
            var snippetString = config.deploymentSnippet;
            if (typeof snippetString !== 'string') {
                snippetString = snippetString.toString();
            }

            log.debug(
                'Shopper Agent: Debug - processing snippet, original: {0}',
                snippetString.substring(0, 100) + '...'
            );
            processedSnippet = processDeploymentSnippet(snippetString, sfLanguage);
            log.debug('Shopper Agent: Language enhancement applied - sfLanguage: {0}', sfLanguage);
            log.debug('Shopper Agent: Debug - processed snippet: {0}', processedSnippet.substring(0, 100) + '...');

            // Additional verification: Check if the language was actually replaced
            if (processedSnippet !== snippetString) {
                log.debug('Shopper Agent: Debug - snippet was successfully modified');
            } else {
                log.warn('Shopper Agent: Debug - snippet was NOT modified, using original');
            }
        } catch (e) {
            // If anything fails, use original snippet
            log.warn('Shopper Agent: Language enhancement failed, using original snippet: {0}', e.message);
        }

        // Use the processed snippet (with language replacement if successful)
        var snippet = Velocity.remoteInclude('ShopperAgent-IncludeHiddenPrechatFields') + ' ' + processedSnippet;
        Velocity.render(snippet, null);
    } catch (e) {
        log.error('Error in afterFooter hook: {0}', e.message);
    }
}

module.exports = {
    afterFooter,
    validateConfig,
    getShopperAgentConfig,
    getCookie,
    mapLocaleToSalesforce,
    processDeploymentSnippet,
    getCurrentSfLanguage,
    getCurrentDomainUrl,
    // Export for testing purposes
    __testExports:
        typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
            ? {
                  sanitizeForJS: sanitizeForJS,
                  validateConfig: validateConfig,
                  getShopperAgentConfig: getShopperAgentConfig,
                  getCookie: getCookie,
                  mapLocaleToSalesforce: mapLocaleToSalesforce,
                  processDeploymentSnippet: processDeploymentSnippet,
                  getCurrentSfLanguage: getCurrentSfLanguage,
                  getCurrentDomainUrl: getCurrentDomainUrl
              }
            : undefined
};
