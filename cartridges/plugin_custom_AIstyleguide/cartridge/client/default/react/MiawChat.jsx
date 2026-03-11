import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaSignOutAlt, FaAngleLeft, FaAngleRight, FaMicrophone, FaStop } from 'react-icons/fa';
import './MiawChat.css';

const MiawChat = () => {
    const [accessToken, setAccessToken] = useState(null);
    const [error, setError] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [sseReader, setSSEReader] = useState(null);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isSpeechMode, setIsSpeechMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [pendingSpeechMessage, setPendingSpeechMessage] = useState(null);
    const carouselRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthRef = useRef(null);
    
    const speechModeRef = useRef(false);

    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
    const sseEndpoint = process.env.REACT_APP_SSE_URL;
    const orgId = process.env.REACT_APP_ORG_ID;
    const esDeveloperName = process.env.REACT_APP_SVC_DEPLOYMENT;

    useEffect(() => {
        const initializeChat = async () => {
            try {
                if (!accessToken) {
                    await fetchAccessToken();
                } else {
                    await startSSE();
                }
            } catch (err) {
                setError('Initialization failed.');
            }
        };
        initializeChat();
    }, [accessToken]);

    // Removed auto-start - user manually activates voice mode with button

    // Auto-send message when speech input is received
    useEffect(() => {
        if (pendingSpeechMessage && isSpeechMode && conversationId && accessToken) {
            const sendSpeechMessage = async () => {
                const tempId = uuidv4();
                const text = pendingSpeechMessage;

                // Clear pending message and input text
                setPendingSpeechMessage(null);
                setInputText('');

                // 1. Show user message
                setMessages(prev => [...prev, {
                    id: tempId,
                    role: 'EndUser',
                    text: <span>{text}</span>
                }]);

                // 2. Send to API
                try {
                    await fetch(`${apiBaseUrl}/conversation/${conversationId}/message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({
                            message: {
                                id: tempId,
                                messageType: 'StaticContentMessage',
                                staticContent: { formatType: 'Text', text: text },
                            },
                            esDeveloperName: esDeveloperName,
                        }),
                    });
                } catch (err) {
                    setError(err.message);
                }
            };

            sendSpeechMessage();
        }
    }, [pendingSpeechMessage, isSpeechMode, conversationId, accessToken, apiBaseUrl, esDeveloperName]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.maxAlternatives = 1;

            recognitionRef.current.onresult = (event) => {
                const lastResultIndex = event.results.length - 1;
                const result = event.results[lastResultIndex];
                const transcript = result[0].transcript;

                // Always update input text to show what's being heard
                setInputText(transcript);

                // Only process final results in speech mode
                if (result.isFinal && speechModeRef.current && transcript.trim()) {
                    setIsListening(false);
                    setPendingSpeechMessage(transcript.trim());
                }
            };

            recognitionRef.current.onerror = (event) => {
                setIsListening(false);
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    setError(`Speech recognition error: ${event.error}`);
                }

                // Retry listening if in speech mode
                if (speechModeRef.current && event.error === 'no-speech') {
                    setTimeout(() => {
                        if (speechModeRef.current && recognitionRef.current) {
                            try {
                                setIsListening(true);
                                recognitionRef.current.start();
                            } catch (e) {
                                // Silent retry failure
                            }
                        }
                    }, 500);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const fetchAccessToken = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/authorization/unauthenticated/access-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    esDeveloperName,
                    capabilitiesVersion: '1',
                    platform: 'Web',
                    context: { appName: 'RefArchSite', clientVersion: '1.0' },
                }),
            });
            if (!response.ok) throw new Error(`Error: ${response.statusText}`);
            const data = await response.json();
            setAccessToken(data.accessToken);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const createConversation = async () => {
        if (!accessToken) return null;
        try {
            const convId = uuidv4();
            const response = await fetch(`${apiBaseUrl}/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ conversationId: convId, esDeveloperName }),
            });
            if (response.status !== 201) throw new Error('Failed to create conversation');
            setConversationId(convId);
            return convId;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const scrollCarousel = (scrollOffset) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
        }
    };

    // Start listening for speech
    const startListening = () => {
        if (!recognitionRef.current || isListening) {
            return;
        }

        try {
            setIsListening(true);
            recognitionRef.current.start();
        } catch (error) {
            setIsListening(false);
        }
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Toggle speech mode on/off
    const toggleSpeechMode = () => {
        if (!recognitionRef.current) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        const newSpeechMode = !isSpeechMode;
        setIsSpeechMode(newSpeechMode);
        speechModeRef.current = newSpeechMode;

        if (newSpeechMode) {
            // Entering speech mode - speak greeting first to unlock TTS
            setInputText('');
            setPendingSpeechMessage(null);

            // Speak greeting message to unlock TTS (requires user interaction)
            if (synthRef.current) {
                const greeting = new SpeechSynthesisUtterance('Hi, I am your AI style Guide, how can I help you today?');
                const voices = synthRef.current.getVoices();
                if (voices.length > 0) {
                    const enVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                    greeting.voice = enVoice;
                }
                greeting.lang = 'en-US';
                greeting.rate = 1.0;
                greeting.pitch = 1.0;
                greeting.volume = 1.0;

                greeting.onstart = () => {
                    setIsSpeaking(true);
                };

                greeting.onend = () => {
                    setIsSpeaking(false);
                    // After greeting, start listening
                    setTimeout(() => startListening(), 500);
                };

                greeting.onerror = () => {
                    setIsSpeaking(false);
                    // Even if greeting fails, try to start listening
                    setTimeout(() => startListening(), 500);
                };

                synthRef.current.speak(greeting);
            } else {
                // Fallback if TTS not available
                startListening();
            }
        } else {
            // Exiting speech mode - stop everything
            stopListening();
            stopSpeaking();
            setPendingSpeechMessage(null);
        }
    };

    // Text-to-speech function
    const speakText = (text) => {
        if (!synthRef.current) {
            if (speechModeRef.current) {
                setTimeout(() => startListening(), 500);
            }
            return;
        }

        // Cancel any ongoing speech
        synthRef.current.cancel();

        // Extract plain text from HTML or formatted text
        let plainText = text;
        if (typeof text === 'string') {
            plainText = text.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim();
        }

        if (!plainText || plainText.length === 0) {
            if (speechModeRef.current) {
                setTimeout(() => startListening(), 500);
            }
            return;
        }

        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(plainText);

        // Try to use first available English voice
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) {
            const enVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
            utterance.voice = enVoice;
        }

        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            setIsSpeaking(false);
            if (speechModeRef.current) {
                setTimeout(() => startListening(), 800);
            }
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            if (speechModeRef.current) {
                setTimeout(() => startListening(), 500);
            }
        };

        try {
            synthRef.current.speak(utterance);
        } catch (error) {
            setIsSpeaking(false);
        }
    };

    // Stop speaking
    const stopSpeaking = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
    };


    // Helper to render Carousel and Text formats
    const renderMessageContent = (unescapedPayload, convId, token) => {
        const abstractMsg = unescapedPayload?.abstractMessage;

        // 1. Handle Salesforce Native Carousel (ChoicesMessage)
        if (abstractMsg?.messageType === 'ChoicesMessage' && abstractMsg.choices?.formatType === 'Carousel') {
            const items = abstractMsg.choices.items || [];
            const images = abstractMsg.choices.images || [];

            return (
                <div className='carousel-wrapper'>
                    {items.length > 2 && (
                        <button className='carousel-button left' onClick={() => scrollCarousel(-300)}>
                            <FaAngleLeft />
                        </button>
                    )}
                    <div className='product-carousel' ref={carouselRef}>
                        {items.map((item, idx) => {
                            const imgId = item.titleItem?.imageId;
                            const imageObj = images.find(img => img.id === imgId);
                            return (
                                <div key={idx} className='carousel-item'>
                                    {imageObj?.assetUrl && (
                                        <img src={imageObj.assetUrl} alt={item.titleItem?.title} className='product-image' />
                                    )}
                                    <div className="product-name"><strong>{item.titleItem?.title}</strong></div>
                                    <p className="product-price">{item.titleItem?.subTitle}</p>
                                    <p className="product-description">{item.titleItem?.secondarySubTitle}</p>
                                    {item.interactionItems?.map((btn, bIdx) => {
                                        const handleButtonClick = (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            // Step 1: Convert title to URL-friendly slug
                                            const productTitle = item.titleItem?.title || '';
                                            const titleSlug = productTitle.toLowerCase().replace(/\s+/g, '-');

                                            // Step 2: Get product ID from secondarySubTitle
                                            const productId = item.titleItem?.secondarySubTitle || '';

                                            // Step 3: Construct product URL
                                            const productUrl = `https://zzsu-060.dx.commercecloud.salesforce.com/s/RefArch/${titleSlug}/${productId}.html`;

                                            // Step 4: Open URL
                                            window.open(productUrl, '_blank', 'noopener,noreferrer');
                                        };
                                        return (
                                            <button
                                                key={bIdx}
                                                className="carousel-action-button"
                                                onClick={handleButtonClick}
                                                type="button"
                                            >
                                                Buy now
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    {items.length > 2 && (
                        <button className='carousel-button right' onClick={() => scrollCarousel(300)}>
                            <FaAngleRight />
                        </button>
                    )}
                </div>
            );
        }

        // 2. Handle Fallback for Text with manual JSON or Plain Text
        const textValue = abstractMsg?.staticContent?.text || "";
        const jsonStart = textValue.indexOf('{');
        const jsonEnd = textValue.lastIndexOf('}') + 1;

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            try {
                const jsonText = textValue.slice(jsonStart, jsonEnd);
                const jsonData = JSON.parse(jsonText);

                // If JSON contains standaloneText, render it with line breaks
                if (jsonData.standaloneText) {
                    const formattedMessage = jsonData.standaloneText
                        .replace(/\\n\\n/g, '<br/><br/>')
                        .replace(/\\n/g, '<br/>');
                    return <span dangerouslySetInnerHTML={{ __html: formattedMessage }}></span>;
                }

                // If JSON contains products, render as carousel
                if (jsonData.products && Array.isArray(jsonData.products)) {
                    const normalizedJson = jsonText.replace(/\\n/g, '').replace(/\\"/g, '"');
                    const normalizedData = JSON.parse(normalizedJson);
                    return (
                        <div className='carousel-wrapper'>
                            <div className='product-carousel'>
                                {normalizedData.products.map((p, i) => (
                                    <div key={i} className='carousel-item'>
                                        <img src={p.product_image} alt={p.product_name} className='product-image' />
                                        <div><strong>{p.product_name}</strong></div>
                                        <p>{p.product_price}</p>
                                        <p>{p.reason}</p>
                                        {(p.product_url || p.url || p.link) && (
                                            <button
                                                className="carousel-action-button"
                                                onClick={() => window.open(p.product_url || p.url || p.link, '_blank', 'noopener,noreferrer')}
                                            >
                                                View Product
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }

                // Fallback to plain text
                return <span>{textValue}</span>;
            } catch (e) {
                return <span>{textValue}</span>;
            }
        }

        return <span dangerouslySetInnerHTML={{ __html: textValue.replace(/\n/g, '<br/>') }}></span>;
    };

    const startSSE = async () => {
        if (!accessToken) return;
        try {
            const convId = await createConversation();
            if (!convId) return;
            const response = await fetch(sseEndpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'text/event-stream',
                    'X-Org-Id': orgId,
                },
            });
            const reader = response.body.getReader();
            setSSEReader(reader);
            const decoder = new TextDecoder();
            let partialData = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                partialData += decoder.decode(value, { stream: true });
                const lines = partialData.split('\n');
                partialData = lines.pop();

                lines.forEach((line) => {
                    if (line.startsWith('data:')) {
                        try {
                            const eventData = JSON.parse(line.replace('data:', '').trim());
                            const entry = eventData.conversationEntry;
                            const entryType = entry?.entryType;

                            if (entryType === 'Message') {
                                const serverMsgId = entry.identifier;
                                const role = entry.sender?.role === 'EndUser' ? 'EndUser' : 'ChatBot';

                                // Deduplication check
                                setMessages((prev) => {
                                    if (prev.some(m => m.id === serverMsgId)) return prev;

                                    const unescapedPayload = JSON.parse(entry.entryPayload);

                                    // Extract text for speech synthesis (bot messages only, and only in speech mode)
                                    if (role === 'ChatBot' && speechModeRef.current) {
                                        const abstractMsg = unescapedPayload?.abstractMessage;
                                        const textValue = abstractMsg?.staticContent?.text || "";

                                        let textToSpeak = "";

                                        // Try to parse as JSON if it starts with {
                                        if (textValue.trim().startsWith('{')) {
                                            try {
                                                const jsonData = JSON.parse(textValue);
                                                // Extract text from standaloneText field
                                                textToSpeak = jsonData.standaloneText || jsonData.text || "";
                                            } catch (e) {
                                                // Fallback: try to extract text before JSON
                                                const jsonStart = textValue.indexOf('{');
                                                textToSpeak = jsonStart > 0 ? textValue.slice(0, jsonStart).trim() : "";
                                            }
                                        } else {
                                            // Plain text or text before JSON
                                            const jsonStart = textValue.indexOf('{');
                                            textToSpeak = jsonStart !== -1 ? textValue.slice(0, jsonStart).trim() : textValue.trim();
                                        }

                                        if (textToSpeak && textToSpeak.length > 0) {
                                            speakText(textToSpeak);
                                        }
                                    }

                                    return [
                                        ...prev,
                                        {
                                            id: serverMsgId,
                                            role,
                                            text: renderMessageContent(unescapedPayload, convId, accessToken),
                                        },
                                    ];
                                });
                                setIsTyping(false);
                            } else if (entryType === 'TypingStartedIndicator') {
                                setIsTyping(true);
                            } else if (entryType === 'TypingStoppedIndicator') {
                                setIsTyping(false);
                            }
                        } catch (e) {
                            // SSE parse error - ignore
                        }
                    }
                });
            }
        } catch (err) { setError(err.message); }
    };

    const sendMessage = async () => {
        if (!conversationId || !inputText.trim()) return;
        try {
            const tempId = uuidv4();
            const userText = inputText;
            setInputText('');
            
            // 1. Optimistic Update (shows immediately)
            setMessages(prev => [...prev, { 
                id: tempId, 
                role: 'EndUser', 
                text: <span>{userText}</span> 
            }]);

            // 2. Send to API using the SAME ID to allow deduplication in SSE
            await fetch(`${apiBaseUrl}/conversation/${conversationId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    message: {
                        id: tempId,
                        messageType: 'StaticContentMessage',
                        staticContent: { formatType: 'Text', text: userText },
                    },
                    esDeveloperName: esDeveloperName,
                }),
            });
        } catch (err) { setError(err.message); }
    };

    const endSession = async () => {
        if (!conversationId) return;
        try {
            await fetch(`${apiBaseUrl}/conversation/${conversationId}/session?esDeveloperName=${esDeveloperName}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (sseReader) sseReader.cancel();
            setConversationId(null);
            setSessionEnded(true);
        } catch (err) { setError(err.message); }
    };

    return (
        <div className='chat-container'>
            <h1 className='chat-title'>Your AI Style Guide!</h1>

            {/* Listening Badge */}
            {isSpeechMode && isListening && (
                <div className='speech-status-badge listening'>
                    <div className='status-icon pulsing'>
                        <FaMicrophone />
                    </div>
                    <div className='status-text'>Listening...</div>
                </div>
            )}

            {/* Speaking Badge */}
            {isSpeechMode && isSpeaking && (
                <div className='speech-status-badge speaking'>
                    <div className='sound-waves status-icon'>
                        <div className='wave-bar'></div>
                        <div className='wave-bar'></div>
                        <div className='wave-bar'></div>
                        <div className='wave-bar'></div>
                        <div className='wave-bar'></div>
                    </div>
                    <div className='status-text'>Speaking...</div>
                </div>
            )}

            {/* Processing Badge */}
            {isSpeechMode && !isListening && !isSpeaking && (
                <div className='speech-status-badge processing'>
                    <div className='status-icon'>
                        <div className='spinner-small'></div>
                    </div>
                    <div className='status-text'>Processing...</div>
                </div>
            )}

            <div className='chat-window'>
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-bubble ${msg.role === 'EndUser' ? 'user' : 'assistant'}`}>
                        <div className='bubble-text'>{msg.text}</div>
                    </div>
                ))}
                {isTyping && (
                    <div className='typing-section'>
                        <span className='typing-message'>Agent is thinking...</span>
                        <div className='wave'>
                            <span className='dot'></span>
                            <span className='dot'></span>
                            <span className='dot'></span>
                        </div>
                    </div>
                )}
                {sessionEnded && <div className='session-ended-message'>The session has ended.</div>}
            </div>
            <div className='chat-input-area'>
                <div className='chat-input'>
                    <input
                        type='text'
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={isSpeechMode ? 'Voice mode active' : 'Start typing or enable voice mode...'}
                        disabled={sessionEnded || isSpeechMode}
                    />
                    <button
                        onClick={toggleSpeechMode}
                        className={`mic-button ${isSpeechMode ? 'speech-mode-active' : ''}`}
                        disabled={sessionEnded}
                        title={isSpeechMode ? 'Exit voice mode' : 'Start voice mode'}
                    >
                        {isSpeechMode ? <FaStop /> : <FaMicrophone />}
                    </button>
                    <button onClick={sendMessage} className='send-button' disabled={sessionEnded || isSpeechMode}><FaPaperPlane /></button>
                    <button onClick={endSession} className='end-button' disabled={sessionEnded}><FaSignOutAlt /></button>
                </div>
            </div>
            {error && <div className="error-toast">{error}</div>}
        </div>
    );
};

export default MiawChat;