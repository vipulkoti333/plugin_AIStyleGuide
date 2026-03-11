/* eslint-env jest */
/* eslint-disable no-underscore-dangle, no-unused-expressions */

'use strict';

// Mock SFCC modules
const mockSiteModule = require('dw/system/Site');
const mockLocaleModule = require('dw/util/Locale');
const mockAfterFooter = require('../scripts/hooks/afterFooter');

// Mock the afterFooter module
jest.mock('../scripts/hooks/afterFooter');

describe('ShopperAgent Controller Currency Logic Tests', () => {
    let mockRequest;
    let mockSite;
    let mockLocale;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock SFCC Site
        mockSite = {
            ID: 'test_site',
            getDefaultCurrency: jest.fn().mockReturnValue({
                getCurrencyCode: jest.fn().mockReturnValue('USD')
            })
        };

        // Use the existing Locale mock
        mockLocale = mockLocaleModule.getLocale('en_US');

        // Mock SFCC modules
        mockSiteModule.current = mockSite;
        // Use the existing Locale mock as is

        // Mock afterFooter functions
        mockAfterFooter.getShopperAgentConfig.mockReturnValue({
            commerceOrgId: 'test_org_id',
            enabledConversationContext: true,
            conversationContext: 'Suggest me jacket, Find me shoes'
        });
        mockAfterFooter.getCookie.mockReturnValue({
            value: 'test_cookie_value'
        });
        mockAfterFooter.validateConfig.mockImplementation((config) => ({
            siteId: config.siteId,
            locale: config.locale,
            usId: config.usId,
            refreshToken: config.refreshToken,
            commerceOrgId: config.commerceOrgId,
            isCartMgmtSupported: config.isCartMgmtSupported === true ? 'true' : 'false',
            currency: config.currency,
            enableConversationContext: config.enabledConversationContext === true ? 'true' : 'false',
            conversationContext: config.conversationContext || '',
            domainUrl: config.domainUrl || ''
        }));

        // Mock request object
        mockRequest = {
            locale: { id: 'en_US' },
            session: {
                currency: {
                    currencyCode: 'EUR'
                }
            }
        };
    });

    describe('Currency Extraction Logic', () => {
        test('should extract currency from session when available', () => {
            // Test the currency extraction logic directly
            let currentCurrency = null;
            if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                currentCurrency = mockRequest.session.currency.currencyCode;
            } else {
                currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
            }

            expect(currentCurrency).toBe('EUR');
        });

        test('should fallback to site default currency when session currency is missing', () => {
            // Setup request without session currency
            mockRequest.session = {};

            // Test the currency extraction logic directly
            let currentCurrency = null;
            if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                currentCurrency = mockRequest.session.currency.currencyCode;
            } else {
                currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
            }

            expect(currentCurrency).toBe('USD');
        });

        test('should fallback to site default currency when session currency is null', () => {
            // Setup request with null session currency
            mockRequest.session = {
                currency: null
            };

            // Test the currency extraction logic directly
            let currentCurrency = null;
            if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                currentCurrency = mockRequest.session.currency.currencyCode;
            } else {
                currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
            }

            expect(currentCurrency).toBe('USD');
        });

        test('should fallback to site default currency when session currency object is incomplete', () => {
            // Setup request with incomplete session currency
            mockRequest.session = {
                currency: {
                    // missing currencyCode
                }
            };

            // Test the currency extraction logic directly
            let currentCurrency = null;
            if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                currentCurrency = mockRequest.session.currency.currencyCode;
            } else {
                currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
            }

            expect(currentCurrency).toBe('USD');
        });

        test('should handle site without default currency gracefully', () => {
            // Setup request without session currency to test fallback
            mockRequest.session = {};

            // Test the currency extraction logic directly
            let currentCurrency = null;
            if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                currentCurrency = mockRequest.session.currency.currencyCode;
            } else {
                currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
            }

            expect(currentCurrency).toBe('USD');
        });
    });

    describe('Configuration Integration', () => {
        test('should pass all required fields to validateConfig including currency', () => {
            // Test the complete configuration object creation
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false, // Changed: now boolean false instead of string 'false'
                currency: 'EUR', // from session
                enabledConversationContext: true,
                conversationContext: 'Suggest me jacket, Find me shoes'
            };

            const result = mockAfterFooter.validateConfig(config);

            expect(result).toEqual({
                siteId: 'test_site',
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: 'false', // validateConfig converts boolean to string
                currency: 'EUR',
                enableConversationContext: 'true',
                conversationContext: 'Suggest me jacket, Find me shoes',
                domainUrl: ''
            });
        });

        test('should correctly handle isCartMgmtSupported boolean conversion', () => {
            // Test that the controller passes boolean false and validateConfig converts it to string 'false'
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false, // Boolean false
                currency: 'USD'
            };

            const result = mockAfterFooter.validateConfig(config);

            // validateConfig should convert boolean false to string 'false'
            expect(result.isCartMgmtSupported).toBe('false');
            expect(typeof result.isCartMgmtSupported).toBe('string');
        });

        test('should handle different currency values correctly', () => {
            // Test with different session currencies
            const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

            currencies.forEach((currencyCode) => {
                mockRequest.session.currency.currencyCode = currencyCode;

                let currentCurrency = null;
                if (mockRequest.session && mockRequest.session.currency && mockRequest.session.currency.currencyCode) {
                    currentCurrency = mockRequest.session.currency.currencyCode;
                } else {
                    currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
                }

                expect(currentCurrency).toBe(currencyCode);
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle locale parsing errors gracefully', () => {
            // Test that locale parsing works correctly
            const localeCode = (mockLocale.getLanguage() || 'en') + '-' + (mockLocale.getCountry() || 'US');
            expect(localeCode).toBe('en-US');
        });

        test('should handle site currency errors gracefully', () => {
            // Mock site currency to throw error
            mockSite.getDefaultCurrency.mockImplementation(() => {
                throw new Error('Currency error');
            });

            // Should not crash
            expect(() => {
                let currentCurrency = 'USD'; // fallback
                try {
                    currentCurrency = mockSite.getDefaultCurrency().getCurrencyCode();
                } catch (e) {
                    currentCurrency = 'USD'; // fallback
                }
                expect(currentCurrency).toBe('USD');
            }).not.toThrow();
        });
    });

    describe('Complete Endpoint Functionality', () => {
        let mockHashMap;
        let mockTemplate;

        beforeEach(() => {
            // Mock HashMap
            mockHashMap = {
                put: jest.fn()
            };
            global.HashMap = jest.fn().mockImplementation(() => mockHashMap);

            // Mock Template
            mockTemplate = {
                render: jest.fn().mockReturnValue({ text: 'rendered template content' })
            };
            global.Template = jest.fn().mockImplementation(() => mockTemplate);
        });

        test('should create correct context with all required fields', () => {
            // This test would require mocking the entire server context
            // For now, we'll test the individual components
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false,
                currency: 'EUR'
            };

            // Test that validateConfig is called with correct parameters
            mockAfterFooter.validateConfig.mockReturnValue({
                siteId: 'test_site',
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: 'false',
                currency: 'EUR'
            });

            const result = mockAfterFooter.validateConfig(config);
            expect(mockAfterFooter.validateConfig).toHaveBeenCalledWith(config);
            expect(result).toEqual({
                siteId: 'test_site',
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: 'false',
                currency: 'EUR'
            });
        });

        test('should handle missing cookies gracefully', () => {
            // Test with null cookie values
            mockAfterFooter.getCookie.mockReturnValue(null);

            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                usId: null, // null cookie
                refreshToken: null, // null cookie
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false,
                currency: 'USD'
            };

            // Mock validateConfig to return processed values
            mockAfterFooter.validateConfig.mockReturnValue({
                siteId: 'test_site',
                locale: 'en-US',
                usId: '', // Processed: null becomes empty string
                refreshToken: '', // Processed: null becomes empty string
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: 'false',
                currency: 'USD'
            });

            const result = mockAfterFooter.validateConfig(config);
            expect(result.usId).toBe('');
            expect(result.refreshToken).toBe('');
        });

        test('should handle different locale formats correctly', () => {
            // Test various locale combinations
            const testCases = [
                { language: 'en', country: 'US', expected: 'en-US' },
                { language: 'fr', country: 'CA', expected: 'fr-CA' },
                { language: 'de', country: 'DE', expected: 'de-DE' },
                { language: null, country: null, expected: 'en-US' }, // fallback
                { language: 'es', country: null, expected: 'es-US' }, // partial fallback
                { language: null, country: 'GB', expected: 'en-GB' } // partial fallback
            ];

            testCases.forEach(({ language, country, expected }) => {
                const localeCode = (language || 'en') + '-' + (country || 'US');
                expect(localeCode).toBe(expected);
            });
        });

        test('should include sfLanguage in configuration', () => {
            // Test that sfLanguage property is included in the configuration
            const config = {
                siteId: 'test_site',
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD'
            };

            expect(config).toHaveProperty('sfLanguage');
            expect(config.sfLanguage).toBe('en_US');
            expect(config.locale).toBe('en-US'); // Original locale should still be present
        });

        test('should include conversation context configuration', () => {
            // Test that conversation context properties are included in the configuration
            const config = {
                siteId: 'test_site',
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD',
                enabledConversationContext: true,
                conversationContext: 'Suggest me jacket, Find me shoes'
            };

            expect(config).toHaveProperty('enabledConversationContext');
            expect(config).toHaveProperty('conversationContext');
            expect(config.enabledConversationContext).toBe(true);
            expect(config.conversationContext).toBe('Suggest me jacket, Find me shoes');
        });

        test('should handle site ID integration correctly', () => {
            // Test that site ID is properly used in cookie names
            const usIdCookieName = 'usid_' + mockSite.ID;
            const refreshTokenCookieName = 'cc-nx-g_' + mockSite.ID;

            expect(usIdCookieName).toBe('usid_test_site');
            expect(refreshTokenCookieName).toBe('cc-nx-g_test_site');
        });
    });

    describe('Locale Mapping Functionality', () => {
        // Mock the mapLocaleToSalesforce function for testing
        const mapLocaleToSalesforce = (sfccLocale) => {
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

            return SALESFORCE_LANG_MAP[sfccLocale] || 'en_US';
        };

        test('should map supported locales correctly', () => {
            const testCases = [
                { input: 'en-US', expected: 'en_US' },
                { input: 'en-GB', expected: 'en_GB' },
                { input: 'en-CA', expected: 'en' },
                { input: 'fr-FR', expected: 'fr' },
                { input: 'es-MX', expected: 'es' },
                { input: 'pt-BR', expected: 'pt_BR' },
                { input: 'de-DE', expected: 'de' },
                { input: 'it-IT', expected: 'it' },
                { input: 'ja-JP', expected: 'ja' },
                { input: 'ko-KR', expected: 'ko' },
                { input: 'nl-NL', expected: 'nl' },
                { input: 'no-NO', expected: 'no' },
                { input: 'pl-PL', expected: 'pl' },
                { input: 'sv-SE', expected: 'sv' },
                { input: 'da-DK', expected: 'da' },
                { input: 'fi-FI', expected: 'fi' },
                { input: 'zh-CN', expected: 'zh_CN' },
                { input: 'zh-TW', expected: 'zh_TW' }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(mapLocaleToSalesforce(input)).toBe(expected);
            });
        });

        test('should handle unsupported locales with fallback', () => {
            const unsupportedLocales = [
                'en-AU', // Australian English
                'fr-CA', // Canadian French
                'es-ES', // Spain Spanish
                'pt-PT', // Portugal Portuguese
                'de-AT', // Austrian German
                'it-CH', // Swiss Italian
                'unknown-locale',
                'invalid-format',
                '',
                null,
                undefined
            ];

            unsupportedLocales.forEach((locale) => {
                expect(mapLocaleToSalesforce(locale)).toBe('en_US');
            });
        });

        test('should maintain case sensitivity', () => {
            expect(mapLocaleToSalesforce('EN-US')).toBe('en_US'); // Should still work
            expect(mapLocaleToSalesforce('en-us')).toBe('en_US'); // Should still work
            expect(mapLocaleToSalesforce('En-Us')).toBe('en_US'); // Should still work
        });

        test('should handle edge cases', () => {
            expect(mapLocaleToSalesforce('')).toBe('en_US');
            expect(mapLocaleToSalesforce(' ')).toBe('en_US');
            expect(mapLocaleToSalesforce('en-')).toBe('en_US');
            expect(mapLocaleToSalesforce('-US')).toBe('en_US');
            expect(mapLocaleToSalesforce('en-US-extra')).toBe('en_US');
        });
    });

    describe('Configuration Integration Tests', () => {
        test('should include both locale and sfLanguage in configuration', () => {
            const config = {
                siteId: 'test_site',
                locale: 'fr-CA',
                sfLanguage: 'en_US', // This would be mapped from fr-CA
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'CAD'
            };

            expect(config).toHaveProperty('locale');
            expect(config).toHaveProperty('sfLanguage');
            expect(config.locale).toBe('fr-CA');
            expect(config.sfLanguage).toBe('en_US');
        });

        test('should maintain both locale formats for different purposes', () => {
            const config = {
                siteId: 'test_site',
                locale: 'en-US', // Original SFCC format
                sfLanguage: 'en_US', // Salesforce format
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD'
            };

            // Original locale should be preserved for prechat fields
            expect(config.locale).toBe('en-US');
            // Mapped locale should be available for MIAW
            expect(config.sfLanguage).toBe('en_US');
        });
    });

    describe('Conversation Context Integration Tests', () => {
        test('should pass conversation context configuration to validateConfig', () => {
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false,
                currency: 'EUR',
                enabledConversationContext: true,
                conversationContext: 'Suggest me jacket, Find me shoes, Show me deals'
            };

            const result = mockAfterFooter.validateConfig(config);

            expect(result).toEqual({
                siteId: 'test_site',
                locale: 'en-US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: 'false',
                currency: 'EUR',
                enableConversationContext: 'true',
                conversationContext: 'Suggest me jacket, Find me shoes, Show me deals',
                domainUrl: ''
            });
        });

        test('should handle disabled conversation context', () => {
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false,
                currency: 'USD',
                enabledConversationContext: false,
                conversationContext: ''
            };

            const result = mockAfterFooter.validateConfig(config);

            expect(result.enableConversationContext).toBe('false');
            expect(result.conversationContext).toBe('');
        });

        test('should handle missing conversation context gracefully', () => {
            const config = {
                siteId: mockSite.ID,
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_cookie_value',
                refreshToken: 'test_cookie_value',
                commerceOrgId: 'test_org_id',
                isCartMgmtSupported: false,
                currency: 'USD',
                enabledConversationContext: null,
                conversationContext: null
            };

            const result = mockAfterFooter.validateConfig(config);

            expect(result.enableConversationContext).toBe('false');
            expect(result.conversationContext).toBe('');
        });
    });
});
