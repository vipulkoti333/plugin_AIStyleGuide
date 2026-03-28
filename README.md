# AI Style Guide - Conversational Commerce Assistant using RAG (ONLY for POC, not for Production use)

This is a Salesforce B2C Commerce cartridge (`plugin_custom_AIstyleguide`) that provides an AI-powered conversational assistant for e-commerce product discovery and customer engagement. It leverages Salesforce Agentforce, Data 360, enhanced Chat API and modern web technologies to create an interactive shopping experience with text and voice capabilities.

## Key Features

- **AI-Powered Chat Interface** - Conversational product recommendations using Agentforce
- **Voice Mode** - Speech-to-text and text-to-speech capabilities for hands-free shopping
- **Product Carousels** - Visual product displays with images, pricing, and buy now actions
- **Real-time Communication** - Server-sent events (SSE) for instant responses
- **Product Integration** - Use Data 360 powered semanatic search

## Technology Stack

- **Frontend**: React 19, Framer Motion, React Icons
- **Backend**: Salesforce B2C Commerce (SFRA)
- **AI Platform**: Salesforce Agentforce
- **Chat Infrastructure**: Echnaced Chat (formerly Messaging for In-App & Web (MIAW))
- **Data Source**: Salesforce Data Cloud
- **Build Tools**: Webpack 5, Babel, ESLint

**Disclaimer:**
This package is intended to demonstrate and illustrate the Salesforce Agentforce capabilities applied to e-commerce use cases on Salesforce B2C Commerce. It is not intended to be used in a production environment as is.

## Architecture Overview

<img width="8192" height="7266" alt="Salesforce Agentforce-2026-03-28-003757" src="https://github.com/user-attachments/assets/c8ab01e0-cf63-4e23-99f4-9c641673341f" />


### Cartridge Structure

```
plugin_custom_AIstyleguide/
├── cartridge/
│   ├── client/default/react/
│   │   ├── MiawChat.jsx          # Main React chat component
│   │   ├── MiawChat.css          # Chat interface styles
│   │   └── react-entry.js        # React entry point
│   ├── controllers/
│   │   ├── AIStyleGuide.js       # Main chat controller
│   ├── templates/default/aistyleguide/
│   │   └── chat.isml             # Chat page template
│   └── static/default/js/
│       └── react-bundle.js       # Compiled React bundle
└── webpack.react.asg.config.js   # Webpack build configuration
```

### 1. Data Layer (Salesforce Data Cloud)

- Product catalog stored in Data Cloud with vector embeddings
- Custom Data Model Object (DMO) based on Master Product DMO
- Fields include: Product Description, Product Image Url, Product Name, Product Price, Product Url
- Search Index configured on Product Info field for semantic search

### 2. AI Agent (Salesforce Agentforce)

- Agent Topic defines conversation behavior and product recommendation logic
- Agent Actions perform vector search queries against Data Cloud
- Returns structured JSON with product recommendations
- Handles natural language queries and follow-up questions

### 3. Chat Infrastructure (Enhanced chat)

- Embedded Service Deployment configured as APi based Nehanced Chat
- Real-time bidirectional communication via SSE (Server-Sent Events)
- Supports text messages, product carousels, and rich media, We use Message type "ChoicesMessage"
- Note- We can develop our own UI for Tiles directly in SFRA with the productId's from teh response.

### 4. B2C Commerce Integration

**Controllers:**
- `AIStyleGuide-Start` - Renders the chat interface

**React Component** (`MiawChat.jsx`):
- Manages Enhanced Chat API authentication and conversation lifecycle
- Implements voice mode with Web Speech API
- Renders product carousels and chat messages
- Handles SSE message parsing and deduplication

**Features:**
- Text-based chat with typing indicators
- Voice mode with speech-to-text and text-to-speech
- Product carousel rendering from both native Enhanced chat Choice Message format and custom JSON
- Direct product page navigation with "Buy now" actions

### 5. Access the Chat Interface

Navigate to: `https://your-instance.dx.commercecloud.salesforce.com/on/demandware.store/Sites-YourSite-Site/default/AIStyleGuide-Start`

## Deployment

### 1. Data Cloud 

- Go to Data Model tab > New > From Existing
- Select Master Product > Next
- Update Object Label to your own name (eg. Master Product RefArch)
- Update Object API Name to your own API name (eg. Master_Product_RefArch)
- Add fields:
  - Product Image Url / Product_Image_Url__c / Text
  - Product Long Description / Product_Long_Description__c / Text
  - Product Price / Product_Price__c / Text
  - Product Url / Product_Url__c / Text
- Creat a New Data stream with File upload
- Map the CSV columns to the new custom DMO fields.
- Create a Search Index on the Product Long Description fields
- Test the SQL query works in the Data Cloud Query Editor (replace with your own table names):

```
SELECT v.score__c AS Score, d.id__c AS "Product ID", d.price__c AS "Product Price", d.url__c AS "Product URL", Chunk__c AS "Chunk", d.imageurl__c AS "Image URL"
FROM vector_search(TABLE(Master_Product_RefArch_index__dlm), 'floral dress', '', 20) v
JOIN Master_Product_RefArch_chunk__dlm c ON v.RecordId__c = c.RecordId__c
JOIN refarch_productscsv__dll d ON c.SourceRecordId__c = d.id__c
ORDER BY v.score__c DESC
```

### 2. Apex

- Open Developer Console
- File > New > Apex Class
- Paste the code contained in `./assets/apex/RefArchProductVectorSearchService.apxc`
- Double check the SQL query
- Test the class:
  - Debug > Open Execute Anonymous Window
  - Paste the code from assets/apex/apex_test_execute.txt
- Click Execute
- Check the logs and make sure you see the product output.

### 3. Agent Configuration

- Setup > Agentforce Agents > New Agent
- Enter your own Label Name (e.g. RefArch Product Finder), API Name, Description
- Agent User
  - Custom Agent User
  - Select an admin user
- Create
- New Topic > Copy the configuration in `./assets/agent/agent-topic.txt`
- Add Topic Action > Apex > Select the class created above (eg. RefArchProductVectorSearchService)

### 4. Enhanced Chat Configuration

- Setup > Routing Configurations > New
  - Name: RefArchEC
  - Dev name: RefArchEC
  - Routing Priority: 0
  - Routing Model: Most Available
  - Capacity Type: Inherited
  - Units of Capacity: 100.00
- Setup > Queues > New:
  - Label: Commerce Queue
  - Queue name: Commerce_Queue
  - Routing Configuration: RefArchEC
  - Supported Objects: Messaging Session
- Setup > Flows > New Flow
  - Start from Scratch > Omni-Channel Flow
  - New Resource
    - Resource Type: Variable
    - API Name: recordId
    - Data Type: Text
    - Available for input: checked
  - Add Element > Route Work:
    - "Route to Refarch Product Finder Apex"
    - Single
    - {!recordId}
    - Service Channel: Messaging
    - Route to: Agentforce Service Agent
    - Agentforce Service Agent: RefArch Product Finder
    - Fallback Queue:
      - Select Queue
      - Commerce Queue
  - Save
    - Label: "Route to RefArch Product Finder"
  - Activate
- Setup > Messaging Settings
  - Turn ON
  - New Channel > Select "Enhanced Chat"
  - Channel Name: Enhanced Chat for Refarch
  - Developer Name: Enhanced_Chat_for_Refarch
  - Omni-Channel Routing:
    - Routing Type: Omni-Flow
    - Flow Definition: Route to Refarch Product Finder Apex
    - Fallback Queue: Commerce Queue
  - Save
  - Messaging Settings > click "Enhanced Chat for Refarch"
    - Embedded Service Deployments
      - New Deployment
      - Enhanced Chat
      - Custom Client
      - Embedded Service Deployment Name: Enhanced chat Service for RefArch
      - API Name: Enhanced_chat_Service_for_RefArch
      - Messaging Channel: Enhanced Chat for Refarch
      - Save
      - Publish
    - Activate

- Setup > CORS
  - New
  - Origin URL pattern: https://\*.dx.commercecloud.salesforce.com
- Setup > Permission Sets
  - Edit permisison set for your Agent user (You will find agent user in Agentforce Agent)
  - Data Cloud Data Space Management, add default dataspace or the dataspace you used for Data Model
  - Apex Class Access, give access to the Apex class
 

### 5. B2C Commerce Cartridge Setup

#### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd plugin_AIStyleGuide


# Install dependencies
npm install
```

#### Environment Configuration

Create a `.env` file in the root directory with your Salesforce credentials: (Setup > Embedded Services > Code Snippet)

```env
REACT_APP_API_BASE_URL=https://<your-org-name>.my.salesforce-scrt.com/iamessage/api/v2
REACT_APP_SSE_URL=https://<your-org-name>.my.salesforce-scrt.com/eventrouter/v1/sse
REACT_APP_ORG_ID=<your-org-id>
REACT_APP_SVC_DEPLOYMENT=<your-embedded-service-deployment-api-name>
```

**How to find these values:**
- `REACT_APP_API_BASE_URL` - Found in your Salesforce org's Embedded Services > Code Snippet
- `REACT_APP_SSE_URL` - SSE endpoint for real-time messaging
- `REACT_APP_ORG_ID` - Your Salesforce org ID, Embedded Services > Code Snippet
- `REACT_APP_SVC_DEPLOYMENT` - API name of your Embedded Service Deployment (Enhanced_chat_Service_for_RefArch)

#### Build Process

Build the React bundle:

```bash
npm run build-react-asg
```

This command:
- Compiles React components with Babel
- Bundles JavaScript and CSS with Webpack
- Outputs to `cartridges/plugin_custom_AIstyleguide/cartridge/static/default/js/react-bundle.js`

#### Upload to B2C Commerce

```bash
# Upload the entire cartridge
npm run uploadCartridge
```

Or upload manually via Business Manager or your preferred deployment tool.

#### Cartridge Path Configuration

1. Log into Business Manager
2. Navigate to **Administration → Sites → Manage Sites → [Your Site] → Settings**
3. Add `plugin_custom_AIstyleguide` to the cartridge path
4. Position it before `app_storefront_base`

Example cartridge path:
```
plugin_custom_AIstyleguide:app_storefront_base
```

**Tested with SFRA version 7.0.1+**

### 6. Use the AI Style Guide

Access the chat interface:
```
https://your-instance.dx.commercecloud.salesforce.com/s/RefArch/AIStyleGuide-Start
```

Or create a content asset/link to the controller endpoint `AIStyleGuide-Start`.

## Development Guide

### Available NPM Scripts

```bash
# Build React components
npm run build-react-asg

# Lint JavaScript and CSS
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Upload specific cartridge
npm run uploadCartridge

# Compile JavaScript only
npm run compile:js

# Compile SCSS only
npm run compile:scss
```

### API Endpoints

#### AIStyleGuide-Start
- **Method**: GET
- **URL**: `/AIStyleGuide-Start`
- **Description**: Renders the main chat interface
- **Returns**: ISML template with React component container

### Customization

#### Styling

Modify [cartridges/plugin_custom_AIstyleguide/cartridge/client/default/react/MiawChat.css](cartridges/plugin_custom_AIstyleguide/cartridge/client/default/react/MiawChat.css) to customize:
- Chat bubble colors and styles
- Product carousel layout
- Button styles
- Voice mode indicators
- Responsive breakpoints

#### Chat Behavior

Edit [cartridges/plugin_custom_AIstyleguide/cartridge/client/default/react/MiawChat.jsx](cartridges/plugin_custom_AIstyleguide/cartridge/client/default/react/MiawChat.jsx) to modify:
- Message rendering logic
- Voice mode settings (language, rate, pitch)
- Product carousel interactions
- Error handling

#### Product Display

Customize product tile rendering in the `renderMessageContent` function:
- Adjust product image sizing
- Modify price formatting
- Change button labels and actions
- Add additional product attributes

### Voice Mode Configuration

The voice mode uses Web Speech API and supports:

**Speech Recognition Settings:**
- Language: `en-US` (configurable in MiawChat.jsx line 103)
- Continuous: `false`
- Interim Results: `true`

**Speech Synthesis Settings:**
- Language: `en-US`
- Rate: `1.0` (speech speed)
- Pitch: `1.0`
- Volume: `1.0`

To change the voice or language, modify the `speakText` function in MiawChat.jsx.

## Troubleshooting

### Build Errors

**Error: "Module not found: react-entry.js"**
- Solution: Verify the entry path in `webpack.react.asg.config.js` matches your directory structure

**Error: "Cannot find module 'dotenv'"**
- Solution: Run `npm install` to install all dependencies

### Runtime Errors

**Chat not loading**
- Verify `.env` file exists and contains correct credentials
- Check that `react-bundle.js` was generated in `static/default/js/`
- Ensure cartridge is in the site's cartridge path

**Voice mode not working**
- Voice features require HTTPS
- Verify browser supports Web Speech API (Chrome, Edge, Safari)
- Check microphone permissions in browser settings

**Products not displaying**
- Verify Agentforce agent is returning correct JSON format
- Check Data Cloud connection and vector search configuration
- Review browser console for SSE parsing errors

### CORS Issues

If you encounter CORS errors with MIAW API:
1. Add your B2C Commerce domain to CORS whitelist in Salesforce Setup
2. Pattern: `https://*.dx.commercecloud.salesforce.com`
3. Verify SSE endpoint is accessible from your domain

## Performance Optimization

### Bundle Size

Current bundle includes:
- React 19 + React DOM
- Framer Motion (animations)
- React Icons
- React Markdown + remark-gfm
- UUID

To reduce bundle size:
- Remove unused dependencies
- Implement code splitting
- Use production build with minification

### Caching

Static resources are cacheable. Ensure proper cache control headers:
- `react-bundle.js` - Cache with version parameter
- Product images - CDN caching recommended

## Security Considerations

- **API Tokens**: Access tokens are obtained via MIAW API, never hardcode
- **CORS**: Restrict to your domains only
- **Input Validation**: Product IDs are validated in ProductTiles controller
- **HTTPS**: Required for voice mode and secure communication
- **Environment Variables**: Never commit `.env` file to version control

## Browser Support

- **Chrome/Edge**: Full support including voice mode
- **Safari**: Full support including voice mode
- **Firefox**: Chat works, voice mode may have limitations
- **Mobile Safari**: Full support on iOS 14+
- **Mobile Chrome**: Full support on Android 8+

## Additional Resources & Refrences

- [Salesforce Agentforce Documentation](https://www.salesforce.com/agentforce/)
- [Enhanced chat API Reference](https://developer.salesforce.com/docs/service/messaging-api/references/miaw-api-reference?meta=Summary)
- [Agentforce Commerce](https://www.salesforce.com/commerce/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Enhance Chat API Implementation](https://github.com/aperelgritz/custom-sfra-miaw)
