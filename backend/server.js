require('dotenv').config();
const app = require('./src/app');
const autoMigrate = require('./src/config/autoMigrate');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await autoMigrate();
});
