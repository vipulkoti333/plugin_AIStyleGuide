

const server = require('server');

var Logger = require('dw/system/Logger').getLogger('int_conv_comm', 'Concierge-Cart');

/**
 * Adds products to current basket
 */
server.get('Cart', server.middleware.https, (req, res, next) => {
    const BasketMgr = require('dw/order/BasketMgr');
    const Transaction = require('dw/system/Transaction');
    const cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    const URLUtils = require('dw/web/URLUtils');
    const ProductFactory = require('*/cartridge/scripts/factories/product');

    const basketData = req.querystring.basket || null;
    const couponData = req.querystring.coupon || null;
    const productsToAdd = basketData ? basketData.split(',') : [];
    const currentBasket = BasketMgr.getCurrentOrNewBasket();

    if (productsToAdd.length > 0) {
        if (currentBasket) {
            const productLineItems = currentBasket.productLineItems;
            Transaction.wrap(() => {
                productsToAdd.forEach((productToAdd) => {
                    let product = ProductFactory.get({ pid: productToAdd });
                    if (Object.keys(product).length === 0) {
                        Logger.error('Product not found: ' + productToAdd);
                        return;
                    }
                    const options = product.options && product.options.length > 0 ? product.options[0] : {};
                    const qtyInCart = cartHelper.getQtyAlreadyInCart(product.id, productLineItems);

                    if (qtyInCart === 0 && !['master', 'variationGroup', 'set'].includes(product.productType)) {
                        let addResult = cartHelper.addProductToCart(currentBasket, product.id, 1, [], options);
                        if (addResult.error) {
                            Logger.error(
                                'Error occurred while adding to cart. {0}: {1}',
                                addResult.error,
                                addResult.message
                            );
                        }
                    }
                });
            });
        }
    }
    if (couponData !== null) {
        if (currentBasket) {
        try {
            Transaction.wrap(function () {
                return currentBasket.createCouponLineItem(couponData, true);
            });
        } catch (e) {
            error = true;
            var errorCodes = {
                COUPON_CODE_ALREADY_IN_BASKET: 'error.coupon.already.in.cart',
                COUPON_ALREADY_IN_BASKET: 'error.coupon.cannot.be.combined',
                COUPON_CODE_ALREADY_REDEEMED: 'error.coupon.already.redeemed',
                COUPON_CODE_UNKNOWN: 'error.unable.to.add.coupon',
                COUPON_DISABLED: 'error.unable.to.add.coupon',
                REDEMPTION_LIMIT_EXCEEDED: 'error.unable.to.add.coupon',
                TIMEFRAME_REDEMPTION_LIMIT_EXCEEDED: 'error.unable.to.add.coupon',
                NO_ACTIVE_PROMOTION: 'error.unable.to.add.coupon',
                default: 'error.unable.to.add.coupon'
            };

            var errorMessageKey = errorCodes[e.errorCode] || errorCodes.default;
            errorMessage = errorMessageKey
        }
    } 
}
    res.redirect(URLUtils.url('Cart-Show'));
    next();
});

module.exports = server.exports();
