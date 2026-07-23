"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const auth_service_1 = require("./modules/auth/auth.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const authService = app.get(auth_service_1.AuthService);
    try {
        console.log('Testing JWT Access Token Issue...');
        const token = authService.issueAccessToken('2db4af6f-282c-47f6-86a3-9d4f77b0a12e', 'superuser@gogisise.com');
        console.log('Access Token:', token);
        console.log('Testing JWT Refresh Token Issue...');
        const rToken = await authService.issueAndSaveRefreshToken('2db4af6f-282c-47f6-86a3-9d4f77b0a12e');
        console.log('Refresh Token:', rToken);
    }
    catch (error) {
        console.error('Captured Error:', error);
    }
    finally {
        await app.close();
    }
}
main();
//# sourceMappingURL=scratch_login_test.js.map