'use strict';

/**
 * Shopper Agent Configuration Handler
 *
 * This module handles embedded messaging setup for Salesforce Service Cloud and provides
 * postMessage communication functionality between the parent page and MIAW (Messaging in a Window) client.
 *
 * Features:
 * - Embedded messaging configuration and initialization
 * - PostMessage communication for conversation context
 * - Feature gating for optional conversation context functionality
 * - Configuration-driven conversation starter pills
 *
 * @author Salesforce Commerce Cloud
 * @version 1.0.0
 */
(function () {
    /**
     * Handle embedded messaging ready event
     *
     * Initializes the embedded messaging configuration when the Salesforce Service Cloud
     * embedded messaging is ready. This function configures the embedded service bootstrap
     * with the necessary settings and hidden prechat fields.
     *
     * @function handleEmbeddedMessagingReady
     * @returns {void}
     *
     * @example
     * // This function is automatically called when the embedded messaging is ready
     * // It configures the embedded service with site-specific settings
     */
    function handleEmbeddedMessagingReady() {
        // Validate that shopper agent configuration is available
        if (!window.shopperAgentConfig) {
            return;
        }

        // Validate that Salesforce embedded service bootstrap is available
        if (!window.embeddedservice_bootstrap || !window.embeddedservice_bootstrap.prechatAPI) {
            return;
        }

        try {
            // Configure embedded service settings
            window.embeddedservice_bootstrap.settings.language = window.shopperAgentConfig.sfLanguage;
            window.embeddedservice_bootstrap.settings.disableStreamingResponses = true;
            window.embeddedservice_bootstrap.settings.enableUserInputForConversationWithBot = false;

            // Control FAB icon visibility based on FAB entry point preference
            const shouldShowFabIcon =
                window.shopperAgentConfig.enabledFabEntry === true ||
                window.shopperAgentConfig.enabledFabEntry === 'true';

            window.embeddedservice_bootstrap.settings.hideChatButtonOnLoad = !shouldShowFabIcon;

            // Set hidden prechat fields with site-specific data
            window.embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
                SiteId: window.shopperAgentConfig.siteId,
                Locale: window.shopperAgentConfig.locale,
                UsId: window.shopperAgentConfig.usId,
                RefreshToken: window.shopperAgentConfig.refreshToken,
                OrganizationId: window.shopperAgentConfig.commerceOrgId,
                IsCartMgmtSupported: window.shopperAgentConfig.isCartMgmtSupported,
                Currency: window.shopperAgentConfig.currency,
                Language: window.shopperAgentConfig.sfLanguage,
                DomainUrl: window.shopperAgentConfig.domainUrl
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Shopper Agent: Error applying configuration', error);
        }
    }

    /**
     * Send conversation context to MIAW client
     *
     * Sends a postMessage to the embedded messaging iframe with conversation context data.
     * This function is used to communicate conversation starter pills from SFRA to the MIAW client.
     *
     * @function sendConversationContext
     * @param {string} type - The message type to send
     * @param {Object} [payload={}] - The payload data to send
     * @returns {void}
     *
     * @example
     * // Send conversation context to MIAW
     * sendConversationContext('conversational.actualConversationContext', {
     *     conversationContext: ['Suggest me jacket', 'Find me shoes']
     * });
     */
    function sendConversationContext(type, payload = {}) {
        try {
            const embeddedMessagingFrame = document.querySelector('div.embedded-messaging iframe');
            if (!embeddedMessagingFrame) {
                // eslint-disable-next-line no-console
                console.warn('Shopper Agent: Embedded messaging iframe not found');
                return;
            }
            const eventData = { type, payload };
            const targetOrigin = new URL(embeddedMessagingFrame.src).origin;
            embeddedMessagingFrame.contentWindow.postMessage(eventData, targetOrigin);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Shopper Agent: Error sending conversation context', error);
        }
    }

    /**
     * Handle incoming messages from MIAW client
     *
     * Processes postMessage events from the MIAW client and responds with conversation context
     * data when requested. This function implements the communication protocol between SFRA
     * and the embedded messaging iframe.
     *
     * @function handleMiawEvent
     * @param {MessageEvent} event - The postMessage event from MIAW client
     * @returns {void}
     */
    function handleMiawEvent(event) {
        if (event.source && event.source !== window) {
            try {
                if (event.data.type === 'lwc.getConversationContext') {
                    // Check if conversation context feature is enabled in site preferences
                    const enableConversationContext =
                        window.shopperAgentConfig.enableConversationContext === true ||
                        window.shopperAgentConfig.enableConversationContext === 'true';

                    if (enableConversationContext) {
                        // Parse comma-separated conversation context from configuration
                        const starters = window.shopperAgentConfig.conversationContext
                            ? window.shopperAgentConfig.conversationContext
                                  .split(',') // Split by comma
                                  .map((s) => s.trim()) // Remove whitespace
                                  .filter(Boolean) // Remove empty strings
                            : [];

                        // Send conversation context to MIAW client
                        sendConversationContext('conversational.actualConversationContext', {
                            conversationContext: starters
                        });
                    } else {
                        // Send empty array if conversation context is disabled
                        sendConversationContext('conversational.actualConversationContext', {
                            conversationContext: []
                        });
                    }
                }
                if (event.data.type === 'lwc.getDomainUrl') {
                    // Send domain URL from hidden pre-chat variables to MIAW client
                    sendConversationContext('conversational.domainUrl', {
                        domainUrl: window.shopperAgentConfig.domainUrl
                    });
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Shopper Agent: Error handling Miaw event', error);
            }
        }
    }

    /**
     * Configuration object structure
     *
     * @typedef {Object} ShopperAgentConfig
     * @property {string} siteId - The site ID
     * @property {string} locale - The locale code (e.g., 'en-US')
     * @property {string} sfLanguage - The Salesforce language code (e.g., 'en_US')
     * @property {string} usId - The user session ID
     * @property {string} refreshToken - The refresh token for authentication
     * @property {string} commerceOrgId - The commerce organization ID
     * @property {string} isCartMgmtSupported - Whether cart management is supported ('true' or 'false')
     * @property {string} currency - The currency code (e.g., 'USD')
     * @property {string} enableConversationContext - Whether conversation context is enabled ('true' or 'false')
     * @property {string} conversationContext - Comma-separated conversation starter strings
     */

    /**
     * Initialize event listeners and setup
     *
     * Registers event listeners for embedded messaging ready event and postMessage communication.
     * Also attempts to initialize immediately if the document is already loaded.
     */
    // Register event listeners
    window.addEventListener('onEmbeddedMessagingReady', handleEmbeddedMessagingReady);
    window.addEventListener('message', handleMiawEvent);

    /**
     * Initialize immediately if document is already loaded
     *
     * Attempts to initialize the embedded messaging configuration immediately
     * if the document is already in a ready state, otherwise waits for DOMContentLoaded.
     */
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(handleEmbeddedMessagingReady, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(handleEmbeddedMessagingReady, 100);
        });
    }
})();
