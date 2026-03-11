/* eslint-env jest */
/* eslint-disable no-underscore-dangle, no-unused-expressions */

'use strict';

// Import the mocked modules
const mockSiteModule = require('dw/system/Site');
const mockVelocity = require('dw/template/Velocity');
const mockLogger = require('dw/system/Logger');
const mockISML = require('dw/template/ISML');

describe('afterFooter Hook Tests', () => {
    let mockRequest;
    let mockSite;
    let mockCookies;
    let afterFooterHook;
    let mockScopedLogger;

    beforeEach(() => {
        // Get the scoped logger instance for testing
        mockScopedLogger = mockLogger.getLogger();

        // Mock SFCC global request object
        mockRequest = {
            httpProtocol: 'https',
            httpHost: 'example.com',
            locale: 'en_US',
            getHttpCookies: jest.fn(),
            getLocale: jest.fn().mockReturnValue({
                getLanguage: () => 'en',
                getCountry: () => 'US'
            })
        };

        // Mock cookies
        mockCookies = {
            getCookieCount: jest.fn(),
            0: { getName: () => 'usid_test_site', getValue: () => 'test-user-id' }
        };

        // Mock SFCC Site
        mockSite = {
            ID: 'test_site',
            preferences: {
                custom: {
                    enabledShopperAgentExperience: true,
                    embeddedMIAWDeploymentCodeSnippet: '<script>/* deployment code */</script>',
                    commerceOrgId: 'test_org_id'
                }
            },
            getCustomPreferenceValue: jest.fn()
        };

        // Setup global mocks
        global.request = mockRequest;

        // Set up the Site mock
        mockSiteModule.current = mockSite;

        // Clear all mock function calls
        mockVelocity.render.mockClear();
        mockVelocity.remoteInclude.mockClear();
        mockISML.renderTemplate.mockClear();
        mockLogger.error.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.debug.mockClear();
        mockScopedLogger.error.mockClear();
        mockScopedLogger.warn.mockClear();
        mockScopedLogger.debug.mockClear();

        // Require the module after mocks are set up
        delete require.cache[require.resolve('./afterFooter.js')];
        afterFooterHook = require('./afterFooter.js');
    });

    describe('sanitizeForJS function', () => {
        test('should sanitize single quotes', () => {
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS("It's a test");
            expect(result).toBe("It\\'s a test");
        });

        test('should sanitize double quotes', () => {
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS('Say "Hello"');
            expect(result).toBe('Say \\"Hello\\"');
        });

        test('should sanitize newlines', () => {
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS('Line1\nLine2');
            expect(result).toBe('Line1\\nLine2');
        });

        test('should handle null/undefined values', () => {
            expect(afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS(null)).toBe('');
            expect(afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS(undefined)).toBe('');
        });

        test('should handle non-string values', () => {
            expect(afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS(123)).toBe('');
            expect(afterFooterHook.__testExports && afterFooterHook.__testExports.sanitizeForJS({})).toBe('');
        });
    });

    describe('validateConfig function', () => {
        test('should handle undefined config object', () => {
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig({});
            expect(result).toEqual({
                siteId: '',
                locale: '',
                sfLanguage: '',
                usId: '',
                refreshToken: '',
                commerceOrgId: '',
                isCartMgmtSupported: 'false',
                currency: '',
                enableConversationContext: 'false',
                conversationContext: '',
                domainUrl: '',
                enabledFabEntry: 'false'
            });
        });

        test('should handle config with null values', () => {
            const config = {
                siteId: null,
                locale: null,
                sfLanguage: null,
                usId: null,
                refreshToken: null,
                commerceOrgId: null,
                isCartMgmtSupported: null,
                currency: null,
                enabledConversationContext: null,
                conversationContext: null
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result).toEqual({
                siteId: '',
                locale: '',
                sfLanguage: '',
                usId: '',
                refreshToken: '',
                commerceOrgId: '',
                isCartMgmtSupported: 'false',
                currency: '',
                enableConversationContext: 'false',
                conversationContext: '',
                domainUrl: '',
                enabledFabEntry: 'false'
            });
        });

        test('should handle config with mixed valid and invalid values', () => {
            const config = {
                siteId: 'valid-site',
                locale: 123, // invalid type
                sfLanguage: 'valid-sf-language',
                usId: '', // empty string
                refreshToken: 'valid-refresh-token',
                commerceOrgId: undefined,
                isCartMgmtSupported: 'truthy', // truthy string - should now be false since it's not === true
                currency: 'USD',
                enabledConversationContext: true,
                conversationContext: 'valid context'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result).toEqual({
                siteId: 'valid-site',
                locale: '',
                sfLanguage: 'valid-sf-language',
                usId: '',
                refreshToken: 'valid-refresh-token',
                commerceOrgId: '',
                isCartMgmtSupported: 'false', // Changed: truthy strings are now false since they're not === true
                currency: 'USD',
                enableConversationContext: 'true',
                conversationContext: 'valid context',
                domainUrl: '',
                enabledFabEntry: 'false'
            });
        });

        test('should handle boolean isCartMgmtSupported values correctly', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('true');
        });

        test('should handle false boolean isCartMgmtSupported value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: false,
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle undefined isCartMgmtSupported value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                // isCartMgmtSupported intentionally omitted
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle null isCartMgmtSupported value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: null,
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle string isCartMgmtSupported values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: 'true', // String 'true' should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle numeric isCartMgmtSupported values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: 1, // Truthy number should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle object isCartMgmtSupported values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: {}, // Truthy object should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should handle empty string isCartMgmtSupported values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: '', // Empty string should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.isCartMgmtSupported).toBe('false');
        });

        test('should sanitize refresh token with special characters', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'refresh-token-with"quotes"and\'apostrophes',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.refreshToken).toBe('refresh-token-with\\"quotes\\"and\\\'apostrophes');
        });

        test('should handle currency field correctly', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: 'EUR'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.currency).toBe('EUR');
        });

        test('should handle missing currency field', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true
                // currency field intentionally omitted
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.currency).toBe('');
        });

        test('should handle null currency value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: null
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.currency).toBe('');
        });

        test('should sanitize currency with special characters', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: 'USD"with"quotes'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.currency).toBe('USD\\"with\\"quotes');
        });

        test('should handle boolean enabledFabEntry values correctly', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: true,
                currency: 'USD',
                enabledFabEntry: true
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('true');
        });

        test('should handle false boolean enabledFabEntry value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                isCartMgmtSupported: false,
                currency: 'USD',
                enabledFabEntry: false
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle undefined enabledFabEntry value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle null enabledFabEntry value', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                enabledFabEntry: null,
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle string enabledFabEntry values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                enabledFabEntry: 'true', // String 'true' should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle numeric enabledFabEntry values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                enabledFabEntry: 1, // Truthy number should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle object enabledFabEntry values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                enabledFabEntry: {}, // Truthy object should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle empty string enabledFabEntry values as false', () => {
            const config = {
                siteId: 'test',
                locale: 'en-US',
                usId: 'user123',
                refreshToken: 'token123',
                commerceOrgId: 'org123',
                enabledFabEntry: '', // Empty string should be false since it's not === true
                currency: 'USD'
            };
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);
            expect(result.enabledFabEntry).toBe('false');
        });

        test('should handle sfLanguage property correctly', () => {
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

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);

            expect(result).toHaveProperty('sfLanguage');
            expect(result.sfLanguage).toBe('en_US');
            expect(result.locale).toBe('en-US'); // Original locale should still be present
        });

        test('should handle missing sfLanguage with empty string fallback', () => {
            const config = {
                siteId: 'test_site',
                locale: 'en-US',
                // sfLanguage missing
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);

            expect(result.sfLanguage).toBe('');
        });

        test('should sanitize sfLanguage with special characters', () => {
            const config = {
                siteId: 'test_site',
                locale: 'en-US',
                sfLanguage: "en_US'; alert('xss'); //",
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.validateConfig(config);

            expect(result.sfLanguage).toBe("en_US\\'; alert(\\'xss\\'); //");
        });
    });

    describe('mapLocaleToSalesforce function', () => {
        test('should map supported locales correctly', () => {
            const mapLocaleToSalesforce = afterFooterHook.mapLocaleToSalesforce;

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
            const mapLocaleToSalesforce = afterFooterHook.mapLocaleToSalesforce;

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

        test('should handle edge cases', () => {
            const mapLocaleToSalesforce = afterFooterHook.mapLocaleToSalesforce;

            expect(mapLocaleToSalesforce('')).toBe('en_US');
            expect(mapLocaleToSalesforce(' ')).toBe('en_US');
            expect(mapLocaleToSalesforce('en-')).toBe('en_US');
            expect(mapLocaleToSalesforce('-US')).toBe('en_US');
            expect(mapLocaleToSalesforce('en-US-extra')).toBe('en_US');
        });
    });

    describe('getShopperAgentConfig function', () => {
        beforeEach(() => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                const values = {
                    enabledShopperAgentExperience: true,
                    embeddedMIAWDeploymentCodeSnippet: '<script>/* test */</script>',
                    commerceOrgId: 'test_org'
                };
                return values[key];
            });
        });

        test('should return correct configuration', () => {
            const result =
                afterFooterHook.__testExports && afterFooterHook.__testExports.getShopperAgentConfig(mockSite);
            expect(result).toEqual({
                enabled: true,
                deploymentSnippet: '<script>/* test */</script>',
                commerceOrgId: 'test_org',
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle null site', () => {
            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getShopperAgentConfig(null);
            expect(result).toEqual({
                enabled: false,
                deploymentSnippet: null,
                commerceOrgId: null,
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle site without preferences', () => {
            const siteWithoutPrefs = { ID: 'test' };
            const result =
                afterFooterHook.__testExports && afterFooterHook.__testExports.getShopperAgentConfig(siteWithoutPrefs);
            expect(result).toEqual({
                enabled: false,
                deploymentSnippet: null,
                commerceOrgId: null,
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle site with missing individual preferences', () => {
            const siteWithEmptyPrefs = {
                ID: 'test',
                preferences: {
                    custom: {} // Empty custom preferences
                },
                getCustomPreferenceValue: jest.fn().mockReturnValue(null)
            };

            const result =
                afterFooterHook.__testExports &&
                afterFooterHook.__testExports.getShopperAgentConfig(siteWithEmptyPrefs);
            expect(result).toEqual({
                enabled: false,
                deploymentSnippet: null,
                commerceOrgId: null,
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should return configuration with enabledFabEntry set to true', () => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                const values = {
                    enabledShopperAgentExperience: true,
                    embeddedMIAWDeploymentCodeSnippet: '<script>/* test */</script>',
                    commerceOrgId: 'test_org',
                    enabledShopperAgentFabEntry: true
                };
                return values[key];
            });

            const result =
                afterFooterHook.__testExports && afterFooterHook.__testExports.getShopperAgentConfig(mockSite);
            expect(result).toEqual({
                enabled: true,
                deploymentSnippet: '<script>/* test */</script>',
                commerceOrgId: 'test_org',
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: true
            });
        });
    });

    describe('getCookie function', () => {
        test('should return cookie when found', () => {
            const mockCookie = { getName: () => 'test_cookie', getValue: () => 'test_value', value: 'test_value' };
            mockCookies.getCookieCount.mockReturnValue(1);
            mockCookies[0] = mockCookie;
            mockRequest.getHttpCookies.mockReturnValue(mockCookies);

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCookie('test_cookie');
            expect(result).toBe(mockCookie);
        });

        test('should return refresh token cookie when found', () => {
            const mockRefreshTokenCookie = {
                getName: () => 'cc-nx-g_test_site',
                getValue: () => 'refresh_token_value_123',
                value: 'refresh_token_value_123'
            };
            mockCookies.getCookieCount.mockReturnValue(1);
            mockCookies[0] = mockRefreshTokenCookie;
            mockRequest.getHttpCookies.mockReturnValue(mockCookies);

            const result =
                afterFooterHook.__testExports && afterFooterHook.__testExports.getCookie('cc-nx-g_test_site');
            expect(result).toBe(mockRefreshTokenCookie);
            expect(result.value).toBe('refresh_token_value_123');
        });

        test('should return null when cookie not found', () => {
            mockCookies.getCookieCount.mockReturnValue(1);
            mockCookies[0] = { getName: () => 'other_cookie', getValue: () => 'value', value: 'value' };
            mockRequest.getHttpCookies.mockReturnValue(mockCookies);

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCookie('missing_cookie');
            expect(result).toBe(null);
        });

        test('should handle null cookies', () => {
            mockRequest.getHttpCookies.mockReturnValue(null);

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCookie('test_cookie');
            expect(result).toBeNull();
        });

        test('should handle cookie retrieval error', () => {
            mockRequest.getHttpCookies.mockImplementation(() => {
                throw new Error('Cookie error');
            });

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCookie('test_cookie');
            expect(result).toBeNull();
            expect(mockScopedLogger.error).toHaveBeenCalledWith(
                'Error getting cookie {0}: {1}',
                'test_cookie',
                'Cookie error'
            );
        });
    });

    describe('afterFooter main function', () => {
        beforeEach(() => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                const values = {
                    enabledShopperAgentExperience: true,
                    embeddedMIAWDeploymentCodeSnippet: '<script>/* deployment */</script>',
                    commerceOrgId: 'test_org'
                };
                return values[key];
            });

            const mockUsidCookie = { getName: () => 'usid_test_site', getValue: () => 'user123', value: 'user123' };
            mockCookies.getCookieCount.mockReturnValue(1);
            mockCookies[0] = mockUsidCookie;
            mockRequest.getHttpCookies.mockReturnValue(mockCookies);
        });

        test('should execute successfully with valid configuration', () => {
            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            // Should call remote include for configuration
            expect(mockVelocity.remoteInclude).toHaveBeenCalledWith('ShopperAgent-IncludeHiddenPrechatFields');
            // Velocity should be called for deployment snippet
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
            expect(mockVelocity.render).toHaveBeenCalledWith(
                '<script>/* config */</script> <script>/* deployment */</script>',
                null
            );
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should handle missing site', () => {
            // Temporarily set site to null
            const originalSite = mockSiteModule.current;
            mockSiteModule.current = null;

            afterFooterHook.afterFooter();

            expect(mockScopedLogger.warn).toHaveBeenCalledWith('No current site available for shopper agent');
            expect(mockVelocity.render).not.toHaveBeenCalled();

            // Restore site for subsequent tests
            mockSiteModule.current = originalSite;
        });

        test('should handle disabled shopper agent', () => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return false;
                return null;
            });

            afterFooterHook.afterFooter();

            expect(mockScopedLogger.debug).toHaveBeenCalledWith(
                'Shopper agent not enabled or deployment snippet not configured'
            );
            expect(mockVelocity.render).not.toHaveBeenCalled();
        });

        test('should handle missing deployment snippet', () => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet') return null;
                return 'test_value';
            });

            afterFooterHook.afterFooter();

            expect(mockScopedLogger.debug).toHaveBeenCalledWith(
                'Shopper agent not enabled or deployment snippet not configured'
            );
            expect(mockVelocity.render).not.toHaveBeenCalled();
        });

        test('should handle unexpected errors', () => {
            // Mock a function to throw an error
            mockVelocity.remoteInclude.mockImplementation(() => {
                throw new Error('Velocity.remoteInclude is not a function');
            });

            afterFooterHook.afterFooter();

            expect(mockScopedLogger.error).toHaveBeenCalledWith(
                'Error in afterFooter hook: {0}',
                'Velocity.remoteInclude is not a function'
            );

            // Reset the mock implementation to default
            mockVelocity.remoteInclude.mockImplementation(jest.fn());
        });

        test('should handle missing usid cookie', () => {
            // Ensure site is properly set up
            mockSiteModule.current = mockSite;
            mockRequest.getHttpCookies.mockReturnValue(null);
            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            // Should call remote include for configuration
            expect(mockVelocity.remoteInclude).toHaveBeenCalledWith('ShopperAgent-IncludeHiddenPrechatFields');
            // Should render deployment snippet with Velocity
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
            expect(mockVelocity.render).toHaveBeenCalledWith(
                '<script>/* config */</script> <script>/* deployment */</script>',
                null
            );
        });
    });

    describe('Integration tests', () => {
        beforeEach(() => {
            // Reset site mock for integration tests
            mockSiteModule.current = mockSite;
        });

        test('should handle complete workflow with all valid data', () => {
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                const values = {
                    enabledShopperAgentExperience: true,
                    embeddedMIAWDeploymentCodeSnippet: '<script src="salesforce.com"></script>',
                    commerceOrgId: 'integration_test_org'
                };
                return values[key];
            });

            const mockUsidCookie = {
                getName: () => 'usid_test_site',
                getValue: () => 'integration_user_123',
                value: 'integration_user_123'
            };
            mockCookies.getCookieCount.mockReturnValue(1);
            mockCookies[0] = mockUsidCookie;
            mockRequest.getHttpCookies.mockReturnValue(mockCookies);
            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            // Verify remote include was called for configuration
            expect(mockVelocity.remoteInclude).toHaveBeenCalledWith('ShopperAgent-IncludeHiddenPrechatFields');

            // Verify deployment snippet was rendered with Velocity
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
            expect(mockVelocity.render).toHaveBeenCalledWith(
                '<script>/* config */</script> <script src="salesforce.com"></script>',
                null
            );

            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('Conversation Context Configuration Tests', () => {
        let mockSiteWithConversationContext;

        beforeEach(() => {
            mockSiteWithConversationContext = {
                ID: 'test_site',
                getCustomPreferenceValue: jest.fn()
            };
        });

        test('should return conversation context configuration when enabled', () => {
            mockSiteWithConversationContext.getCustomPreferenceValue
                .mockReturnValueOnce(true) // enabledShopperAgentExperience
                .mockReturnValueOnce('<script>/* deployment code */</script>') // embeddedMIAWDeploymentCodeSnippet
                .mockReturnValueOnce('test_org_id') // commerceOrgId
                .mockReturnValueOnce(true) // enabledConversationContext
                .mockReturnValueOnce('Suggest me jacket, Find me shoes, Show me deals'); // conversationContext

            const result = afterFooterHook.getShopperAgentConfig(mockSiteWithConversationContext);

            expect(result).toEqual({
                enabled: true,
                deploymentSnippet: '<script>/* deployment code */</script>',
                commerceOrgId: 'test_org_id',
                enabledConversationContext: true,
                conversationContext: 'Suggest me jacket, Find me shoes, Show me deals',
                enabledFabEntry: false
            });
        });

        test('should return conversation context configuration when disabled', () => {
            mockSiteWithConversationContext.getCustomPreferenceValue
                .mockReturnValueOnce(true) // enabledShopperAgentExperience
                .mockReturnValueOnce('<script>/* deployment code */</script>') // embeddedMIAWDeploymentCodeSnippet
                .mockReturnValueOnce('test_org_id') // commerceOrgId
                .mockReturnValueOnce(false) // enabledConversationContext
                .mockReturnValueOnce(null); // conversationContext

            const result = afterFooterHook.getShopperAgentConfig(mockSiteWithConversationContext);

            expect(result).toEqual({
                enabled: true,
                deploymentSnippet: '<script>/* deployment code */</script>',
                commerceOrgId: 'test_org_id',
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle missing conversation context configuration', () => {
            mockSiteWithConversationContext.getCustomPreferenceValue
                .mockReturnValueOnce(true) // enabledShopperAgentExperience
                .mockReturnValueOnce('<script>/* deployment code */</script>') // embeddedMIAWDeploymentCodeSnippet
                .mockReturnValueOnce('test_org_id') // commerceOrgId
                .mockReturnValueOnce(null) // enabledConversationContext
                .mockReturnValueOnce(null); // conversationContext

            const result = afterFooterHook.getShopperAgentConfig(mockSiteWithConversationContext);

            expect(result).toEqual({
                enabled: true,
                deploymentSnippet: '<script>/* deployment code */</script>',
                commerceOrgId: 'test_org_id',
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle site errors gracefully for conversation context', () => {
            mockSiteWithConversationContext.getCustomPreferenceValue.mockImplementation(() => {
                throw new Error('Site preference error');
            });

            const result = afterFooterHook.getShopperAgentConfig(mockSiteWithConversationContext);

            expect(result).toEqual({
                enabled: false,
                deploymentSnippet: null,
                commerceOrgId: null,
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });

        test('should handle null site gracefully for conversation context', () => {
            const result = afterFooterHook.getShopperAgentConfig(null);

            expect(result).toEqual({
                enabled: false,
                deploymentSnippet: null,
                commerceOrgId: null,
                enabledConversationContext: false,
                conversationContext: null,
                enabledFabEntry: false
            });
        });
    });

    describe('processDeploymentSnippet Tests', () => {
        test('should overwrite existing language value with sfLanguage (with window prefix)', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.language = 'en_US';";
            const sfLanguage = 'fr';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe("window.embeddedservice_bootstrap.settings.language = 'fr';");
        });

        test('should overwrite existing language value with sfLanguage (without window prefix)', () => {
            const snippet =
                "embeddedservice_bootstrap.settings.language = 'en_US'; // For example, enter 'en' or 'en-US'";
            const sfLanguage = 'fr';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe(
                "embeddedservice_bootstrap.settings.language = 'fr'; // For example, enter 'en' or 'en-US'"
            );
        });

        test('should handle double quotes in language setting', () => {
            const snippet = 'window.embeddedservice_bootstrap.settings.language = "en_US";';
            const sfLanguage = 'de';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe("window.embeddedservice_bootstrap.settings.language = 'de';");
        });

        test('should handle different spacing around equals sign', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.language='en_US';";
            const sfLanguage = 'es';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe("window.embeddedservice_bootstrap.settings.language = 'es';");
        });

        test('should handle multiple language settings (replace all)', () => {
            const snippet =
                "window.embeddedservice_bootstrap.settings.language = 'en_US'; window.embeddedservice_bootstrap.settings.language = 'en_US';";
            const sfLanguage = 'fr';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe(
                "window.embeddedservice_bootstrap.settings.language = 'fr'; window.embeddedservice_bootstrap.settings.language = 'fr';"
            );
        });

        test('should return original snippet if sfLanguage is null', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.language = 'en_US';";
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, null);

            expect(result).toBe(snippet);
        });

        test('should return original snippet if snippet is null', () => {
            const sfLanguage = 'en_US';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(null, sfLanguage);

            expect(result).toBe(null);
        });

        test('should return original snippet if sfLanguage is empty string', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.language = 'en_US';";
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, '');

            expect(result).toBe(snippet);
        });

        test('should return original snippet if snippet is empty string', () => {
            const sfLanguage = 'en_US';
            const result = afterFooterHook.__testExports.processDeploymentSnippet('', sfLanguage);

            expect(result).toBe('');
        });

        test('should return original snippet if inputs are not strings', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.language = 'en_US';";
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, 123);

            expect(result).toBe(snippet);
        });

        test('should return original snippet if no language setting found', () => {
            const snippet = "window.embeddedservice_bootstrap.settings.otherSetting = 'value';";
            const sfLanguage = 'fr';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe(snippet);
        });

        test('should handle empty string snippet', () => {
            const snippet = '';
            const sfLanguage = 'en_US';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe('');
        });

        test('should handle complex deployment snippet with multiple settings', () => {
            const snippet = `
                window.embeddedservice_bootstrap.settings.language = 'en_US';
                window.embeddedservice_bootstrap.settings.otherSetting = 'some_value';
                window.embeddedservice_bootstrap.init();
            `;
            const sfLanguage = 'de';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toContain("window.embeddedservice_bootstrap.settings.language = 'de';");
            expect(result).toContain("window.embeddedservice_bootstrap.settings.otherSetting = 'some_value';");
        });

        test('should handle real-world deployment snippet format', () => {
            const snippet = `
                (function() {
                    window.embeddedservice_bootstrap.settings.language = 'en_US';
                    window.embeddedservice_bootstrap.settings.disableStreamingResponses = true;
                    window.embeddedservice_bootstrap.init();
                })();
            `;
            const sfLanguage = 'ja';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toContain("window.embeddedservice_bootstrap.settings.language = 'ja';");
            expect(result).toContain('window.embeddedservice_bootstrap.settings.disableStreamingResponses = true;');
        });

        test('should handle actual deployment snippet format without window prefix', () => {
            const snippet = `
                embeddedservice_bootstrap.settings.language = 'en_US'; // For example, enter 'en' or 'en-US'
                embeddedservice_bootstrap.settings.disableStreamingResponses = true;
                embeddedservice_bootstrap.init();
            `;
            const sfLanguage = 'de';
            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toContain(
                "embeddedservice_bootstrap.settings.language = 'de'; // For example, enter 'en' or 'en-US'"
            );
            expect(result).toContain('embeddedservice_bootstrap.settings.disableStreamingResponses = true;');
        });
    });

    describe('Conversation Context Validation Tests', () => {
        test('should validate conversation context configuration correctly', () => {
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

            const result = afterFooterHook.validateConfig(config);

            expect(result).toEqual({
                siteId: 'test_site',
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: 'false',
                currency: 'USD',
                enableConversationContext: 'true',
                conversationContext: 'Suggest me jacket, Find me shoes',
                domainUrl: '',
                enabledFabEntry: 'false'
            });
        });

        test('should handle disabled conversation context in validation', () => {
            const config = {
                siteId: 'test_site',
                locale: 'en-US',
                sfLanguage: 'en_US',
                usId: 'test_usid',
                refreshToken: 'test_token',
                commerceOrgId: 'test_org',
                isCartMgmtSupported: false,
                currency: 'USD',
                enabledConversationContext: false,
                conversationContext: ''
            };

            const result = afterFooterHook.validateConfig(config);

            expect(result.enableConversationContext).toBe('false');
            expect(result.conversationContext).toBe('');
        });

        test('should sanitize conversation context input', () => {
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
                conversationContext: '  Suggest me jacket  ,  Find me shoes  ,  Show me deals  '
            };

            const result = afterFooterHook.validateConfig(config);

            expect(result.conversationContext).toBe('  Suggest me jacket  ,  Find me shoes  ,  Show me deals  ');
        });
    });

    describe('getCurrentDomainUrl function', () => {
        beforeEach(() => {
            // Reset Site mock for each test
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('test-site.com');
            mockSite.getHttpHostName = jest.fn().mockReturnValue('test-site.com');
        });

        test('should return domain URL from global request object with https', () => {
            // Mock the global request object
            global.request = {
                httpProtocol: 'https',
                httpHost: 'example.com'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should return domain URL from global request object with http', () => {
            // Mock request with http protocol
            global.request = {
                httpProtocol: 'http',
                httpHost: 'example.com'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('http://example.com');
        });

        test('should default to https when protocol is not specified', () => {
            // Mock request without protocol
            global.request = {
                httpHost: 'example.com'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should fallback to Site configuration when request object is not available', () => {
            // Mock request without httpHost
            global.request = {
                httpProtocol: 'https'
                // httpHost is missing
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should fallback to Site configuration when request object is null', () => {
            // Mock null request
            global.request = null;

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should handle empty host values and fallback to Site', () => {
            // Mock request with empty host
            global.request = {
                httpProtocol: 'https',
                httpHost: ''
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should handle invalid host values and fallback to Site', () => {
            // Mock request with invalid host
            global.request = {
                httpProtocol: 'https',
                httpHost: '   ' // whitespace only
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should handle errors gracefully and fallback to Site', () => {
            // Mock request that throws error
            global.request = {
                httpHost: jest.fn().mockImplementation(() => {
                    throw new Error('Test error');
                })
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should return empty string when all methods fail', () => {
            // Mock request and site that both fail
            global.request = null;
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('');
            mockSite.getHttpHostName = jest.fn().mockReturnValue('');

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('');
        });

        test('should handle Site configuration with existing protocol', () => {
            // Mock Site with URL that already has protocol
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('https://test-site.com');
            global.request = null;

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        test('should add https protocol to Site configuration when missing', () => {
            // Mock Site with URL without protocol
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('test-site.com');
            global.request = null;

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://test-site.com');
        });

        // Tests for httpPath functionality (primary path logic)
        test('should use request.httpPath when available (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/on/demandware.store/Sites-RefArchGlobal-Site/zh_CN/Default-Start'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com/on/demandware.store/Sites-RefArchGlobal-Site/zh_CN');
        });

        test('should use request.httpPath with http protocol (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'http',
                httpPath: '/on/demandware.store/Sites-RefArchGlobal-Site/en_US/Default-Start'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('http://example.com/on/demandware.store/Sites-RefArchGlobal-Site/en_US');
        });

        test('should use request.httpPath with different locale (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/on/demandware.store/Sites-RefArchGlobal-Site/fr_FR/Default-Start'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com/on/demandware.store/Sites-RefArchGlobal-Site/fr_FR');
        });

        test('should use request.httpPath with custom site (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/on/demandware.store/Sites-CustomSite-Site/de_DE/Default-Start'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com/on/demandware.store/Sites-CustomSite-Site/de_DE');
        });

        test('should handle empty httpPath and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: ''
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle null httpPath and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: null
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle undefined httpPath and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https'
                // httpPath is missing
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle non-string httpPath and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: 123 // non-string value
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should use httpPath when available (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/on/demandware.store/Sites-RealSite-Site/ja_JP/Default-Start'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            // Should use the real httpPath with last segment removed
            expect(result).toBe('https://example.com/on/demandware.store/Sites-RealSite-Site/ja_JP');
        });

        test('should handle null siteId and return just domain', () => {
            // Mock site with null ID
            mockSite.ID = null;
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https'
                // httpPath is missing
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle undefined siteId and return just domain', () => {
            // Mock site with undefined ID
            mockSite.ID = undefined;
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https'
                // httpPath is missing
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle single segment path and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/single-segment'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle root path and return just domain', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com');
        });

        test('should handle path with multiple segments (removing last segment)', () => {
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https',
                httpPath: '/path/to/some/deep/nested/resource'
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();
            expect(result).toBe('https://example.com/path/to/some/deep/nested');
        });

        test('should handle exception during domain URL retrieval and log warning', () => {
            // Mock request that throws an error during processing
            global.request = {
                get httpHost() {
                    throw new Error('Network error');
                },
                httpProtocol: 'https'
            };
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('');
            mockSite.getHttpHostName = jest.fn().mockReturnValue('');

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();

            expect(result).toBe('');
            expect(mockScopedLogger.warn).toHaveBeenCalledWith(
                'Shopper Agent: Error getting domain URL: {0}',
                'Network error'
            );
        });

        test('should handle when Site.current is null (line 105)', () => {
            // Mock request without httpHost to trigger Site fallback
            global.request = {
                httpProtocol: 'https'
            };

            // Set Site.current to null to test line 105
            const originalSite = mockSiteModule.current;
            mockSiteModule.current = null;

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();

            expect(result).toBe('');

            // Restore site
            mockSiteModule.current = originalSite;
        });

        test('should handle empty domain URL after trim (line 109)', () => {
            // Mock request without httpHost to trigger Site fallback
            global.request = {
                httpProtocol: 'https'
            };

            // Mock Site with domain URL that becomes empty after trim
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('   ');
            mockSite.getHttpHostName = jest.fn().mockReturnValue('');

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();

            expect(result).toBe('');
        });

        test('should handle malformed URL with protocol but no host (line 113)', () => {
            // Mock request without httpHost to trigger Site fallback
            global.request = {
                httpProtocol: 'https'
            };

            // Mock Site with URL that has protocol but malformed host part
            mockSite.getHttpsHostName = jest.fn().mockReturnValue('http://');
            mockSite.getHttpHostName = jest.fn().mockReturnValue('');

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentDomainUrl();

            // Should return empty string since urlParts[1] would be empty
            expect(result).toBe('');
        });
    });

    describe('getCurrentSfLanguage edge cases', () => {
        test('should handle string locale from request.getLocale()', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue('en_US') // String instead of object
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();
            expect(result).toBe('en_US');
        });

        test('should handle error during locale detection and log warning', () => {
            global.request = {
                getLocale: jest.fn().mockImplementation(() => {
                    throw new Error('Locale error');
                })
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            expect(result).toBe('en_US');
            expect(mockScopedLogger.warn).toHaveBeenCalledWith(
                'Shopper Agent: Error getting current locale: {0}',
                'Locale error'
            );
        });

        test('should handle null from getLocale and use fallback', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue(null)
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            expect(result).toBe('en_US');
            expect(mockScopedLogger.debug).toHaveBeenCalledWith(
                'Shopper Agent: Locale detection failed, using fallback'
            );
        });

        test('should handle locale object with getID method', () => {
            const mockLocaleObj = {
                getID: jest.fn().mockReturnValue('de_DE')
            };

            global.request = {
                getLocale: jest.fn().mockReturnValue(mockLocaleObj)
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            expect(mockLocaleObj.getID).toHaveBeenCalled();
            // The updated Locale mock now parses de_DE correctly
            expect(result).toBe('de');
        });

        test('should handle missing request.getLocale method (line 157)', () => {
            // Mock request without getLocale method
            global.request = {
                httpHost: 'example.com',
                httpProtocol: 'https'
                // no getLocale method
            };

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            // Should return fallback value
            expect(result).toBe('en_US');
            expect(mockScopedLogger.debug).toHaveBeenCalledWith(
                'Shopper Agent: Locale detection failed, using fallback'
            );
        });

        test('should handle null language from locale (line 173)', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue('test_locale')
            };

            // Mock Locale.getLocale to return an object with null language
            const mockLocale = require('dw/util/Locale');
            const originalGetLocale = mockLocale.getLocale;
            mockLocale.getLocale = jest.fn().mockReturnValue({
                getLanguage: () => null,
                getCountry: () => 'US'
            });

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            // Should use 'en' as fallback for null language
            expect(result).toBe('en_US');

            // Restore original
            mockLocale.getLocale = originalGetLocale;
        });

        test('should handle null country from locale (line 173)', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue('test_locale')
            };

            // Mock Locale.getLocale to return an object with null country
            const mockLocale = require('dw/util/Locale');
            const originalGetLocale = mockLocale.getLocale;
            mockLocale.getLocale = jest.fn().mockReturnValue({
                getLanguage: () => 'fr',
                getCountry: () => null
            });

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            // Should use 'US' as fallback for null country, creating 'fr-US' which maps to 'fr'
            // But since fr-US is not in the locale map, it falls back to en_US
            expect(result).toBe('en_US');

            // Restore original
            mockLocale.getLocale = originalGetLocale;
        });

        test('should handle null localeCode after construction (line 175)', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue('test_locale')
            };

            // Mock Locale.getLocale to return an object that produces null localeCode
            const mockLocale = require('dw/util/Locale');
            const originalGetLocale = mockLocale.getLocale;
            mockLocale.getLocale = jest.fn().mockReturnValue({
                getLanguage: () => undefined,
                getCountry: () => undefined
            });

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            // Should return fallback when localeCode is falsy
            expect(result).toBe('en_US');

            // Restore original
            mockLocale.getLocale = originalGetLocale;
        });

        test('should handle empty string localeCode (line 175 - falsy check)', () => {
            global.request = {
                getLocale: jest.fn().mockReturnValue('test_locale')
            };

            // Mock Locale.getLocale to return an object that produces empty string localeCode
            const mockLocale = require('dw/util/Locale');
            const originalGetLocale = mockLocale.getLocale;
            mockLocale.getLocale = jest.fn().mockReturnValue({
                getLanguage: () => '',
                getCountry: () => ''
            });

            const result = afterFooterHook.__testExports && afterFooterHook.__testExports.getCurrentSfLanguage();

            // Should return en_US when localeCode is '-' (falsy-like)
            expect(result).toBe('en_US');

            // Restore original
            mockLocale.getLocale = originalGetLocale;
        });
    });

    describe('processDeploymentSnippet edge cases', () => {
        test('should handle error during regex processing and log warning', () => {
            // Create a snippet that will cause the regex to fail
            const snippet = "embeddedservice_bootstrap.settings.language = 'en_US';";
            const sfLanguage = 'fr';

            // Mock String.prototype.replace to throw an error
            const originalReplace = String.prototype.replace;
            // eslint-disable-next-line no-extend-native
            String.prototype.replace = jest.fn().mockImplementation(() => {
                throw new Error('Regex error');
            });

            const result = afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            expect(result).toBe(snippet);
            expect(mockScopedLogger.warn).toHaveBeenCalledWith(
                'Shopper Agent: Error processing deployment snippet: {0}',
                'Regex error'
            );

            // Restore original replace
            // eslint-disable-next-line no-extend-native
            String.prototype.replace = originalReplace;
        });

        test('should log when no replacement occurs (snippet unchanged)', () => {
            const snippet = "embeddedservice_bootstrap.settings.language = 'fr';";
            const sfLanguage = 'fr'; // Same as existing value

            afterFooterHook.__testExports.processDeploymentSnippet(snippet, sfLanguage);

            // The snippet might be modified or not, but debug logging should occur
            expect(mockScopedLogger.debug).toHaveBeenCalled();
        });
    });

    describe('afterFooter with MarkupText deployment snippet', () => {
        test('should handle MarkupText object and convert to string', () => {
            // Mock a MarkupText-like object with toString method
            const markupTextSnippet = {
                toString: jest.fn().mockReturnValue("embeddedservice_bootstrap.settings.language = 'en_US';")
            };

            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet') return markupTextSnippet;
                if (key === 'commerceOrgId') return 'test_org';
                return null;
            });

            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            expect(markupTextSnippet.toString).toHaveBeenCalled();
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
        });

        test('should handle language enhancement failure and use original snippet', () => {
            // Mock site preferences
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet') return '<script>/* deployment */</script>';
                if (key === 'commerceOrgId') return 'test_org';
                return null;
            });

            // Mock getCurrentSfLanguage to throw an error
            global.request = {
                getLocale: jest.fn().mockImplementation(() => {
                    throw new Error('Locale processing failed');
                })
            };

            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            // Should still render with original snippet
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
            expect(mockScopedLogger.warn).toHaveBeenCalled();
        });

        test('should log when snippet is successfully modified (line 351)', () => {
            // Mock site with a snippet that contains language setting
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet')
                    return "embeddedservice_bootstrap.settings.language = 'en_US';";
                if (key === 'commerceOrgId') return 'test_org';
                return null;
            });

            // Mock request to return fr_FR locale string (this path works with our mocks)
            global.request = {
                getLocale: jest.fn().mockReturnValue({
                    getID: () => 'fr_FR'
                })
            };

            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            // Clear previous debug calls
            mockScopedLogger.debug.mockClear();

            afterFooterHook.afterFooter();

            // Check that the debug log for successful modification was called
            // The snippet should be modified since we're changing from en_US to fr
            expect(mockScopedLogger.debug).toHaveBeenCalledWith(
                'Shopper Agent: Debug - snippet was successfully modified'
            );
            expect(mockVelocity.render).toHaveBeenCalledTimes(1);
        });

        test('should log when language enhancement is skipped - no snippet (lines 358-362)', () => {
            // Mock site without deployment snippet (null)
            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet') return null; // No snippet
                if (key === 'commerceOrgId') return 'test_org';
                return null;
            });

            // Mock request with valid locale
            global.request = {
                getLocale: jest.fn().mockReturnValue({
                    getLanguage: () => 'en',
                    getCountry: () => 'US'
                })
            };

            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            afterFooterHook.afterFooter();

            // Should not render anything since there's no snippet
            expect(mockVelocity.render).not.toHaveBeenCalled();
        });

        test('should handle exception in language enhancement and log warning (line 357)', () => {
            // Mock site with a problematic snippet object
            const mockBadSnippet = {
                toString: jest.fn().mockImplementation(() => {
                    throw new Error('toString failed');
                })
            };

            mockSite.getCustomPreferenceValue.mockImplementation((key) => {
                if (key === 'enabledShopperAgentExperience') return true;
                if (key === 'embeddedMIAWDeploymentCodeSnippet') return mockBadSnippet;
                if (key === 'commerceOrgId') return 'test_org';
                return null;
            });

            global.request = {
                getLocale: jest.fn().mockReturnValue('en_US')
            };

            mockVelocity.remoteInclude.mockReturnValue('<script>/* config */</script>');

            // Clear previous calls
            mockScopedLogger.warn.mockClear();

            afterFooterHook.afterFooter();

            // Should log the warning for language enhancement failure
            expect(mockScopedLogger.warn).toHaveBeenCalledWith(
                'Shopper Agent: Language enhancement failed, using original snippet: {0}',
                'toString failed'
            );
        });
    });
});
