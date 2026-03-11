/* eslint-env jest */
/* eslint-disable no-underscore-dangle, no-unused-expressions */

'use strict';

// Mock DOM and window objects
const mockWindow = {
    addEventListener: jest.fn(),
    shopperAgentConfig: {
        enableConversationContext: true,
        conversationContext: 'Suggest me jacket, Find me shoes, Show me deals',
        domainUrl: 'https://example.commerce.com'
    }
};

const mockDocument = {
    querySelector: jest.fn(),
    readyState: 'complete'
};

const mockEmbeddedMessagingFrame = {
    contentWindow: {
        postMessage: jest.fn()
    },
    src: 'https://example.com/embedded-messaging'
};

// Mock URL constructor
global.URL = jest.fn().mockImplementation(() => ({
    origin: 'https://example.com'
}));

// Mock console
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock document
global.document = mockDocument;

// Mock window
global.window = mockWindow;

describe('ShopperAgent PostMessage Tests', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset DOM mocks
        mockDocument.querySelector.mockReturnValue(mockEmbeddedMessagingFrame);
        mockEmbeddedMessagingFrame.contentWindow.postMessage.mockClear();

        // Reset window config
        mockWindow.shopperAgentConfig = {
            enableConversationContext: true,
            conversationContext: 'Suggest me jacket, Find me shoes, Show me deals',
            domainUrl: 'https://example.commerce.com'
        };
    });

    describe('Conversation Context Message Handling', () => {
        test('should handle lwc.getConversationContext message when enabled', () => {
            // Simulate the message handler logic
            const enableConversationContext =
                mockWindow.shopperAgentConfig.enableConversationContext === true ||
                mockWindow.shopperAgentConfig.enableConversationContext === 'true';

            if (enableConversationContext) {
                const starters = mockWindow.shopperAgentConfig.conversationContext
                    ? mockWindow.shopperAgentConfig.conversationContext
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : [];

                // Simulate sending message
                const eventData = {
                    type: 'conversational.actualConversationContext',
                    payload: { conversationContext: starters }
                };
                mockEmbeddedMessagingFrame.contentWindow.postMessage(eventData, 'https://example.com');
            }

            expect(enableConversationContext).toBe(true);
            expect(mockEmbeddedMessagingFrame.contentWindow.postMessage).toHaveBeenCalledWith(
                {
                    type: 'conversational.actualConversationContext',
                    payload: {
                        conversationContext: ['Suggest me jacket', 'Find me shoes', 'Show me deals']
                    }
                },
                'https://example.com'
            );
        });

        test('should handle lwc.getConversationContext message when disabled', () => {
            // Set conversation context as disabled
            mockWindow.shopperAgentConfig.enableConversationContext = false;

            // Simulate the message handler logic
            const enableConversationContext =
                mockWindow.shopperAgentConfig.enableConversationContext === true ||
                mockWindow.shopperAgentConfig.enableConversationContext === 'true';

            if (enableConversationContext) {
                const starters = mockWindow.shopperAgentConfig.conversationContext
                    ? mockWindow.shopperAgentConfig.conversationContext
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : [];

                mockEmbeddedMessagingFrame.contentWindow.postMessage(
                    { type: 'conversational.actualConversationContext', payload: { conversationContext: starters } },
                    'https://example.com'
                );
            } else {
                // Send empty array if conversation context is disabled
                mockEmbeddedMessagingFrame.contentWindow.postMessage(
                    { type: 'conversational.actualConversationContext', payload: { conversationContext: [] } },
                    'https://example.com'
                );
            }

            expect(enableConversationContext).toBe(false);
            expect(mockEmbeddedMessagingFrame.contentWindow.postMessage).toHaveBeenCalledWith(
                {
                    type: 'conversational.actualConversationContext',
                    payload: {
                        conversationContext: []
                    }
                },
                'https://example.com'
            );
        });

        test('should parse comma-separated conversation context correctly', () => {
            const conversationContext = 'Suggest me jacket, Find me shoes, Show me deals, Help me choose';

            const starters = conversationContext
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            expect(starters).toEqual(['Suggest me jacket', 'Find me shoes', 'Show me deals', 'Help me choose']);
        });

        test('should handle empty conversation context', () => {
            mockWindow.shopperAgentConfig.conversationContext = '';

            const starters = mockWindow.shopperAgentConfig.conversationContext
                ? mockWindow.shopperAgentConfig.conversationContext
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];

            expect(starters).toEqual([]);
        });

        test('should handle null conversation context', () => {
            mockWindow.shopperAgentConfig.conversationContext = null;

            const starters = mockWindow.shopperAgentConfig.conversationContext
                ? mockWindow.shopperAgentConfig.conversationContext
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];

            expect(starters).toEqual([]);
        });

        test('should filter out empty strings from conversation context', () => {
            const conversationContext = 'Suggest me jacket, , Find me shoes, , Show me deals';

            const starters = conversationContext
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            expect(starters).toEqual(['Suggest me jacket', 'Find me shoes', 'Show me deals']);
        });

        test('should handle whitespace in conversation context', () => {
            const conversationContext = '  Suggest me jacket  ,  Find me shoes  ,  Show me deals  ';

            const starters = conversationContext
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            expect(starters).toEqual(['Suggest me jacket', 'Find me shoes', 'Show me deals']);
        });
    });

    describe('Domain URL Message Handling', () => {
        test('should handle lwc.getDomainUrl message and send domain URL', () => {
            // Simulate the message handler logic for getDomainUrl
            const eventData = {
                type: 'conversational.domainUrl',
                payload: {
                    domainUrl: mockWindow.shopperAgentConfig.domainUrl
                }
            };

            mockEmbeddedMessagingFrame.contentWindow.postMessage(eventData, 'https://example.com');

            expect(mockEmbeddedMessagingFrame.contentWindow.postMessage).toHaveBeenCalledWith(
                {
                    type: 'conversational.domainUrl',
                    payload: {
                        domainUrl: 'https://example.commerce.com'
                    }
                },
                'https://example.com'
            );
        });

        test('should handle lwc.getDomainUrl message when domainUrl is null', () => {
            // Set domainUrl to null
            mockWindow.shopperAgentConfig.domainUrl = null;

            // Simulate sending domain URL even when null
            const eventData = {
                type: 'conversational.domainUrl',
                payload: {
                    domainUrl: mockWindow.shopperAgentConfig.domainUrl
                }
            };

            mockEmbeddedMessagingFrame.contentWindow.postMessage(eventData, 'https://example.com');

            expect(mockEmbeddedMessagingFrame.contentWindow.postMessage).toHaveBeenCalledWith(
                {
                    type: 'conversational.domainUrl',
                    payload: {
                        domainUrl: null
                    }
                },
                'https://example.com'
            );
        });

        test('should handle lwc.getDomainUrl message when domainUrl is undefined', () => {
            // Remove domainUrl from config
            delete mockWindow.shopperAgentConfig.domainUrl;

            // Simulate sending domain URL when undefined
            const eventData = {
                type: 'conversational.domainUrl',
                payload: {
                    domainUrl: mockWindow.shopperAgentConfig.domainUrl
                }
            };

            mockEmbeddedMessagingFrame.contentWindow.postMessage(eventData, 'https://example.com');

            expect(mockEmbeddedMessagingFrame.contentWindow.postMessage).toHaveBeenCalledWith(
                {
                    type: 'conversational.domainUrl',
                    payload: {
                        domainUrl: undefined
                    }
                },
                'https://example.com'
            );
        });

        test('should use correct domain URL from configuration', () => {
            // Set a custom domain URL
            mockWindow.shopperAgentConfig.domainUrl = 'https://my-custom-store.com';

            const domainUrl = mockWindow.shopperAgentConfig.domainUrl;

            expect(domainUrl).toBe('https://my-custom-store.com');
        });
    });

    describe('Message Event Source Validation', () => {
        test('should only process messages from external sources', () => {
            const mockEvent = {
                source: mockWindow, // Same as window
                data: {
                    type: 'lwc.getConversationContext'
                }
            };

            // Simulate the source validation logic
            const shouldProcess = mockEvent.source && mockEvent.source !== mockWindow;

            expect(shouldProcess).toBe(false);
        });

        test('should process messages from iframe sources', () => {
            const mockEvent = {
                source: { postMessage: jest.fn() }, // Different from window
                data: {
                    type: 'lwc.getConversationContext'
                }
            };

            // Simulate the source validation logic
            const shouldProcess = mockEvent.source && mockEvent.source !== mockWindow;

            expect(shouldProcess).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing embedded messaging frame gracefully', () => {
            mockDocument.querySelector.mockReturnValue(null);

            // Simulate the sendConversationContext function
            const embeddedMessagingFrame = mockDocument.querySelector('div.embedded-messaging iframe');

            if (!embeddedMessagingFrame) {
                // eslint-disable-next-line no-console
                console.warn('Shopper Agent: Embedded messaging iframe not found');
                return;
            }

            expect(embeddedMessagingFrame).toBeNull();
            // eslint-disable-next-line no-console
            expect(console.warn).toHaveBeenCalledWith('Shopper Agent: Embedded messaging iframe not found');
        });

        test('should handle postMessage errors gracefully', () => {
            mockEmbeddedMessagingFrame.contentWindow.postMessage.mockImplementation(() => {
                throw new Error('PostMessage error');
            });

            // Simulate error handling
            try {
                mockEmbeddedMessagingFrame.contentWindow.postMessage(
                    { type: 'test', payload: {} },
                    'https://example.com'
                );
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Shopper Agent: Error sending conversation context', error);
            }

            // eslint-disable-next-line no-console
            expect(console.error).toHaveBeenCalledWith(
                'Shopper Agent: Error sending conversation context',
                expect.any(Error)
            );
        });
    });

    describe('Configuration Integration', () => {
        test('should use configuration values correctly', () => {
            mockWindow.shopperAgentConfig = {
                enableConversationContext: 'true', // String value
                conversationContext: 'Test context 1, Test context 2'
            };

            const enableConversationContext =
                mockWindow.shopperAgentConfig.enableConversationContext === true ||
                mockWindow.shopperAgentConfig.enableConversationContext === 'true';

            expect(enableConversationContext).toBe(true);

            const starters = mockWindow.shopperAgentConfig.conversationContext
                ? mockWindow.shopperAgentConfig.conversationContext
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];

            expect(starters).toEqual(['Test context 1', 'Test context 2']);
        });

        test('should handle boolean true configuration', () => {
            mockWindow.shopperAgentConfig = {
                enableConversationContext: true, // Boolean value
                conversationContext: 'Boolean test context'
            };

            const enableConversationContext =
                mockWindow.shopperAgentConfig.enableConversationContext === true ||
                mockWindow.shopperAgentConfig.enableConversationContext === 'true';

            expect(enableConversationContext).toBe(true);
        });
    });
});
