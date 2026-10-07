require('dotenv').config();
const db = require('./src/config/db');
const menuItemController = require('./src/controllers/menuItemController');

(async () => {
    try {
        const req = {
            params: { id: 10 },
            body: {
                name: 'Rau má Latte Update',
                category: 'Rau Má',
                image_url: '...',
                size: 'M',
                price: 25000,
                ingredients: [
                    { ingredient_type: 'material', ingredient_id: 4, quantity: 150 }
                ]
            }
        };
        const res = {
            json: (data) => console.log('JSON:', data),
            status: (code) => ({
                json: (data) => console.log('Status:', code, 'JSON:', data)
            })
        };
        await menuItemController.update(req, res);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
