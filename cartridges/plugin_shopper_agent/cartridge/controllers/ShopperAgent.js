'use strict';

const server = require('server');


/**
 * Note: This includes customer specific data and should NOT be cached.
 */
server.get('IncludeHiddenPrechatFields', server.middleware.include, function (req, res) {
    const HashMap = require('dw/util/HashMap');
    const Locale = require('dw/util/Locale');
    const Site = require('dw/system/Site');
    const Template = require('dw/util/Template');
    const afterFooter = require('~/cartridge/scripts/hooks/afterFooter');

    var currentSite = Site.getCurrent();
    var config = afterFooter.getShopperAgentConfig(currentSite);
    var locale = Locale.getLocale(req.locale.id);
    var localeCode = (locale.getLanguage() || 'en') + '-' + (locale.getCountry() || 'US');

    var usIdCookieName = 'usid_' + currentSite.ID;
    var usidCookie = afterFooter.getCookie(usIdCookieName);
    var usidCookieValue = usidCookie ? usidCookie.value : null;

    var refreshTokenCookieName = 'cc-nx-g_' + currentSite.ID;
    var refreshTokenCookie = afterFooter.getCookie(refreshTokenCookieName);
    var refreshTokenValue = refreshTokenCookie ? refreshTokenCookie.value : null;

    // Get currency from session with fallback to site default
    var currentCurrency = null;
    if (req.session && req.session.currency && req.session.currency.currencyCode) {
        currentCurrency = req.session.currency.currencyCode;
    } else {
        currentCurrency = currentSite.getDefaultCurrency().getCurrencyCode();
    }

    // Get domain URL
    var currentDomainUrl = '';
    currentDomainUrl = afterFooter.getCurrentDomainUrl();

    const sanitizedConfig = afterFooter.validateConfig({
        siteId: currentSite.ID,
        locale: localeCode,
        sfLanguage: afterFooter.mapLocaleToSalesforce(localeCode),
        usId: usidCookieValue,
        refreshToken: refreshTokenValue,
        commerceOrgId: config.commerceOrgId,
        isCartMgmtSupported: false,
        currency: currentCurrency,
        enabledConversationContext: config.enabledConversationContext,
        conversationContext: config.conversationContext,
        domainUrl: currentDomainUrl,
        enabledFabEntry: config.enabledFabEntry
    });

    var context = new HashMap();
    context.put('shopperAgent', sanitizedConfig);

    var template = new Template('includes/shopperAgentConfigJSON');
    res.base.writer.print(template.render(context).text);
});

module.exports = server.exports();
